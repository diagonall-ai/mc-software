import {
	createDpopReplayStore,
	enforceDpopBinding,
	isDpopBindingError,
	parseAccessTokenAuthorization,
	verifyJwsAccessToken,
} from "better-auth/oauth2";
import { authServer, MCP_ISSUER, MCP_RESOURCE } from "~/lib/auth-server";
import type { McpSession } from "~/lib/rest-auth";

// Signing keys are read in-process from the JWT plugin and cached under this
// key. Fetching them from the public /api/auth/jwks URL would make the Worker
// call itself, which Cloudflare refuses on workers.dev.
const jwksCacheKey = {};

/**
 * Verifies an MCP OAuth access token: signature, issuer, audience (the MCP
 * resource), expiry, and the DPoP proof when the token is sender-bound.
 * Returns null for a missing, invalid, or expired token, so callers answer 401
 * and MCP clients sign in again.
 */
export async function getMcpSession(
	request: Request,
): Promise<McpSession | null> {
	const authorization = parseAccessTokenAuthorization(
		request.headers.get("authorization"),
	);
	if (!authorization?.token || authorization.scheme === "Unknown") {
		return null;
	}

	let claims: Awaited<ReturnType<typeof verifyJwsAccessToken>>;
	try {
		claims = await verifyJwsAccessToken(authorization.token, {
			jwksFetch: () => authServer.api.getJwks(),
			jwksCacheKey,
			verifyOptions: { issuer: MCP_ISSUER, audience: MCP_RESOURCE },
		});
	} catch {
		return null;
	}

	try {
		const { internalAdapter } = await authServer.$context;
		await enforceDpopBinding({
			payload: claims,
			authorization,
			proofJwt: request.headers.get("dpop"),
			method: request.method,
			url: request.url,
			replayStore: createDpopReplayStore(internalAdapter),
		});
	} catch (error) {
		if (isDpopBindingError(error)) {
			return null;
		}
		throw error;
	}

	if (typeof claims.sub !== "string") {
		return null;
	}
	return {
		userId: claims.sub,
		clientId: String(claims.azp ?? claims.client_id ?? ""),
		scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
		accessToken: authorization.token,
		expiresAt: claims.exp,
	};
}

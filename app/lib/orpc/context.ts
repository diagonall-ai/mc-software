import {
	type ApiAuthResult,
	extractApiKey,
	extractBearerApiKey,
	resolveAuthSession,
} from "~/lib/api-auth";
import { auth } from "~/lib/auth";
import type { McpSession } from "~/lib/rest-auth";

export type ApiAuthState =
	| {
			kind: "api-key" | "browser-session";
			user: ApiAuthResult["user"];
			session: ApiAuthResult["session"];
	  }
	| {
			kind: "mcp-session";
			user: null;
			session: McpSession;
	  };

export type ApiContext = {
	request: Request;
	auth: ApiAuthState | null;
};

async function resolveApiAuth(request: Request): Promise<ApiAuthState | null> {
	const bearerApiKey = extractBearerApiKey(request);
	const headerApiKey = extractApiKey(request);
	const apiKey = bearerApiKey ?? headerApiKey;

	if (apiKey) {
		const result = await resolveAuthSession({
			"x-api-key": apiKey,
		});
		if (result) {
			return {
				kind: "api-key",
				user: result.user,
				session: result.session,
			};
		}
	}

	const browserSession = await resolveAuthSession(request.headers);
	if (browserSession) {
		return {
			kind: "browser-session",
			user: browserSession.user,
			session: browserSession.session,
		};
	}

	const mcpSession = await auth.api.getMcpSession({
		headers: request.headers,
	});

	if (!mcpSession) {
		return null;
	}

	return {
		kind: "mcp-session",
		user: null,
		session: mcpSession,
	};
}

/**
 * Builds the per-request context consumed by oRPC procedures and server-side clients.
 */
export async function createApiContext(request: Request): Promise<ApiContext> {
	return {
		request,
		auth: await resolveApiAuth(request),
	};
}

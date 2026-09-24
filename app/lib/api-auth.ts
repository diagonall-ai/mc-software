import { handler as authHandler } from "~/lib/auth-server";

export interface ApiAuthUser {
	id: string;
	email: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ApiAuthSession {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface ApiAuthResult {
	user: ApiAuthUser;
	session: ApiAuthSession;
}

function createAuthRequest(headers: HeadersInit): Request {
	return new Request("http://local/api/auth/get-session", {
		method: "GET",
		headers: new Headers(headers),
	});
}

/**
 * Resolves the current Better Auth browser session or API-key-backed session.
 * Invalid credentials return null. Transport or auth service failures surface.
 */
export async function resolveAuthSession(
	headers: HeadersInit,
): Promise<ApiAuthResult | null> {
	const response = await authHandler(createAuthRequest(headers));

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error(
			`Better Auth session lookup failed with status ${response.status}`,
		);
	}

	const data = (await response.json()) as
		| ApiAuthResult
		| {
				user?: ApiAuthUser | null;
				session?: ApiAuthSession | null;
		  }
		| null;

	if (!data?.user || !data.session) {
		return null;
	}

	return {
		user: data.user,
		session: data.session,
	};
}

/**
 * Validates an API key via Better Auth's session endpoint.
 */
export async function validateApiKey(
	apiKey: string,
): Promise<ApiAuthResult | null> {
	return resolveAuthSession({
		"x-api-key": apiKey,
	});
}

/**
 * Extracts an API key from a request's x-api-key header.
 * Returns null if the header is missing or empty.
 */
export function extractApiKey(request: Request): string | null {
	return request.headers.get("x-api-key") || null;
}

/**
 * Extracts an API key from Authorization: Bearer <key>.
 * Returns null when the header is missing, malformed, or empty.
 */
export function extractBearerApiKey(request: Request): string | null {
	const authHeader = request.headers.get("authorization");
	if (!authHeader) {
		return null;
	}

	const [scheme, token] = authHeader.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}

	return token;
}

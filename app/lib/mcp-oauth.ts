const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Accept",
} as const;

function jsonResponse(body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		},
	});
}

export function handleOAuthAuthorizationServer(origin: string): Response {
	const issuer = `${origin}/api/auth`;
	return jsonResponse({
		issuer,
		authorization_endpoint: `${issuer}/mcp/authorize`,
		token_endpoint: `${issuer}/mcp/token`,
		userinfo_endpoint: `${issuer}/mcp/userinfo`,
		jwks_uri: `${issuer}/mcp/jwks`,
		registration_endpoint: `${issuer}/mcp/register`,
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		response_types_supported: ["code"],
		response_modes_supported: ["query"],
		grant_types_supported: ["authorization_code", "refresh_token"],
		acr_values_supported: [
			"urn:mace:incommon:iap:silver",
			"urn:mace:incommon:iap:bronze",
		],
		subject_types_supported: ["public"],
		id_token_signing_alg_values_supported: ["RS256", "none"],
		token_endpoint_auth_methods_supported: [
			"client_secret_basic",
			"client_secret_post",
			"none",
		],
		code_challenge_methods_supported: ["S256"],
		claims_supported: [
			"sub",
			"iss",
			"aud",
			"exp",
			"nbf",
			"iat",
			"jti",
			"email",
			"email_verified",
			"name",
		],
	});
}

export function handleOAuthProtectedResource(origin: string): Response {
	return jsonResponse({
		resource: `${origin}/api/mcp`,
		authorization_servers: [`${origin}/api/auth`],
		bearer_methods_supported: ["header"],
	});
}

export function handleOAuthOptions(): Response {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

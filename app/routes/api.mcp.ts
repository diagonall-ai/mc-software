import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ApiAuthResult,
	extractApiKey,
	extractBearerApiKey,
	resolveAuthSession,
} from "~/lib/api-auth";
import { getMcpSession } from "~/lib/auth";
import { createAuthInfo, MCP_SERVER_INFO, registerMcpTools } from "~/lib/mcp";
import type { McpSession } from "~/lib/rest-auth";

// Browser-based MCP clients (such as the MCP Inspector) call from another
// origin. "*" does not cover Authorization, so it is listed too.
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "*, Authorization",
	"Access-Control-Expose-Headers": "*",
} as const;

// The scopes offered in the 401 challenge. MCP clients request them, and
// offline_access gets them a refresh token, so users stay signed in.
const CHALLENGE_SCOPES = "openid profile email offline_access";

// Serves the MCP 2026-07-28 protocol, and 2025-era clients statelessly.
const mcpHandler = createMcpHandler(() => {
	const server = new McpServer(MCP_SERVER_INFO);
	registerMcpTools(server);
	return server;
});

function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function createUnauthorizedResponse(request: Request): Response {
	const headers = new Headers(CORS_HEADERS);
	headers.set("Content-Type", "application/json");
	headers.set(
		"WWW-Authenticate",
		`Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource/api/mcp", scope="${CHALLENGE_SCOPES}"`,
	);

	return new Response(
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code: -32000, message: "Unauthorized" },
			id: null,
		}),
		{ status: 401, headers },
	);
}

function createApiKeyBackedMcpSession(
	apiKey: string,
	session: ApiAuthResult,
): McpSession {
	return {
		userId: session.user.id,
		clientId: "api-key",
		scopes: [],
		accessToken: apiKey,
		expiresAt: Math.floor(new Date(session.session.expiresAt).getTime() / 1000),
	};
}

async function resolveApiKeyBackedMcpSession(
	request: Request,
): Promise<McpSession | null> {
	const apiKey = extractBearerApiKey(request) ?? extractApiKey(request);
	if (!apiKey) {
		return null;
	}

	const authSession = await resolveAuthSession({
		"x-api-key": apiKey,
	});

	return authSession ? createApiKeyBackedMcpSession(apiKey, authSession) : null;
}

async function handler(request: Request): Promise<Response> {
	const session =
		(await getMcpSession(request)) ??
		(await resolveApiKeyBackedMcpSession(request));

	if (!session) {
		return createUnauthorizedResponse(request);
	}

	return withCors(
		await mcpHandler.fetch(request, {
			authInfo: createAuthInfo(session, request),
		}),
	);
}

export const Route = createFileRoute("/api/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
			POST: ({ request }) => handler(request),
			DELETE: ({ request }) => handler(request),
			OPTIONS: () =>
				new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				}),
		},
	},
});

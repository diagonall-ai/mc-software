import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ApiAuthResult,
	extractApiKey,
	extractBearerApiKey,
	resolveAuthSession,
} from "~/lib/api-auth";
import { auth } from "~/lib/auth";
import { createAuthInfo, MCP_SERVER_INFO, registerMcpTools } from "~/lib/mcp";
import type { McpSession } from "~/lib/rest-auth";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Authorization, Accept, mcp-session-id, mcp-protocol-version, last-event-id",
	"Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
} as const;

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
	if (request.method !== "GET" && request.method !== "HEAD") {
		const headers = new Headers(CORS_HEADERS);
		headers.set("Location", request.url);
		return new Response(null, {
			status: 303,
			headers,
		});
	}

	const headers = new Headers(CORS_HEADERS);
	headers.set(
		"WWW-Authenticate",
		`Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource"`,
	);

	return new Response(null, {
		status: 401,
		headers,
	});
}

function createMcpServer(): McpServer {
	const server = new McpServer(MCP_SERVER_INFO);
	registerMcpTools(server);
	return server;
}

function createApiKeyBackedMcpSession(session: ApiAuthResult): McpSession {
	return {
		accessToken: session.session.token,
		refreshToken: session.session.token,
		accessTokenExpiresAt: session.session.expiresAt,
		refreshTokenExpiresAt: session.session.expiresAt,
		clientId: "api-key",
		userId: session.user.id,
		scopes: "",
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

	return authSession ? createApiKeyBackedMcpSession(authSession) : null;
}

async function handleAuthenticatedMcpRequest(
	request: Request,
	session: McpSession,
): Promise<Response> {
	const transport = new WebStandardStreamableHTTPServerTransport({
		enableJsonResponse: true,
		sessionIdGenerator: undefined,
	});
	const server = createMcpServer();

	try {
		await server.connect(transport);
		return withCors(
			await transport.handleRequest(request, {
				authInfo: createAuthInfo(session),
			}),
		);
	} finally {
		await transport.close();
		await server.close();
	}
}

async function handler(request: Request): Promise<Response> {
	const session =
		(await auth.api.getMcpSession({
			headers: request.headers,
		})) ?? (await resolveApiKeyBackedMcpSession(request));

	if (!session) {
		return createUnauthorizedResponse(request);
	}

	return handleAuthenticatedMcpRequest(request, session);
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

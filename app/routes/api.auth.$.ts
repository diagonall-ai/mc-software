import { createFileRoute } from "@tanstack/react-router";
import { handler } from "~/lib/auth-server";
import {
	handleOAuthAuthorizationServer,
	handleOAuthOptions,
} from "~/lib/mcp-oauth";

async function handleAuthRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	if (url.pathname === "/api/auth/.well-known/oauth-authorization-server") {
		if (request.method === "OPTIONS") {
			return handleOAuthOptions();
		}
		return handleOAuthAuthorizationServer(url.origin);
	}

	return handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleAuthRequest(request),
			POST: ({ request }) => handleAuthRequest(request),
			PUT: ({ request }) => handleAuthRequest(request),
			PATCH: ({ request }) => handleAuthRequest(request),
			DELETE: ({ request }) => handleAuthRequest(request),
			OPTIONS: ({ request }) => handleAuthRequest(request),
		},
	},
});

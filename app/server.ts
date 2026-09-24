import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import {
	handleOAuthAuthorizationServer,
	handleOAuthOptions,
	handleOAuthProtectedResource,
} from "~/lib/mcp-oauth";

// Worker entry (`main` in wrangler.jsonc): answers MCP OAuth discovery, then
// hands every other request to TanStack Start. Durable Object classes, such as
// a Think agent, must be exported from this file.
const startFetch = createStartHandler(defaultStreamHandler);

export type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
	return {
		async fetch(request, opts) {
			const url = new URL(request.url);

			// Handle .well-known discovery endpoints before TanStack Start routing
			if (
				url.pathname === "/.well-known/oauth-authorization-server" ||
				url.pathname === "/.well-known/oauth-authorization-server/api/auth"
			) {
				if (request.method === "OPTIONS") {
					return handleOAuthOptions();
				}
				return handleOAuthAuthorizationServer(url.origin);
			}
			if (
				url.pathname === "/.well-known/oauth-protected-resource" ||
				url.pathname === "/.well-known/oauth-protected-resource/api/mcp"
			) {
				if (request.method === "OPTIONS") {
					return handleOAuthOptions();
				}
				return handleOAuthProtectedResource(url.origin);
			}

			return await entry.fetch(request, opts);
		},
	};
}

export default createServerEntry({ fetch: startFetch });

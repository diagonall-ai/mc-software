import { env } from "cloudflare:workers";
import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { getAgentByName } from "agents";
import { resolveAuthSession } from "~/lib/api-auth";
import {
	handleOAuthAuthorizationServer,
	handleOAuthOptions,
	handleOAuthProtectedResource,
} from "~/lib/mcp-oauth";

export { Assistant } from "~/agents/assistant";

// Worker entry (`main` in wrangler.jsonc): answers MCP OAuth discovery and the
// assistant chat, then hands every other request to TanStack Start. Durable
// Object classes, such as Think agents, must be exported from this file.
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

			// The assistant chat (WebSocket and HTTP). The signed-in user picks the
			// instance: a name sent by the browser is never trusted.
			if (
				url.pathname === "/agents/assistant" ||
				url.pathname.startsWith("/agents/assistant/")
			) {
				const session = await resolveAuthSession(request.headers);
				if (!session) {
					return new Response("Unauthorized", { status: 401 });
				}
				const assistant = await getAgentByName(env.Assistant, session.user.id);
				return assistant.fetch(request);
			}

			return await entry.fetch(request, opts);
		},
	};
}

export default createServerEntry({ fetch: startFetch });

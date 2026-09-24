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
import { createServerApiClient } from "~/lib/orpc/client.server";

const startFetch = createStartHandler(defaultStreamHandler);

export type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
	return {
		async fetch(request) {
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

			return await entry.fetch(request, {
				context: {
					orpc: createServerApiClient(request),
				},
			});
		},
	};
}

export default createServerEntry({ fetch: startFetch });

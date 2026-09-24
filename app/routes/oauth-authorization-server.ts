import { createFileRoute } from "@tanstack/react-router";
import {
	handleOAuthAuthorizationServer,
	handleOAuthOptions,
} from "~/lib/mcp-oauth";

export const Route = createFileRoute("/oauth-authorization-server")({
	server: {
		handlers: {
			GET: ({ request }) =>
				handleOAuthAuthorizationServer(new URL(request.url).origin),
			OPTIONS: () => handleOAuthOptions(),
		},
	},
});

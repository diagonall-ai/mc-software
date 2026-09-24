import { createFileRoute } from "@tanstack/react-router";
import {
	handleOAuthOptions,
	handleOAuthProtectedResource,
} from "~/lib/mcp-oauth";

export const Route = createFileRoute("/oauth-protected-resource")({
	server: {
		handlers: {
			GET: ({ request }) =>
				handleOAuthProtectedResource(new URL(request.url).origin),
			OPTIONS: () => handleOAuthOptions(),
		},
	},
});

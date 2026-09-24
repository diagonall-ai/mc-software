import { createFileRoute } from "@tanstack/react-router";
import { handler } from "~/lib/auth-server";

const handleAuthRequest = (request: Request) => handler(request);

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

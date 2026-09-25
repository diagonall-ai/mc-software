import { env } from "cloudflare:workers";
import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { getAgentByName } from "agents";
import { onKeyRejected } from "~/integrations/http";
import { resolveAuthSession } from "~/lib/api-auth";
import { handler as authHandler } from "~/lib/auth-server";
import { notify } from "~/lib/notify.server";
import { runScheduledJobs } from "~/worker/scheduled";

export { Assistant } from "~/agents/assistant";

// Worker entry (`main` in wrangler.jsonc): answers MCP OAuth discovery and the
// assistant chat, then hands every other request to TanStack Start. Durable
// Object classes, such as Think agents, must be exported from this file.
const startFetch = createStartHandler(defaultStreamHandler);

// A refused key needs someone to create a new one: say so in Slack, at most
// once an hour per service for each running copy of the app.
const lastKeyAlert = new Map<string, number>();
onKeyRejected(async (error) => {
	if (Date.now() - (lastKeyAlert.get(error.service) ?? 0) < 3_600_000) {
		return;
	}
	lastKeyAlert.set(error.service, Date.now());
	await notify(
		`${error.service} refuse sa clé d'accès : il faut sans doute en créer une nouvelle (${error.message})`,
	);
});

export type ServerEntry = { fetch: RequestHandler<Register> };

function createServerEntry(entry: ServerEntry): ServerEntry {
	return {
		async fetch(request, opts) {
			const url = new URL(request.url);

			// OAuth discovery for MCP clients: Better Auth serves these documents
			// once the request reaches its handler. Clients from before path-based
			// discovery ask the bare URL, which gets the issuer's document.
			if (url.pathname.startsWith("/.well-known/")) {
				if (url.pathname === "/.well-known/oauth-authorization-server") {
					url.pathname = "/.well-known/oauth-authorization-server/api/auth";
					return authHandler(new Request(url, request));
				}
				return authHandler(request);
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

const serverEntry = createServerEntry({ fetch: startFetch });

export default {
	fetch: serverEntry.fetch,
	// Cron Triggers (`triggers.crons` in wrangler.jsonc) land here.
	scheduled: (
		controller: ScheduledController,
		_env: Env,
		ctx: ExecutionContext,
	) => ctx.waitUntil(runScheduledJobs(controller)),
};

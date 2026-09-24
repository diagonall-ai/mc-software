import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { resolveAuthSession } from "~/lib/api-auth";

export type BetterAuthSessionStatus =
	| "anonymous"
	| "authenticated"
	| "unavailable";

/**
 * Resolves the current request session without collapsing auth transport
 * failures into an anonymous user. Route guards can avoid false logout
 * redirects while the server-side data layer still enforces access.
 */
async function resolveBetterAuthSessionStatus(): Promise<BetterAuthSessionStatus> {
	try {
		const session = await resolveAuthSession(getRequest().headers);
		return session ? "authenticated" : "anonymous";
	} catch (err) {
		console.error("[auth-session] Better Auth session check unavailable:", err);
		return "unavailable";
	}
}

export const getBetterAuthSessionStatus = createServerFn({
	method: "GET",
}).handler(resolveBetterAuthSessionStatus);

import { ORPCError } from "@orpc/server";
import type { ApiAuthState } from "~/lib/orpc/context";

export type AuthenticatedActor = {
	authKind: ApiAuthState["kind"];
	userId: string;
};

export function requireAuthenticatedActor(
	auth: ApiAuthState | null,
): AuthenticatedActor {
	if (!auth) {
		throw new ORPCError("UNAUTHORIZED", {
			message:
				"Missing or invalid API credentials. Use a browser session, Authorization: Bearer <api-key>, x-api-key, or MCP session auth.",
		});
	}

	const userId =
		auth.kind === "mcp-session" ? auth.session.userId : auth.user.id;
	if (!userId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Authenticated session is missing a user id.",
		});
	}

	return {
		authKind: auth.kind,
		userId,
	};
}

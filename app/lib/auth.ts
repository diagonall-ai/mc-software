import { authServer } from "~/lib/auth-server";
import type { McpSession } from "~/lib/rest-auth";

export const auth = {
	api: {
		async getMcpSession({
			headers,
		}: {
			headers: Headers;
		}): Promise<McpSession | null> {
			// Only the bearer token matters. Passing every header would let an
			// invalid x-api-key make Better Auth throw instead of returning null.
			const authorization = headers.get("authorization");
			if (!authorization) {
				return null;
			}
			return await authServer.api.getMcpSession({
				headers: new Headers({ authorization }),
			});
		},
	},
};

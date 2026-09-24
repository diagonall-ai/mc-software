import { authServer } from "~/lib/auth-server";
import type { McpSession } from "~/lib/rest-auth";

export const auth = {
	api: {
		async getMcpSession({
			headers,
		}: {
			headers: Headers;
		}): Promise<McpSession | null> {
			return await authServer.api.getMcpSession({ headers });
		},
	},
};

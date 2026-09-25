import type { AuthInfo, McpServer } from "@modelcontextprotocol/server";
import { type AnyProcedure, call, ORPCError } from "@orpc/server";
import { z } from "zod";
import type { ApiContext } from "~/lib/orpc/context";
import { apiRouter } from "~/lib/orpc/router";
import { PROJECT_NAME } from "~/lib/project";
import type { McpSession } from "~/lib/rest-auth";

export const MCP_SERVER_INFO = {
	name: PROJECT_NAME,
	version: "1.0.0",
} as const;

/**
 * The MCP tools: the few actions an AI assistant connected to the app (Claude,
 * ChatGPT, Cursor…) really needs, never every API route. Each one runs an oRPC
 * procedure in-process as the signed-in user, with its validation and checks.
 *
 * - Name tools as snake_case verbs, and keep their input a flat object.
 * - The description is the route's `description` (or `summary`) in
 *   contract.ts: write it for an AI that cannot see the code.
 * - GET routes are marked read-only, so clients may run them without asking.
 */
const MCP_TOOLS = {
	get_my_profile: apiRouter.profile.get,
	update_my_profile: apiRouter.profile.update,
} satisfies Record<string, AnyProcedure>;

export function registerMcpTools(server: McpServer): void {
	for (const [name, procedure] of Object.entries(MCP_TOOLS)) {
		const { inputSchema, route } = (procedure as AnyProcedure)["~orpc"];
		server.registerTool(
			name,
			{
				title: route.summary,
				description: route.description ?? route.summary,
				// Tools without input still take an (empty) object.
				inputSchema: (inputSchema ?? z.object({})) as z.ZodType,
				annotations: { readOnlyHint: route.method === "GET" },
			},
			async (input: unknown, ctx) => {
				const { session, request } = readAuthInfo(ctx.http?.authInfo);
				const context: ApiContext = {
					request,
					auth: { kind: "mcp-session", user: null, session },
				};
				try {
					const result = await call(procedure as AnyProcedure, input, {
						context,
					});
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					};
				} catch (error) {
					// Errors meant for the caller (not found, invalid input…) go back to
					// the assistant as text; anything else is a server error.
					if (error instanceof ORPCError) {
						return {
							isError: true,
							content: [{ type: "text", text: error.message }],
						};
					}
					throw error;
				}
			},
		);
	}
}

export function createAuthInfo(
	session: McpSession,
	request: Request,
): AuthInfo {
	return {
		token: session.accessToken,
		clientId: session.clientId,
		scopes: session.scopes,
		expiresAt: session.expiresAt,
		extra: { session, request },
	};
}

function readAuthInfo(authInfo?: AuthInfo) {
	const { session, request } = authInfo?.extra ?? {};
	if (!session || !(request instanceof Request)) {
		throw new Error("Missing authenticated MCP session");
	}
	return { session: session as McpSession, request };
}

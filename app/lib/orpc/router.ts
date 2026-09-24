import { implement } from "@orpc/server";
import { requireAuthenticatedActor } from "~/lib/orpc/authorization";
import type { ApiContext } from "~/lib/orpc/context";
import { apiContract } from "~/lib/orpc/contract";

const orpc = implement(apiContract).$context<ApiContext>();

/**
 * Concrete procedure implementations behind the canonical oRPC contract.
 */
export const apiRouter = {
	examples: {
		workflow: orpc.examples.workflow.handler(async ({ context, input }) => {
			requireAuthenticatedActor(context.auth);
			const { params, query, body } = input;

			return {
				success: true,
				received: {
					exampleId: params.exampleId,
					query: {
						q: query.q,
						limit: query.limit,
						dryRun: query.dryRun,
						channel: query.channel,
					},
					body: {
						message: body.message,
						priority: body.priority,
					},
				},
				preview: [
					`${params.exampleId}:${query.q}:1`,
					`${params.exampleId}:${query.q}:2`,
					`${params.exampleId}:${query.q}:${query.limit}`,
				],
				message: `Prepared ${query.channel} workflow for ${params.exampleId}${query.dryRun ? " (dry run)" : ""}.`,
			};
		}),
	},
} as const;

import { implement } from "@orpc/server";
import { getViewerProfile, updateViewerProfile } from "~/db/profile";
import { briefText } from "~/lib/ai.server";
import { requireAuthenticatedActor } from "~/lib/orpc/authorization";
import type { ApiContext } from "~/lib/orpc/context";
import { apiContract } from "~/lib/orpc/contract";

const orpc = implement(apiContract).$context<ApiContext>();

/**
 * Concrete procedure implementations behind the canonical oRPC contract.
 */
export const apiRouter = {
	profile: {
		get: orpc.profile.get.handler(async ({ context }) => {
			const actor = requireAuthenticatedActor(context.auth);
			return await getViewerProfile(actor.userId);
		}),
		update: orpc.profile.update.handler(async ({ context, input }) => {
			const actor = requireAuthenticatedActor(context.auth);
			await updateViewerProfile(actor.userId, input);
			return await getViewerProfile(actor.userId);
		}),
	},
	ai: {
		brief: orpc.ai.brief.handler(async ({ context, input }) => {
			requireAuthenticatedActor(context.auth);
			return await briefText(input.text);
		}),
	},
} as const;

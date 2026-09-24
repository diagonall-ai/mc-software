import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
	getViewerProfile,
	updateViewerProfile,
	type ViewerProfile,
} from "~/db/profile";
import { resolveAuthSession } from "~/lib/api-auth";

const updateProfileSchema = z.object({
	bio: z.string(),
	name: z.string(),
	username: z.string(),
});

async function requireSessionUser() {
	const session = await resolveAuthSession(getRequest().headers);
	if (!session) {
		throw new Error("Not authenticated");
	}
	return session.user;
}

export const getViewerProfileFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<ViewerProfile> => {
		const user = await requireSessionUser();
		return await getViewerProfile(user.id);
	},
);

export const updateViewerProfileFn = createServerFn({ method: "POST" })
	.inputValidator(updateProfileSchema)
	.handler(async ({ data }) => {
		const user = await requireSessionUser();
		await updateViewerProfile(user.id, data);
		return await getViewerProfile(user.id);
	});

import { oc } from "@orpc/contract";
import { z } from "zod";

const profileSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	username: z.string().nullish(),
	bio: z.string().nullish(),
	image: z.string().nullish(),
});

/** What `ai.brief` returns. Descriptions guide the model as well as the docs. */
export const textBriefSchema = z.object({
	summary: z
		.string()
		.describe("The text summed up in two sentences at most, in its language."),
	category: z
		.enum(["question", "request", "complaint", "feedback", "other"])
		.describe("What the text mainly is."),
});

/**
 * Canonical machine contract for the starter's OpenAPI and MCP surface.
 * New user or agent capabilities should be added here first.
 */
export const apiContract = {
	profile: {
		get: oc
			.route({
				method: "GET",
				path: "/api/profile",
				summary: "Get my profile",
				description:
					"Returns the signed-in user profile: name, email, username, bio and avatar.",
				tags: ["profile"],
			})
			.output(profileSchema),
		update: oc
			.route({
				method: "PATCH",
				path: "/api/profile",
				summary: "Update my profile",
				description:
					"Updates the signed-in user name, username and bio, then returns the profile. Usernames are 3-32 letters, digits, hyphens or underscores, and unique.",
				tags: ["profile"],
			})
			.input(
				z.object({
					name: z.string().max(80),
					username: z.string().max(32),
					bio: z.string().max(280),
				}),
			)
			.output(profileSchema),
	},
	ai: {
		brief: oc
			.route({
				method: "POST",
				path: "/api/ai/brief",
				summary: "Summarize and classify a text",
				description:
					"Uses Workers AI to sum up a text in two sentences and classify it (question, request, complaint, feedback, other). Works only on the deployed app.",
				tags: ["ai"],
			})
			.input(z.object({ text: z.string().min(1).max(20000) }))
			.output(textBriefSchema),
	},
	files: {
		read: oc
			.route({
				method: "POST",
				path: "/api/files/read",
				summary: "Read a document as text",
				description:
					"Reads an uploaded file and returns its text: CSV and text files as they are; PDF, Excel, Word and images as Markdown (Workers AI, deployed app only). Up to 10 MB. Send it as multipart/form-data in a `file` field.",
				tags: ["files"],
			})
			.input(z.object({ file: z.file().max(10 * 1024 * 1024) }))
			.output(z.object({ name: z.string(), text: z.string() })),
	},
} as const;

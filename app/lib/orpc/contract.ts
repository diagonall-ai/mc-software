import { oc } from "@orpc/contract";
import { z } from "zod";

const exampleParamsSchema = z.object({
	exampleId: z.string().min(1),
});

function parseBooleanQueryValue(value: unknown): unknown {
	if (typeof value === "boolean" || value === undefined) {
		return value;
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}

	return value;
}

const exampleQuerySchema = z.object({
	q: z.string().min(1),
	limit: z.coerce.number().int().min(1).max(20).default(10),
	dryRun: z.preprocess(parseBooleanQueryValue, z.boolean()).default(false),
	channel: z.enum(["email", "sms", "push"]).default("email"),
});

const exampleBodySchema = z.object({
	message: z.string().min(1),
	priority: z.enum(["low", "normal", "high"]).default("normal"),
});

const exampleResponseSchema = z.object({
	success: z.boolean(),
	received: z.object({
		exampleId: z.string(),
		query: z.object({
			q: z.string(),
			limit: z.number().int(),
			dryRun: z.boolean(),
			channel: z.enum(["email", "sms", "push"]),
		}),
		body: z.object({
			message: z.string(),
			priority: z.enum(["low", "normal", "high"]),
		}),
	}),
	preview: z.array(z.string()),
	message: z.string(),
});

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
	examples: {
		workflow: oc
			.route({
				method: "POST",
				path: "/api/examples/{exampleId}/workflow",
				inputStructure: "detailed",
				summary: "Example workflow route",
				description:
					"Example route for MCP and OpenAPI integration. It intentionally combines path params, query params, a JSON body, and a typed response so LLMs can learn the proxy shape from one route. Remove it once real routes are available.",
				tags: ["examples"],
			})
			.input(
				z.object({
					params: exampleParamsSchema,
					query: exampleQuerySchema,
					body: exampleBodySchema,
				}),
			)
			.output(exampleResponseSchema),
	},
} as const;

export type ExampleWorkflowInput = z.input<
	(typeof apiContract.examples.workflow)["~orpc"]["inputSchema"]
>;

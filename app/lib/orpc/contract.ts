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

/**
 * Canonical machine contract for the starter's OpenAPI and MCP surface.
 * New user or agent capabilities should be added here first.
 */
export const apiContract = {
	examples: {
		workflow: oc
			.route({
				method: "POST",
				path: "/api/v1/examples/{exampleId}/workflow",
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

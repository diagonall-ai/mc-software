import { z } from "zod";
import type { SandboxDictionary, SandboxJsonValue } from "~/lib/mcp-sandbox";

const jsonValueSchema: z.ZodType<SandboxJsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
);

const dictionaryInputSchema = z
	.record(z.string(), jsonValueSchema)
	.describe(
		"Free-form JSON object made available to executed code as `dictionary`. Put string-heavy or nested request data here so code can reference it without JavaScript string escaping.",
	);

export const codeInputSchema = z.object({
	code: z.string().describe("JavaScript code to normalize."),
});

export const executeInputSchema = z.object({
	code: z.string().describe("JavaScript code to execute."),
	dictionary: dictionaryInputSchema.optional(),
});

export function getExecutionDictionary(dictionary: unknown): SandboxDictionary {
	if (dictionary === undefined) {
		return {};
	}

	const parseResult = dictionaryInputSchema.safeParse(dictionary);
	if (!parseResult.success) {
		throw new Error(`Invalid dictionary: ${parseResult.error.message}`);
	}

	return parseResult.data;
}

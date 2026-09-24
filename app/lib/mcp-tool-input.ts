import { z } from "zod/v3";
import type { SandboxDictionary, SandboxJsonValue } from "~/lib/mcp-sandbox";

const jsonValueSchema: z.ZodType<SandboxJsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number().finite(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(jsonValueSchema),
	]),
);

const dictionaryInputSchema = z
	.record(jsonValueSchema)
	.describe(
		"Free-form JSON object made available to executed code as `dictionary`. Put string-heavy or nested request data here so code can reference it without JavaScript string escaping.",
	);

export const codeInputSchema = {
	code: z.string().describe("JavaScript code to normalize."),
} satisfies Record<string, z.ZodTypeAny>;

export const executeInputSchema = {
	code: z.string().describe("JavaScript code to execute."),
	dictionary: dictionaryInputSchema.optional(),
} satisfies Record<string, z.ZodTypeAny>;

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

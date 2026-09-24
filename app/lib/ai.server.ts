import { env } from "cloudflare:workers";
import type { Ai as AiBinding } from "@cloudflare/workers-types";
import { chat } from "@tanstack/ai";
import { createCloudflareText } from "@tanstack/ai-cloudflare";
import { textBriefSchema } from "~/lib/orpc/contract";

/**
 * One-off AI tasks (summarize, classify, extract, draft) with TanStack AI on
 * Workers AI. One `chat()` call with an `outputSchema` returns a typed object.
 * Workers AI only runs on Cloudflare: these calls fail in local dev.
 */
function textModel() {
	// Supports Workers AI JSON mode (reliable structured output) on the free
	// plan. Newer models often answer in prose and fail the schema.
	return createCloudflareText("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
		// Same binding: the adapter types it with the module build of workers-types.
		binding: env.AI as unknown as AiBinding,
	});
}

export function briefText(text: string) {
	return chat({
		adapter: textModel(),
		systemPrompts: [
			"Summarize and classify the text the user sends. Write the summary in the language of that text.",
		],
		messages: [{ role: "user", content: text }],
		outputSchema: textBriefSchema,
	});
}

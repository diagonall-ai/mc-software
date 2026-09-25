import { env } from "cloudflare:workers";
import { ORPCError } from "@orpc/server";

/**
 * Reads an uploaded file as text: CSV and other text files as they are (also
 * in local dev), and PDF, Excel, Word or images as Markdown through Workers
 * AI (deployed app only). To turn the text into rows or fields, pass it to a
 * TanStack AI `chat()` with an `outputSchema`, like `briefText`.
 */
export async function readFileAsText(file: File): Promise<string> {
	if (
		/^text\/|\/json$/.test(file.type) ||
		/\.(csv|txt|md|json)$/i.test(file.name)
	) {
		return await file.text();
	}
	const result = await env.AI.toMarkdown(
		{ name: file.name, blob: file },
		{
			conversionOptions: {
				image: { descriptionLanguage: "fr" },
				pdf: { metadata: false },
			},
		},
	).catch((error: unknown) => {
		console.error("[files] toMarkdown failed", error);
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message:
				"Lire un PDF, un Excel, un Word ou une image passe par Workers AI : cela ne marche que sur l'application en ligne, dans la limite du quota du jour.",
		});
	});
	if (result.format === "error") {
		throw new ORPCError("BAD_REQUEST", {
			message: `Impossible de lire « ${file.name} » : ${result.error}`,
		});
	}
	return result.data;
}

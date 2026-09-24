import { Think, type TurnConfig } from "@cloudflare/think";
import { tool } from "ai";
import { z } from "zod";
import { getViewerProfile } from "~/db/profile";

/**
 * The in-app assistant: a Cloudflare Think agent, one Durable Object per user.
 * app/server.ts names each instance after the signed-in user's id, so
 * `this.name` is the user the assistant works for. Scope every tool to it,
 * through the same app/db repositories the oRPC handlers use.
 */
export class Assistant extends Think<Env> {
	getModel() {
		// Runs on the free Workers plan. Workers AI only works once deployed.
		return "@cf/zai-org/glm-4.7-flash";
	}

	getSystemPrompt() {
		return "Tu es l'assistant de cette application. Réponds en français, simplement et brièvement. Utilise tes outils pour lire les données de l'utilisateur plutôt que de deviner.";
	}

	getTools() {
		return {
			getMyProfile: tool({
				description:
					"Read the signed-in user's profile: name, email, username and bio.",
				inputSchema: z.object({}),
				execute: () => getViewerProfile(this.name),
			}),
		};
	}

	// Only the app's tools: Think's built-in file workspace tools are left out.
	beforeTurn(): TurnConfig {
		return { activeTools: Object.keys(this.getTools()) };
	}
}

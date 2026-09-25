import { env } from "cloudflare:workers";
import { PROJECT_NAME } from "~/lib/project";

/**
 * Posts a message to the team's Slack channel through an incoming webhook
 * (the SLACK_WEBHOOK_URL secret): the free-plan way to tell people something
 * happened, since the free plan sends no e-mail. Does nothing until it is set.
 */
export async function notify(text: string): Promise<void> {
	if (!env.SLACK_WEBHOOK_URL) {
		return;
	}
	const response = await fetch(env.SLACK_WEBHOOK_URL, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ text: `${PROJECT_NAME} : ${text}` }),
	});
	if (!response.ok) {
		console.error(`[notify] Slack answered ${response.status}`);
	}
}

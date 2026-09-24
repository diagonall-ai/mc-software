/**
 * Cloudflare Workers Scheduled Event Handler
 *
 * This file handles cron-triggered events defined in wrangler.jsonc.
 * Cron Triggers let you run Workers on a schedule without any HTTP request.
 *
 * === How to activate ===
 * 1. Uncomment the triggers object in wrangler.jsonc
 * 2. Deploy with `wrangler deploy`
 * 3. Cron triggers only run in production — use `wrangler dev --test-scheduled`
 *    then `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to test locally
 *
 * === Common personal software use cases ===
 * - Clean up expired sessions or stale data
 * - Send daily/weekly digest emails
 * - Refresh cached API data (weather, RSS feeds, etc.)
 * - Check external services and log uptime
 * - Rotate or archive old records
 */

// Add your bindings here when activating features, e.g.:
// export interface Env {
//   DB: D1Database;
//   KV_STORE: KVNamespace;
//   RATE_LIMITER: DurableObjectNamespace;
// }
export type Env = Record<string, unknown>;

/**
 * The scheduled handler is invoked by Cloudflare's cron system.
 * The `event.cron` string tells you which cron pattern triggered this invocation,
 * so you can run different logic for different schedules.
 */
export async function handleScheduled(
	event: ScheduledEvent,
	env: Env,
): Promise<void> {
	switch (event.cron) {
		// Runs every hour — good for lightweight cleanup
		case "0 * * * *":
			await cleanupExpiredSessions(env);
			break;

		// Runs daily at midnight UTC — good for aggregation or digests
		case "0 0 * * *":
			await dailyCleanup(env);
			break;

		// Runs every Monday at 9am UTC — good for weekly reports
		case "0 9 * * 1":
			await weeklyDigest(env);
			break;

		default:
			console.log(`Unhandled cron pattern: ${event.cron}`);
	}
}

// ---------------------------------------------------------------------------
// Example task implementations — replace with your actual logic
// ---------------------------------------------------------------------------

/**
 * Clean up expired sessions or temporary data.
 * Runs hourly to keep storage lean.
 */
async function cleanupExpiredSessions(_env: Env): Promise<void> {
	const now = Date.now();
	console.log(`[${new Date(now).toISOString()}] Running session cleanup...`);

	// Example with D1:
	// const result = await env.DB.prepare(
	//   "DELETE FROM sessions WHERE expires_at < ?"
	// ).bind(now).run();
	// console.log(`Cleaned up ${result.meta.changes} expired sessions`);

	// Example with KV:
	// const list = await env.KV_STORE.list({ prefix: "session:" });
	// for (const key of list.keys) {
	//   const session = await env.KV_STORE.get(key.name, "json");
	//   if (session && session.expiresAt < now) {
	//     await env.KV_STORE.delete(key.name);
	//   }
	// }
}

/**
 * Daily maintenance tasks: archive old records, refresh caches, etc.
 * Runs once per day at midnight UTC.
 */
async function dailyCleanup(_env: Env): Promise<void> {
	console.log("Running daily cleanup...");

	// Example: Archive records older than 30 days
	// const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
	// await env.DB.prepare(
	//   "UPDATE entries SET archived = 1 WHERE created_at < ? AND archived = 0"
	// ).bind(thirtyDaysAgo).run();

	// Example: Refresh a cached API response
	// const data = await fetch("https://api.example.com/data").then(r => r.json());
	// await env.KV_STORE.put("cached:api-data", JSON.stringify(data), {
	//   expirationTtl: 86400, // 24 hours
	// });
}

/**
 * Send a weekly digest or report.
 * Runs every Monday at 9am UTC.
 */
async function weeklyDigest(_env: Env): Promise<void> {
	console.log("Running weekly digest...");

	// Example: Aggregate stats and send via email API
	// const stats = await env.DB.prepare(
	//   "SELECT COUNT(*) as count FROM entries WHERE created_at > ?"
	// ).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).first();
	//
	// await fetch("https://api.mailservice.com/send", {
	//   method: "POST",
	//   headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.MAIL_API_KEY}` },
	//   body: JSON.stringify({
	//     to: "you@example.com",
	//     subject: "Weekly Summary",
	//     text: `You created ${stats?.count ?? 0} entries this week.`,
	//   }),
	// });
}

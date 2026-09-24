/**
 * Scheduled jobs (Cron Triggers). `app/server.ts` sends every trigger here.
 *
 * To add a job:
 * 1. Add its pattern to `triggers.crons` in wrangler.jsonc. Times are UTC, and
 *    the free plan allows 5 cron triggers per account.
 * 2. Add a `case` below that calls a function from `app/db/`, or a shell from
 *    `app/integrations/` through `runIntegration`: no raw SQL or `fetch` here.
 * 3. With the dev server running, trigger it:
 *    `curl "http://localhost:3934/cdn-cgi/handler/scheduled?cron=0+6+*+*+1"`
 *
 * On the free plan a run gets 10 ms of CPU and 50 subrequests: do one small
 * step per run (one page of a sync, one AI batch) and save where it stopped
 * in D1, so the next run carries on.
 */
export async function runScheduledJobs(
	controller: ScheduledController,
): Promise<void> {
	switch (controller.cron) {
		// case "0 6 * * 1": // Mondays, 06:00 UTC
		// 	await syncWeeklyFeedback();
		// 	break;
		default:
			console.warn(`No scheduled job for cron "${controller.cron}"`);
	}
}

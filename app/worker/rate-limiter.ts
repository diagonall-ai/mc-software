/**
 * Cloudflare Durable Object: Rate Limiter
 *
 * Durable Objects provide strongly consistent, stateful coordination at the edge.
 * Each DO instance has its own isolated storage and runs in a single location,
 * making them ideal for rate limiting, session management, and coordination.
 *
 * === How to activate ===
 * 1. Uncomment the durable_objects bindings and migrations in wrangler.jsonc
 * 2. Deploy with `wrangler deploy` (migrations run automatically on first deploy)
 * 3. Access the DO from your Worker via env.RATE_LIMITER binding
 *
 * === How Durable Objects work ===
 * - Each DO instance is identified by a unique ID (often derived from a name/key)
 * - All requests to the same ID are routed to the same instance
 * - The instance has transactional SQLite storage (via ctx.storage)
 * - Instances are created on-demand and hibernate when idle (you only pay for active time)
 * - Use alarm() for delayed/scheduled work within a DO
 *
 * === Common personal software use cases ===
 * - Rate limiting API endpoints per user/IP
 * - Managing WebSocket connections for real-time features
 * - Coordinating distributed locks (e.g., prevent duplicate processing)
 * - Session state that survives across requests
 * - Counters, leaderboards, or any shared mutable state
 */

export interface Env {
	RATE_LIMITER: DurableObjectNamespace;
}

/**
 * Rate Limiter Durable Object
 *
 * Implements a sliding window rate limiter. Each instance tracks requests
 * for a single key (e.g., user ID, IP address, API key).
 *
 * Usage from a Worker:
 * ```ts
 * const id = env.RATE_LIMITER.idFromName(userId);
 * const limiter = env.RATE_LIMITER.get(id);
 * const response = await limiter.fetch("http://internal/check", {
 *   method: "POST",
 *   body: JSON.stringify({ limit: 100, windowMs: 60_000 }),
 * });
 * const { allowed, remaining } = await response.json();
 * ```
 */
export class RateLimiter implements DurableObject {
	private ctx: DurableObjectState;

	constructor(ctx: DurableObjectState, _env: Env) {
		this.ctx = ctx;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case "/check":
				return this.checkRateLimit(request);
			case "/reset":
				return this.resetRateLimit();
			case "/status":
				return this.getStatus();
			default:
				return new Response("Not found", { status: 404 });
		}
	}

	/**
	 * Check if the request is within rate limits using a sliding window.
	 *
	 * Stores timestamps of recent requests in DO storage. On each check:
	 * 1. Remove timestamps outside the current window
	 * 2. Check if count is below the limit
	 * 3. If allowed, add the current timestamp
	 */
	private async checkRateLimit(request: Request): Promise<Response> {
		const body = (await request.json()) as {
			limit?: number;
			windowMs?: number;
		};
		const limit = body.limit ?? 100;
		const windowMs = body.windowMs ?? 60_000;
		const now = Date.now();

		// Get existing timestamps from storage
		const timestamps: number[] =
			(await this.ctx.storage.get("timestamps")) ?? [];

		// Remove timestamps outside the sliding window
		const windowStart = now - windowMs;
		const activeTimestamps = timestamps.filter((t) => t > windowStart);

		if (activeTimestamps.length >= limit) {
			// Rate limit exceeded
			const oldestInWindow = activeTimestamps[0] ?? now;
			const retryAfterMs = oldestInWindow + windowMs - now;

			return Response.json(
				{
					allowed: false,
					remaining: 0,
					retryAfterMs,
					limit,
					windowMs,
				},
				{
					status: 429,
					headers: {
						"Retry-After": String(Math.ceil(retryAfterMs / 1000)),
					},
				},
			);
		}

		// Allow the request and record the timestamp
		activeTimestamps.push(now);
		await this.ctx.storage.put("timestamps", activeTimestamps);

		// Schedule an alarm to clean up old timestamps (saves storage costs)
		const currentAlarm = await this.ctx.storage.getAlarm();
		if (currentAlarm === null) {
			await this.ctx.storage.setAlarm(now + windowMs + 1000);
		}

		return Response.json({
			allowed: true,
			remaining: limit - activeTimestamps.length,
			limit,
			windowMs,
		});
	}

	/**
	 * Reset all rate limit state for this key.
	 */
	private async resetRateLimit(): Promise<Response> {
		await this.ctx.storage.deleteAll();
		return Response.json({ reset: true });
	}

	/**
	 * Get current rate limit status without consuming a request.
	 */
	private async getStatus(): Promise<Response> {
		const timestamps: number[] =
			(await this.ctx.storage.get("timestamps")) ?? [];
		return Response.json({
			currentCount: timestamps.length,
			timestamps,
		});
	}

	/**
	 * Alarm handler — called after the scheduled delay.
	 * Used to clean up expired timestamps and free storage.
	 */
	async alarm(): Promise<void> {
		const timestamps: number[] =
			(await this.ctx.storage.get("timestamps")) ?? [];

		if (timestamps.length === 0) {
			return;
		}

		// Default to 60s window for cleanup — timestamps older than this are stale
		const windowMs = 60_000;
		const cutoff = Date.now() - windowMs;
		const active = timestamps.filter((t) => t > cutoff);

		if (active.length > 0) {
			await this.ctx.storage.put("timestamps", active);
			// Re-schedule alarm to clean up remaining timestamps later
			await this.ctx.storage.setAlarm(Date.now() + windowMs + 1000);
		} else {
			// All timestamps expired — clean up completely
			await this.ctx.storage.deleteAll();
		}
	}
}

// ---------------------------------------------------------------------------
// Helper: Middleware-style rate limit check for use in your Worker
// ---------------------------------------------------------------------------

/**
 * Example usage in a Worker fetch handler:
 *
 * ```ts
 * import { checkRateLimit } from "./worker/rate-limiter";
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
 *     const { allowed, remaining } = await checkRateLimit(env, ip, {
 *       limit: 60,
 *       windowMs: 60_000,
 *     });
 *
 *     if (!allowed) {
 *       return new Response("Too Many Requests", { status: 429 });
 *     }
 *
 *     // ... handle request normally
 *   },
 * };
 * ```
 */
export async function checkRateLimit(
	env: Env,
	key: string,
	options: { limit?: number; windowMs?: number } = {},
): Promise<{ allowed: boolean; remaining: number }> {
	const id = env.RATE_LIMITER.idFromName(key);
	const limiter = env.RATE_LIMITER.get(id);
	const response = await limiter.fetch("http://internal/check", {
		method: "POST",
		body: JSON.stringify(options),
	});
	return response.json();
}

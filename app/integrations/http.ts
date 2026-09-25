/**
 * Shared plumbing for the third-party API shells in `app/integrations/`.
 *
 * Every shell sends its calls through `request`, so they all behave the same:
 * - a timeout on each attempt (15 seconds by default), never past the time
 *   the call has left;
 * - GET calls retried with exponential backoff and jitter on transient
 *   failures (network errors, 429 and 5xx), waiting for `Retry-After` when it
 *   fits in the time left; other methods are not retried unless they opt in,
 *   so a write never runs twice;
 * - one typed error, `IntegrationError`, whose `reason` says what went wrong;
 * - response validation with Effect Schema, so a changed API fails loudly
 *   instead of returning `undefined` fields.
 *
 * Server-only: use the shells from oRPC handlers, server functions or jobs,
 * never from components, because they carry API keys. See INTEGRATIONS.md.
 */
import { ORPCError } from "@orpc/server";
import {
	Context,
	Data,
	Duration,
	Effect,
	Result,
	Schedule,
	Schema,
} from "effect";

export type IntegrationFailureReason =
	/** 401: the key is missing, wrong, or expired. */
	| "unauthorized"
	/** 402/403: the key lacks a permission, or the plan does not include the API. */
	| "forbidden"
	/** 404: the resource does not exist, or the key cannot see it. */
	| "not_found"
	/** Other 4xx, or an invalid address: the request itself is wrong. */
	| "bad_request"
	/** 429: too many calls. Retried when the wait fits in the time left. */
	| "rate_limited"
	/** 5xx: the service failed. Retried automatically. */
	| "server_error"
	/** Unreachable or too slow. Retried automatically. */
	| "network"
	/** 2xx, but the body does not match the expected schema. */
	| "invalid_response";

/** The only error a shell method can fail with. `message` is safe to show to users. */
export class IntegrationError extends Data.TaggedError("IntegrationError")<{
	readonly service: string;
	readonly reason: IntegrationFailureReason;
	readonly message: string;
	readonly status?: number;
	readonly retryAfter?: Duration.Duration;
	/** Technical detail for logs: response body excerpt or schema mismatch. */
	readonly detail?: string;
}> {
	get retryable(): boolean {
		return (
			this.reason === "rate_limited" ||
			this.reason === "server_error" ||
			this.reason === "network"
		);
	}
}

export interface RequestOptions<A> {
	/** Name used in errors and logs, for example "Pennylane". */
	readonly service: string;
	readonly url: string;
	readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	readonly headers?: Record<string, string>;
	/** Query parameters. `undefined` and `null` values are left out. */
	readonly query?: Record<string, string | number | boolean | null | undefined>;
	/** JSON body, sent with `Content-Type: application/json`. */
	readonly json?: unknown;
	/** Form body, sent as `application/x-www-form-urlencoded`. */
	readonly form?: Record<string, string>;
	/** Parse the response body as JSON (default) or keep it as text (CSV exports). */
	readonly parse?: "json" | "text";
	/** Expected response. Declare only the fields you use; others are dropped. */
	readonly schema: Schema.Decoder<A>;
	/** Per attempt. Defaults to 15 seconds, and never runs past the time left. */
	readonly timeout?: Duration.Input;
	/**
	 * Retries on transient failures: 3 for GET, 0 for other methods, so a write
	 * never runs twice. A POST that only reads (a search, a token request) can
	 * pass 3.
	 */
	readonly retries?: number;
}

/** What a shell's private `#call` method takes besides the path and schema. */
export type CallOptions = Omit<
	RequestOptions<unknown>,
	"service" | "url" | "schema"
>;

/** When the current call gives up, in epoch milliseconds. Set by `withTimeLimit`. */
const Deadline = Context.Reference<number>("integrations/Deadline", {
	defaultValue: () => Number.POSITIVE_INFINITY,
});

// Exponential backoff with jitter, stretched to Retry-After when the service
// sends one.
const backoff = Schedule.exponential("500 millis").pipe(
	Schedule.jittered,
	Schedule.setInputType<IntegrationError>(),
	Schedule.modifyDelay(({ input, duration }) =>
		Effect.succeed(
			input.retryAfter ? Duration.max(duration, input.retryAfter) : duration,
		),
	),
);

// A path segment that is `.` or `..`, even percent-encoded: once the URL is
// normalized, it would climb out of the endpoint the shell meant to call.
const DOT_SEGMENT = /\/(?:\.|%2e){1,2}(?=[/?#]|$)/i;

export const request = <A>(
	options: RequestOptions<A>,
): Effect.Effect<A, IntegrationError> => {
	const { service, json, form, parse = "json" } = options;
	const method = options.method ?? "GET";

	const url = Effect.try({
		try: () => {
			if (DOT_SEGMENT.test(options.url)) {
				throw new Error("path contains a . or .. segment");
			}
			const url = new URL(options.url);
			for (const [key, value] of Object.entries(options.query ?? {})) {
				if (value !== undefined && value !== null) {
					url.searchParams.set(key, String(value));
				}
			}
			return url;
		},
		catch: (cause) =>
			new IntegrationError({
				detail: `${String(cause)}: ${options.url}`,
				message: `L'adresse d'appel à ${service} est invalide : vérifiez sa configuration et les identifiants transmis.`,
				reason: "bad_request",
				service,
			}),
	});

	// A URLSearchParams body sets its own form Content-Type.
	const init: RequestInit = {
		body:
			json !== undefined
				? JSON.stringify(json)
				: form && new URLSearchParams(form),
		headers: {
			Accept: parse === "json" ? "application/json" : "*/*",
			...(json !== undefined && { "Content-Type": "application/json" }),
			...options.headers,
		},
		method,
	};

	const attempt = (url: URL) =>
		withinDeadline(
			Effect.tryPromise({
				try: (signal) => fetch(url, { ...init, signal }),
				catch: (cause) =>
					new IntegrationError({
						detail: String(cause),
						message: `${service} est injoignable pour le moment.`,
						reason: "network",
						service,
					}),
			}).pipe(
				Effect.flatMap((response) =>
					response.ok
						? readBody(service, response, parse)
						: readBody(service, response, "text").pipe(
								Effect.flatMap((body) =>
									Effect.fail(
										errorFromResponse(service, response, String(body)),
									),
								),
							),
				),
			),
			options.timeout ?? "15 seconds",
			() =>
				new IntegrationError({
					message: `${service} n'a pas répondu à temps.`,
					reason: "network",
					service,
				}),
		);

	return url.pipe(
		Effect.flatMap((url) =>
			retryTransient(
				attempt(url),
				options.retries ?? (method === "GET" ? 3 : 0),
			),
		),
		Effect.flatMap((body) =>
			Schema.decodeUnknownEffect(options.schema)(body).pipe(
				Effect.mapError(
					(error) =>
						new IntegrationError({
							detail: error.message,
							message: `${service} a renvoyé une réponse inattendue.`,
							reason: "invalid_response",
							service,
						}),
				),
			),
		),
	);
};

/**
 * Runs one attempt with a time limit that never goes past the time the call
 * has left. `request` does this; use it for shells that do not speak HTTP.
 */
export const withinDeadline = <A>(
	attempt: Effect.Effect<A, IntegrationError>,
	limit: Duration.Input,
	onTimeout: () => IntegrationError,
): Effect.Effect<A, IntegrationError> =>
	Effect.flatMap(Deadline, (deadline) =>
		attempt.pipe(
			Effect.timeoutOrElse({
				duration: Math.max(
					0,
					Math.min(Duration.toMillis(limit), deadline - Date.now()),
				),
				orElse: () => Effect.fail(onTimeout()),
			}),
		),
	);

/**
 * Retries transient failures (network, 429, 5xx) with backoff and jitter,
 * waiting for Retry-After, but only when the wait still leaves time for one
 * more attempt. `request` does this; use it for shells that do not speak HTTP.
 */
export const retryTransient = <A>(
	effect: Effect.Effect<A, IntegrationError>,
	times = 3,
): Effect.Effect<A, IntegrationError> =>
	Effect.flatMap(Deadline, (deadline) =>
		effect.pipe(
			Effect.retry({
				schedule: backoff,
				times,
				while: (error) =>
					error.retryable &&
					Date.now() + Duration.toMillis(error.retryAfter ?? 0) + 2000 <
						deadline,
			}),
		),
	);

/**
 * Gives a shell call a total time budget: attempts and Retry-After waits stop
 * at it, and the call fails when it runs out. `runIntegration` uses it.
 */
export const withTimeLimit = <A>(
	effect: Effect.Effect<A, IntegrationError>,
	timeout: Duration.Input = "30 seconds",
): Effect.Effect<A, IntegrationError> =>
	Effect.suspend(() => {
		const limit = Duration.toMillis(timeout);
		return effect.pipe(
			Effect.provideService(Deadline, Date.now() + limit),
			// Attempts already stop at the deadline with their service's own
			// message; this only catches work that ignores it.
			Effect.timeoutOrElse({
				duration: limit + 1000,
				orElse: () =>
					Effect.fail(
						new IntegrationError({
							detail: `time limit of ${limit} ms reached`,
							message:
								"Le service externe met trop de temps à répondre. Réessayez dans un instant.",
							reason: "network",
							service: "integration",
						}),
					),
			}),
		);
	});

/**
 * Called when a service refuses its key (401 or 403): someone has to create a
 * new one. The Worker entry (app/server.ts) posts it to Slack; nothing listens
 * in `pnpm integration`, which runs outside the Worker.
 */
let keyRejectedListener:
	| ((error: IntegrationError) => Promise<void>)
	| undefined;
export const onKeyRejected = (
	listener: (error: IntegrationError) => Promise<void>,
) => {
	keyRejectedListener = listener;
};

/**
 * Runs a shell call from an oRPC handler, a server function or a job. Returns
 * the result, or logs the failure and throws an `ORPCError` whose message the
 * user can read. It gives up after 30 seconds so a page never hangs on a slow
 * service; a background job can allow more: `{ timeout: "5 minutes" }`.
 */
export const runIntegration = async <A>(
	effect: Effect.Effect<A, IntegrationError>,
	options: { timeout?: Duration.Input } = {},
): Promise<A> => {
	const result = await Effect.runPromise(
		Effect.result(withTimeLimit(effect, options.timeout)),
	);
	if (Result.isSuccess(result)) {
		return result.success;
	}
	const error = result.failure;
	console.error(`[integration] ${error.service}: ${error.reason}`, {
		detail: error.detail,
		status: error.status,
	});
	if (error.reason === "unauthorized" || error.reason === "forbidden") {
		await keyRejectedListener?.(error).catch(() => {});
	}
	throw new ORPCError(ORPC_CODES[error.reason], { message: error.message });
};

/** `Authorization` header value for HTTP Basic auth. */
export const basicAuth = (username: string, password: string) =>
	`Basic ${btoa(`${username}:${password}`)}`;

interface CachedToken {
	readonly value: Promise<unknown>;
	expiresAt: number;
}

const tokens = new Map<string, CachedToken>();

/**
 * For services that trade credentials for a short-lived access token: runs
 * `use` with a token reused until a minute before it expires. Parallel calls
 * wait for the same token fetch. When the service rejects the token (401),
 * it is dropped and the call tries once more with a new one, since the key
 * itself may be fine. The cache is shared by every request the same Worker
 * instance serves: key it by all the credentials, never by the signed-in user.
 */
export const withToken = <T, A>(
	key: string,
	fetchToken: Effect.Effect<
		{ value: T; expiresInSeconds: number },
		IntegrationError
	>,
	use: (token: T) => Effect.Effect<A, IntegrationError>,
): Effect.Effect<A, IntegrationError> => {
	const current = Effect.sync(() => {
		const cached = tokens.get(key);
		if (cached && cached.expiresAt > Date.now()) {
			return cached;
		}
		// The fetch runs on its own, so a caller running out of time does not
		// cancel it for the others. Until it settles, it counts as fresh for a
		// minute at most: a fetch that never settles is not waited on forever.
		const fresh: CachedToken = {
			expiresAt: Date.now() + 60_000,
			value: Effect.runPromise(fetchToken).then(
				({ value, expiresInSeconds }) => {
					fresh.expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
					return value;
				},
			),
		};
		fresh.value.catch(() => forgetToken(key, fresh));
		tokens.set(key, fresh);
		return fresh;
	});

	const attempt = (retry: boolean): Effect.Effect<A, IntegrationError> =>
		current.pipe(
			Effect.flatMap((cached) =>
				Effect.tryPromise({
					try: () => cached.value as Promise<T>,
					catch: (error) =>
						error instanceof IntegrationError
							? error
							: new IntegrationError({
									detail: String(error),
									message: "Impossible d'obtenir un accès au service.",
									reason: "network",
									service: key.split(":")[0],
								}),
				}).pipe(
					Effect.flatMap((token) =>
						use(token).pipe(
							Effect.catchIf(
								(error) => retry && error.reason === "unauthorized",
								() =>
									Effect.suspend(() => {
										forgetToken(key, cached);
										return attempt(false);
									}),
							),
						),
					),
				),
			),
		);

	return attempt(true);
};

// Drops a token, unless a parallel call already replaced it.
const forgetToken = (key: string, entry: CachedToken) => {
	if (tokens.get(key) === entry) {
		tokens.delete(key);
	}
};

// A failing key is a server configuration problem, not the app user's session,
// so auth failures map to BAD_GATEWAY rather than UNAUTHORIZED.
const ORPC_CODES = {
	bad_request: "BAD_REQUEST",
	forbidden: "BAD_GATEWAY",
	invalid_response: "BAD_GATEWAY",
	network: "SERVICE_UNAVAILABLE",
	not_found: "NOT_FOUND",
	rate_limited: "TOO_MANY_REQUESTS",
	server_error: "BAD_GATEWAY",
	unauthorized: "BAD_GATEWAY",
} as const satisfies Record<IntegrationFailureReason, string>;

const readBody = (
	service: string,
	response: Response,
	parse: "json" | "text",
): Effect.Effect<unknown, IntegrationError> =>
	Effect.tryPromise({
		try: async () => {
			const text = await response.text();
			return parse === "json" && text ? JSON.parse(text) : text;
		},
		catch: (cause) =>
			new IntegrationError({
				detail: String(cause),
				message: `${service} a renvoyé une réponse illisible.`,
				reason: "invalid_response",
				service,
				status: response.status,
			}),
	});

const errorFromResponse = (
	service: string,
	response: Response,
	body: string,
): IntegrationError => {
	const status = response.status;
	const detail = body.slice(0, 500);
	const retryAfter = parseRetryAfter(response.headers.get("retry-after"));

	if (status === 401) {
		return new IntegrationError({
			detail,
			message: `${service} a refusé la clé d'accès. Elle est peut-être expirée ou mal copiée.`,
			reason: "unauthorized",
			service,
			status,
		});
	}
	if (status === 402 || status === 403) {
		return new IntegrationError({
			detail,
			message: `${service} refuse cet accès : la clé n'a pas les droits nécessaires, ou l'offre ne comprend pas l'API.`,
			reason: "forbidden",
			service,
			status,
		});
	}
	if (status === 404) {
		return new IntegrationError({
			detail,
			message: `${service} ne trouve pas l'élément demandé.`,
			reason: "not_found",
			service,
			status,
		});
	}
	if (status === 429) {
		return new IntegrationError({
			detail,
			message: retryAfter
				? `${service} limite le nombre d'appels. Réessayez dans ${Math.ceil(Duration.toSeconds(retryAfter))} secondes.`
				: `${service} limite le nombre d'appels. Réessayez dans un instant.`,
			reason: "rate_limited",
			retryAfter,
			service,
			status,
		});
	}
	if (status >= 500) {
		return new IntegrationError({
			detail,
			message: `${service} rencontre un problème de son côté.`,
			reason: "server_error",
			retryAfter,
			service,
			status,
		});
	}
	return new IntegrationError({
		detail,
		message: `${service} a rejeté la demande (erreur ${status}).`,
		reason: "bad_request",
		service,
		status,
	});
};

/** Retry-After is either a number of seconds or an HTTP date. */
const parseRetryAfter = (value: string | null) => {
	if (!value) {
		return undefined;
	}
	const seconds = Number(value);
	if (Number.isFinite(seconds)) {
		return Duration.seconds(Math.max(0, seconds));
	}
	const date = Date.parse(value);
	return Number.isNaN(date)
		? undefined
		: Duration.millis(Math.max(0, date - Date.now()));
};

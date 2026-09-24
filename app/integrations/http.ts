/**
 * Shared plumbing for the third-party API shells in `app/integrations/`.
 *
 * Every shell sends its calls through `request`, so they all behave the same:
 * - a timeout on each attempt (15 seconds by default);
 * - automatic retries with exponential backoff and jitter on transient
 *   failures (network errors, 429 and 5xx), honoring the `Retry-After` header;
 * - one typed error, `IntegrationError`, whose `reason` says what went wrong;
 * - response validation with Effect Schema, so a changed API fails loudly
 *   instead of returning `undefined` fields.
 *
 * Server-only: use the shells from oRPC handlers or server functions, never
 * from components, because they carry API keys. See INTEGRATIONS.md.
 */
import { ORPCError } from "@orpc/server";
import { Data, Duration, Effect, Result, Schedule, Schema } from "effect";

export type IntegrationFailureReason =
	/** 401: the key is missing, wrong, or expired. */
	| "unauthorized"
	/** 402/403: the key lacks a permission, or the plan does not include the API. */
	| "forbidden"
	/** 404: the resource does not exist, or the key cannot see it. */
	| "not_found"
	/** Other 4xx: the request itself is wrong (bad filter, bad id format...). */
	| "bad_request"
	/** 429: too many calls. Retried automatically, honoring Retry-After. */
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
	/** Per attempt. Defaults to 15 seconds. */
	readonly timeout?: Duration.Input;
	/**
	 * Retries on transient failures. Defaults to 3. Use 0 for calls that must
	 * not run twice, such as writes that are not idempotent.
	 */
	readonly retries?: number;
}

/** What a shell's private `call` method takes besides the path and schema. */
export type CallOptions = Omit<
	RequestOptions<unknown>,
	"service" | "url" | "schema"
>;

/** Longest Retry-After we are willing to wait for inside a user request. */
const MAX_RETRY_AFTER = Duration.seconds(30);

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

export const request = <A>(
	options: RequestOptions<A>,
): Effect.Effect<A, IntegrationError> => {
	const { service, json, form, parse = "json" } = options;

	const url = new URL(options.url);
	for (const [key, value] of Object.entries(options.query ?? {})) {
		if (value !== undefined && value !== null) {
			url.searchParams.set(key, String(value));
		}
	}
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
		method: options.method ?? "GET",
	};

	const attempt = Effect.tryPromise({
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
							Effect.fail(errorFromResponse(service, response, String(body))),
						),
					),
		),
		Effect.timeoutOrElse({
			duration: options.timeout ?? "15 seconds",
			orElse: () =>
				Effect.fail(
					new IntegrationError({
						message: `${service} n'a pas répondu à temps.`,
						reason: "network",
						service,
					}),
				),
		}),
	);

	return attempt.pipe(
		Effect.retry({
			schedule: backoff,
			times: options.retries ?? 3,
			while: (error) =>
				error.retryable &&
				!(
					error.retryAfter &&
					Duration.isGreaterThan(error.retryAfter, MAX_RETRY_AFTER)
				),
		}),
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
 * Runs a shell call from an oRPC handler or server function. Returns the
 * result, or logs the failure and throws an `ORPCError` whose message the
 * user can read.
 */
export const runIntegration = async <A>(
	effect: Effect.Effect<A, IntegrationError>,
): Promise<A> => {
	const result = await Effect.runPromise(Effect.result(effect));
	if (Result.isSuccess(result)) {
		return result.success;
	}
	const error = result.failure;
	console.error(`[integration] ${error.service}: ${error.reason}`, {
		detail: error.detail,
		status: error.status,
	});
	throw new ORPCError(ORPC_CODES[error.reason], { message: error.message });
};

/** `Authorization` header value for HTTP Basic auth. */
export const basicAuth = (username: string, password: string) =>
	`Basic ${btoa(`${username}:${password}`)}`;

const tokens = new Map<string, { value: unknown; expiresAt: number }>();

/**
 * For services that trade credentials for a short-lived access token: reuses
 * the token until a minute before it expires. The cache is shared by every
 * request the same Worker instance serves, so key it by the credentials,
 * never by the signed-in user.
 */
export const cachedToken = <T>(
	key: string,
	fetchToken: Effect.Effect<
		{ value: T; expiresInSeconds: number },
		IntegrationError
	>,
): Effect.Effect<T, IntegrationError> =>
	Effect.suspend(() => {
		const cached = tokens.get(key);
		if (cached && cached.expiresAt > Date.now()) {
			return Effect.succeed(cached.value as T);
		}
		return fetchToken.pipe(
			Effect.map(({ value, expiresInSeconds }) => {
				tokens.set(key, {
					expiresAt: Date.now() + (expiresInSeconds - 60) * 1000,
					value,
				});
				return value;
			}),
		);
	});

/** Drops a cached token, for example after the service rejected it. */
export const forgetToken = (key: string) => tokens.delete(key);

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
			message: `${service} limite le nombre d'appels. Réessayez dans un instant.`,
			reason: "rate_limited",
			retryAfter: parseRetryAfter(response.headers.get("retry-after")),
			service,
			status,
		});
	}
	if (status >= 500) {
		return new IntegrationError({
			detail,
			message: `${service} rencontre un problème de son côté.`,
			reason: "server_error",
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

// Checks the shared rules of app/integrations/ against a fake fetch, without
// calling any real service. Run: pnpm integration:check
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { Effect, Result, Schema } from "effect";

// The app imports files without their extension (Vite resolves them): do the
// same here, before importing the shells.
registerHooks({
	resolve: (specifier, context, next) =>
		specifier.startsWith(".") && !/\.\w+$/.test(specifier)
			? next(`${specifier}.ts`, context)
			: next(specifier, context),
});
const { IntegrationError, request, runIntegration, withTimeLimit, withToken } =
	await import("../app/integrations/http.ts");
const { signJwt } = await import("../app/integrations/google-sheets.ts");
const { Tableau } = await import("../app/integrations/tableau.ts");

let calls = 0;
const reply = (...responses: Response[]) => {
	calls = 0;
	globalThis.fetch = async () =>
		responses[Math.min(calls++, responses.length - 1)].clone();
};
const hang = () => {
	calls = 0;
	globalThis.fetch = () => {
		calls++;
		return new Promise(() => {});
	};
};
const status = (code: number, headers?: HeadersInit) =>
	new Response("error", { headers, status: code });
const run = async <A>(
	effect: Effect.Effect<A, InstanceType<typeof IntegrationError>>,
) => {
	const result = await Effect.runPromise(Effect.result(effect));
	return Result.isSuccess(result) ? result.success : result.failure;
};
const outcome = async (
	options: {
		retries?: number;
		method?: "POST";
		url?: string;
		timeout?: string;
		limit?: string;
	} = {},
) => {
	const call = request({
		method: options.method,
		retries: options.retries,
		schema: Schema.Struct({ ok: Schema.Boolean }),
		service: "Test",
		timeout: options.timeout,
		url: options.url ?? "https://api.example.test/items",
	});
	const result = await run(
		options.limit ? withTimeLimit(call, options.limit) : call,
	);
	return result instanceof IntegrationError ? result.reason : result;
};
const timed = async <A>(work: () => Promise<A>) => {
	const started = Date.now();
	const value = await work();
	return { ms: Date.now() - started, value };
};

// Transient failures are retried, then the body is decoded; extra fields are dropped.
reply(
	status(503),
	status(429, { "Retry-After": "0" }),
	Response.json({ extra: 1, ok: true }),
);
assert.deepEqual(await outcome(), { ok: true });
assert.equal(calls, 3);

// A refused key is not retried.
reply(status(401));
assert.equal(await outcome(), "unauthorized");
assert.equal(calls, 1);

// Each status maps to its reason.
for (const [code, reason] of [
	[400, "bad_request"],
	[402, "forbidden"],
	[403, "forbidden"],
	[404, "not_found"],
] as const) {
	reply(status(code));
	assert.equal(await outcome(), reason, `HTTP ${code}`);
}

// Retries stop at the limit.
reply(status(500));
assert.equal(await outcome({ retries: 1 }), "server_error");
assert.equal(calls, 2);

// Other methods are not retried unless they opt in: a write never runs twice.
reply(status(503));
assert.equal(await outcome({ method: "POST" }), "server_error");
assert.equal(calls, 1);

// A body that does not match the schema fails loudly.
reply(Response.json({ ok: "yes" }));
assert.equal(await outcome(), "invalid_response");

// An id that climbs out of the path is refused before any call.
reply(Response.json({ ok: true }));
for (const url of [
	"https://api.example.test/views/../users",
	"https://api.example.test/views/%2E%2E/users",
]) {
	assert.equal(await outcome({ url }), "bad_request", url);
}
assert.equal(calls, 0);

// A service that never answers is cut at the attempt's timeout.
hang();
const cut = await timed(() => outcome({ retries: 0, timeout: "50 millis" }));
assert.equal(cut.value, "network");
assert.ok(cut.ms < 1000, `${cut.ms} ms`);

// ... and never past the call's time limit, with the service's own message.
hang();
const limited = await timed(() =>
	run(
		withTimeLimit(
			request({
				schema: Schema.Unknown,
				service: "Test",
				url: "https://api.example.test/items",
			}),
			"300 millis",
		),
	),
);
assert.ok(limited.value instanceof IntegrationError);
assert.match(limited.value.message, /^Test /);
assert.ok(limited.ms < 1000, `${limited.ms} ms`);

// Retry-After is waited for, on a 503 too, when it fits in the time left.
reply(status(503, { "Retry-After": "1" }), Response.json({ ok: true }));
const waited = await timed(() => outcome({ limit: "1 minute" }));
assert.deepEqual(waited.value, { ok: true });
assert.ok(waited.ms >= 1000, `${waited.ms} ms`);

// Retry-After can also be an HTTP date.
reply(
	status(429, { "Retry-After": new Date(Date.now() + 2000).toUTCString() }),
	Response.json({ ok: true }),
);
const dated = await timed(() => outcome());
assert.deepEqual(dated.value, { ok: true });
assert.ok(dated.ms >= 900, `${dated.ms} ms`);

// A wait that does not fit in the time left fails at once.
reply(status(429, { "Retry-After": "120" }));
const tooLong = await timed(() => outcome({ limit: "5 seconds" }));
assert.equal(tooLong.value, "rate_limited");
assert.equal(calls, 1);
assert.ok(tooLong.ms < 1000, `${tooLong.ms} ms`);

// runIntegration gives up at its time limit, with a message for the user.
await assert.rejects(runIntegration(Effect.never, { timeout: "20 millis" }), {
	code: "SERVICE_UNAVAILABLE",
});

// withToken: a token is fetched once, shared, renewed, and replaced when refused.
const tokenService = (expiresInSeconds = 3600) => {
	let fetches = 0;
	return {
		fetches: () => fetches,
		fetchToken: Effect.sync(() => {
			fetches++;
			return { expiresInSeconds, value: `t${fetches}` };
		}),
	};
};
const refused = () =>
	Effect.fail(
		new IntegrationError({
			message: "refused",
			reason: "unauthorized",
			service: "Test",
		}),
	);

const reused = tokenService();
await run(withToken("reused", reused.fetchToken, Effect.succeed));
await run(withToken("reused", reused.fetchToken, Effect.succeed));
assert.equal(reused.fetches(), 1, "a token is reused");

const expiring = tokenService(60);
await run(withToken("expiring", expiring.fetchToken, Effect.succeed));
await run(withToken("expiring", expiring.fetchToken, Effect.succeed));
assert.equal(expiring.fetches(), 2, "a token about to expire is renewed");

const shared = tokenService();
await Promise.all(
	[1, 2, 3].map(() =>
		run(withToken("shared", shared.fetchToken, Effect.succeed)),
	),
);
assert.equal(shared.fetches(), 1, "parallel calls share one fetch");

const replaced = tokenService();
assert.equal(
	await run(
		withToken("replaced", replaced.fetchToken, (token) =>
			token === "t1" ? refused() : Effect.succeed(token),
		),
	),
	"t2",
);

const refusedTwice = tokenService();
const twice = await run(
	withToken("refused-twice", refusedTwice.fetchToken, refused),
);
assert.ok(twice instanceof IntegrationError && twice.reason === "unauthorized");
assert.equal(refusedTwice.fetches(), 2, "one refresh, then the error");

// Only a 401 replaces the token: a missing permission keeps it.
const kept = tokenService();
await run(
	withToken("kept", kept.fetchToken, () =>
		Effect.fail(
			new IntegrationError({
				message: "forbidden",
				reason: "forbidden",
				service: "Test",
			}),
		),
	),
);
assert.equal(kept.fetches(), 1, "only a 401 replaces the token");

// A late refusal of an old token does not drop the one that replaced it.
const late = tokenService();
await Promise.all(
	[0, 50].map((delay) =>
		run(
			withToken("late", late.fetchToken, (token) =>
				Effect.sleep(`${delay} millis`).pipe(
					Effect.flatMap(() =>
						token === "t1" ? refused() : Effect.succeed(token),
					),
				),
			),
		),
	),
);
assert.equal(late.fetches(), 2, "the replacement is kept");

// The Google JWT verifies with the service account's public key.
const keys = await crypto.subtle.generateKey(
	{
		hash: "SHA-256",
		modulusLength: 2048,
		name: "RSASSA-PKCS1-v1_5",
		publicExponent: new Uint8Array([1, 0, 1]),
	},
	true,
	["sign", "verify"],
);
const pkcs8 = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(pkcs8).toString("base64")}\n-----END PRIVATE KEY-----\n`;
const [header, claims, signature] = (
	await signJwt("robot@example.iam.gserviceaccount.com", pem)
).split(".");
assert.ok(
	await crypto.subtle.verify(
		"RSASSA-PKCS1-v1_5",
		keys.publicKey,
		Buffer.from(signature, "base64url"),
		new TextEncoder().encode(`${header}.${claims}`),
	),
);
assert.equal(
	JSON.parse(Buffer.from(claims, "base64url").toString()).aud,
	"https://oauth2.googleapis.com/token",
);

// Tableau: parallel views share one sign-in, and a session ended elsewhere
// is replaced once.
const seen: string[] = [];
let dataCalls = 0;
globalThis.fetch = async (input) => {
	if (String(input).endsWith("/auth/signin")) {
		seen.push("signin");
		return Response.json({
			credentials: { site: { id: "site" }, token: "token" },
		});
	}
	seen.push("data");
	dataCalls++;
	return dataCalls === 3 ? status(401) : new Response("Region,Sales\nFR,1");
};
const tableau = Tableau.init({
	host: "tableau.example.test/#/site/demo/home",
	site: "",
	tokenName: "name",
	tokenSecret: "secret",
});
await Promise.all([
	Effect.runPromise(tableau.getViewData("a")),
	Effect.runPromise(tableau.getViewData("b")),
]);
assert.deepEqual(seen, ["signin", "data", "data"]);
assert.equal(
	await Effect.runPromise(tableau.getViewData("c")),
	"Region,Sales\nFR,1",
);
assert.deepEqual(seen, ["signin", "data", "data", "data", "signin", "data"]);

console.log("integrations: ok");

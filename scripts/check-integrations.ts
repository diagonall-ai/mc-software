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
const { request } = await import("../app/integrations/http.ts");
const { signJwt } = await import("../app/integrations/google-sheets.ts");
const { Tableau } = await import("../app/integrations/tableau.ts");

let calls = 0;
const reply = (...responses: Response[]) => {
	calls = 0;
	globalThis.fetch = async () =>
		responses[Math.min(calls++, responses.length - 1)].clone();
};
const outcome = async (retries?: number) => {
	const result = await Effect.runPromise(
		Effect.result(
			request({
				retries,
				schema: Schema.Struct({ ok: Schema.Boolean }),
				service: "Test",
				url: "https://api.example.test/items",
			}),
		),
	);
	return Result.isSuccess(result) ? result.success : result.failure.reason;
};
const status = (code: number, headers?: HeadersInit) =>
	new Response("error", { headers, status: code });

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

// A Retry-After too long to wait for inside a request fails at once.
reply(status(429, { "Retry-After": "120" }));
assert.equal(await outcome(), "rate_limited");
assert.equal(calls, 1);

// Retries stop at the limit.
reply(status(500));
assert.equal(await outcome(1), "server_error");
assert.equal(calls, 2);

// A body that does not match the schema fails loudly.
reply(Response.json({ ok: "yes" }));
assert.equal(await outcome(), "invalid_response");

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

// Tableau signs in again, once, when its session was ended elsewhere.
const seen: string[] = [];
globalThis.fetch = async (input) => {
	if (String(input).endsWith("/auth/signin")) {
		seen.push("signin");
		return Response.json({
			credentials: { site: { id: "site" }, token: "token" },
		});
	}
	seen.push("data");
	return seen.length === 2 ? status(401) : new Response("Region,Sales\nFR,1");
};
const tableau = Tableau.init({
	host: "https://tableau.example.test",
	site: "",
	tokenName: "name",
	tokenSecret: "secret",
});
assert.equal(
	await Effect.runPromise(tableau.getViewData("view")),
	"Region,Sales\nFR,1",
);
assert.deepEqual(seen, ["signin", "data", "signin", "data"]);

console.log("integrations: ok");

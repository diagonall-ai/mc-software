// End-to-end check of the REST API and the MCP server, the way real clients
// (Claude Code, Codex, Cursor) use them, on both MCP protocol generations:
// 2025 (SDK v1, older clients) and 2026-07-28 (SDK v2). It covers API keys in
// both headers, the full OAuth flow (sign-in page, consent, refresh token),
// and clean 401s for bad credentials. It creates a temporary API key for the
// account and deletes it at the end.
//
//   pnpm smoke                                   # local dev, seed account
//   EMAIL=you@x.com PASSWORD=... pnpm smoke https://your-app.workers.dev

import {
	Client as ClientV2,
	StreamableHTTPClientTransport as TransportV2,
	UnauthorizedError as UnauthorizedV2,
} from "@modelcontextprotocol/client";
import { UnauthorizedError as UnauthorizedV1 } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client as ClientV1 } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as TransportV1 } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ERAS = [
	{
		name: "2025 protocol",
		Client: ClientV1,
		Transport: TransportV1,
		Unauthorized: UnauthorizedV1,
		options: {},
		finishAuthArgument: (callback) => callback.searchParams.get("code"),
	},
	{
		name: "2026-07-28 protocol",
		Client: ClientV2,
		Transport: TransportV2,
		Unauthorized: UnauthorizedV2,
		options: { versionNegotiation: { mode: { pin: "2026-07-28" } } },
		finishAuthArgument: (callback) => callback.searchParams,
	},
];
const newClient = (era) =>
	new era.Client({ name: "smoke-test", version: "1.0.0" }, era.options);
const eraOf = (client) =>
	client.getNegotiatedProtocolVersion?.() ?? "2025 (SDK v1)";

const BASE = process.argv[2] || "http://localhost:3934";
const EMAIL = process.env.EMAIL || "test@test.com";
const PASSWORD = process.env.PASSWORD || "testtest";
let failures = 0;

function check(name, pass, detail = "") {
	console.log(
		`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`,
	);
	if (!pass) failures++;
}
const text = (result) =>
	(result?.content ?? [])
		.map((c) => c.text ?? "")
		.join(" ")
		.replace(/\s+/g, " ");
const short = (value, n = 140) => String(value).slice(0, n);

async function signIn() {
	const r = await fetch(`${BASE}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
	});
	const cookie = r.headers
		.getSetCookie()
		.map((c) => c.split(";")[0])
		.join("; ");
	check("sign in with the test account", r.ok && cookie.length > 0, r.status);
	return cookie;
}

async function authJson(path, cookie, body) {
	const r = await fetch(`${BASE}/api/auth${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE, cookie },
		body: JSON.stringify(body),
	});
	return { status: r.status, data: await r.json().catch(() => null) };
}

async function testRest(key) {
	let r = await fetch(`${BASE}/api/openapi.json`);
	const spec = await r.json().catch(() => null);
	check(
		"OpenAPI spec is served",
		r.ok && !!spec?.paths,
		spec ? Object.keys(spec.paths).join(", ") : r.status,
	);
	r = await fetch(`${BASE}/api/docs`);
	check(
		"API reference page loads",
		r.ok && (r.headers.get("content-type") || "").includes("html"),
		r.status,
	);
	r = await fetch(`${BASE}/api/profile`);
	check("API refuses a call without credentials", r.status === 401, r.status);
	r = await fetch(`${BASE}/api/profile`, {
		headers: { authorization: "Bearer bd_not_a_real_key" },
	});
	check("API refuses a wrong key (Bearer)", r.status === 401, r.status);
	r = await fetch(`${BASE}/api/profile`, {
		headers: { "x-api-key": "bd_not_a_real_key" },
	});
	check("API refuses a wrong key (x-api-key)", r.status === 401, r.status);
	r = await fetch(`${BASE}/api/profile`, { headers: { "x-api-key": key } });
	let body = await r.json().catch(() => null);
	check(
		"API accepts the key in x-api-key",
		r.ok,
		`${r.status} ${short(JSON.stringify(body), 90)}`,
	);
	r = await fetch(`${BASE}/api/profile`, {
		headers: { authorization: `Bearer ${key}` },
	});
	check("API accepts the key as Authorization: Bearer", r.ok, r.status);
	const current = await (
		await fetch(`${BASE}/api/profile`, {
			headers: { authorization: `Bearer ${key}` },
		})
	).json();
	r = await fetch(`${BASE}/api/profile`, {
		method: "PATCH",
		headers: {
			authorization: `Bearer ${key}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			name: current.name,
			username: current.username ?? "",
			bio: current.bio ?? "",
		}),
	});
	body = await r.json().catch(() => null);
	check(
		"API PATCH with a JSON body",
		r.ok,
		`${r.status} ${short(JSON.stringify(body), 90)}`,
	);
	r = await fetch(`${BASE}/api/profile`, {
		method: "PATCH",
		headers: {
			authorization: `Bearer ${key}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ name: "x".repeat(81), username: "", bio: "" }),
	});
	body = await r.json().catch(() => null);
	check(
		"API rejects invalid input with 400 and a reason",
		r.status === 400,
		`${r.status} ${short(JSON.stringify(body), 90)}`,
	);
}

async function connect(era, label, options) {
	const client = newClient(era);
	await client.connect(new era.Transport(new URL(`${BASE}/api/mcp`), options));
	const { tools } = await client.listTools();
	check(
		`MCP connects with ${label} (${era.name})`,
		tools.length > 0,
		`${eraOf(client)}: ${tools.map((t) => t.name).join(", ")}`,
	);
	return client;
}

async function exerciseTools(client, label) {
	const { tools } = await client.listTools();
	const profileTool = tools.find((tool) => tool.name === "get_my_profile");
	check(
		`MCP lists the app tools, read-only ones marked (${label})`,
		profileTool?.annotations?.readOnlyHint === true &&
			tools.some((tool) => tool.name === "update_my_profile"),
		tools.map((tool) => tool.name).join(", "),
	);
	const get = await client.callTool({ name: "get_my_profile", arguments: {} });
	check(
		`MCP get_my_profile returns the profile (${label})`,
		!get.isError && /email/i.test(text(get)),
		short(text(get)),
	);
	const profile = JSON.parse(text(get));
	const update = await client.callTool({
		name: "update_my_profile",
		arguments: {
			name: profile.name,
			username: profile.username ?? "",
			bio: profile.bio ?? "",
		},
	});
	check(
		`MCP update_my_profile saves (${label})`,
		!update.isError && /email/i.test(text(update)),
		short(text(update)),
	);
	const rejected = await client.callTool({
		name: "update_my_profile",
		arguments: { name: profile.name, username: "x", bio: "" },
	});
	check(
		`MCP tool errors reach the assistant as text (${label})`,
		rejected.isError === true && /username/i.test(text(rejected)),
		short(text(rejected)),
	);
}

async function testMcpAnonymous() {
	const r = await fetch(`${BASE}/api/mcp`, { method: "POST" });
	const header = r.headers.get("www-authenticate") || "";
	check(
		"MCP without credentials answers 401 and points to OAuth",
		r.status === 401 && header.includes("resource_metadata="),
		`${r.status} ${header}`,
	);
	for (const [label, headers] of [
		["a wrong API key", { authorization: "Bearer bd_not_a_real_key" }],
		["a wrong x-api-key", { "x-api-key": "bd_not_a_real_key" }],
		[
			"an expired OAuth token",
			{ authorization: "Bearer expired-or-unknown-token" },
		],
	]) {
		const res = await fetch(`${BASE}/api/mcp`, { method: "POST", headers });
		check(
			`MCP answers 401 to ${label}, so the client signs in again`,
			res.status === 401,
			res.status,
		);
	}
	const resource = await fetch(
		`${BASE}/.well-known/oauth-protected-resource/api/mcp`,
	)
		.then((x) => x.json())
		.catch(() => null);
	check(
		"OAuth protected-resource metadata names the MCP resource",
		resource?.resource === `${BASE}/api/mcp` &&
			!!resource?.authorization_servers?.length,
		JSON.stringify(resource?.authorization_servers),
	);
	const server = await fetch(
		`${BASE}/.well-known/oauth-authorization-server/api/auth`,
	)
		.then((x) => x.json())
		.catch(() => null);
	check(
		"OAuth server metadata offers CIMD, registration, and offline_access",
		server?.client_id_metadata_document_supported === true &&
			!!server?.registration_endpoint &&
			server?.scopes_supported?.includes("offline_access"),
		short(`${server?.authorization_endpoint} ${server?.token_endpoint}`, 160),
	);
	return server;
}

// Follows a link the way a browser tab does (Better Auth answers fetch() calls
// with JSON instead of a redirect). Returns where the page sends the user.
async function navigate(url, cookie) {
	const r = await fetch(url, {
		redirect: "manual",
		headers: { "sec-fetch-mode": "navigate", ...(cookie ? { cookie } : {}) },
	});
	if (r.status >= 300 && r.status < 400) return r.headers.get("location") ?? "";
	const body = await r.json().catch(() => null);
	return body?.url ?? `(status ${r.status})`;
}

// Walks the OAuth flow the way Claude Code or Cursor does, with a test
// browser: discovery, client registration, sign-in page, consent, tokens.
async function testMcpOAuth(era, cookie, server) {
	const redirectUrl = "http://localhost:33418/callback";
	const store = {};
	const provider = {
		get redirectUrl() {
			return redirectUrl;
		},
		get clientMetadata() {
			return {
				client_name: `Smoke test (${era.name})`,
				redirect_uris: [redirectUrl],
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
				token_endpoint_auth_method: "none",
			};
		},
		clientInformation: () => store.client,
		saveClientInformation: (info) => {
			store.client = info;
		},
		tokens: () => store.tokens,
		saveTokens: (tokens) => {
			store.tokens = tokens;
		},
		redirectToAuthorization: (url) => {
			store.authorizationUrl = url;
		},
		saveCodeVerifier: (verifier) => {
			store.verifier = verifier;
		},
		codeVerifier: () => store.verifier,
	};
	const tag = `(${era.name})`;

	let transport = new era.Transport(new URL(`${BASE}/api/mcp`), {
		authProvider: provider,
	});
	try {
		await newClient(era).connect(transport);
		check(`MCP client is asked to sign in ${tag}`, false, "connected");
		return;
	} catch (error) {
		check(
			`MCP client discovers OAuth and registers itself ${tag}`,
			error instanceof era.Unauthorized &&
				!!store.authorizationUrl &&
				!!store.client?.client_id,
			`${error.constructor.name}; client_id=${store.client?.client_id}`,
		);
	}
	if (!store.authorizationUrl) return;

	const signInPage = await navigate(store.authorizationUrl);
	check(
		`Authorize while signed out opens the sign-in page ${tag}`,
		signInPage.includes("/mcp/login"),
		short(signInPage, 70),
	);

	// Signing in on that page resumes the authorization: the page sends its
	// signed query along (oauthProviderClient) and follows the answer.
	const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: BASE },
		body: JSON.stringify({
			email: EMAIL,
			password: PASSWORD,
			oauth_query: new URL(signInPage, BASE).search.slice(1),
		}),
	});
	const signedIn = await signIn.json().catch(() => null);
	let location = signedIn?.redirect ? (signedIn.url ?? "") : "";
	check(
		`Signing in there resumes the authorization ${tag}`,
		location.includes("/mcp/consent") || location.startsWith(redirectUrl),
		short(location, 70),
	);
	if (location.includes("/mcp/consent")) {
		check(`First connection asks for consent ${tag}`, true);
		const consent = await fetch(`${BASE}/api/auth/oauth2/consent`, {
			method: "POST",
			headers: {
				accept: "application/json",
				"content-type": "application/json",
				origin: BASE,
				cookie,
			},
			body: JSON.stringify({
				accept: true,
				oauth_query: new URL(location, BASE).search.slice(1),
			}),
		});
		const body = await consent.json().catch(() => null);
		location = body?.url ?? "";
	}
	const callback = location.startsWith(redirectUrl) ? new URL(location) : null;
	check(
		`Approving returns a code to the client ${tag}`,
		!!callback?.searchParams.get("code"),
		short(location, 90),
	);
	if (!callback) return;

	await transport.finishAuth(era.finishAuthArgument(callback));
	check(
		`Client gets an access token and a refresh token ${tag}`,
		!!store.tokens?.access_token && !!store.tokens?.refresh_token,
		`scope="${store.tokens?.scope}", expires_in=${store.tokens?.expires_in}s`,
	);
	if (store.tokens?.refresh_token) {
		const refreshed = await fetch(server.token_endpoint, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: store.tokens.refresh_token,
				client_id: store.client.client_id,
			}),
		});
		const body = await refreshed.json().catch(() => null);
		check(
			`Refresh token returns a new access token ${tag}`,
			refreshed.ok && !!body?.access_token,
			refreshed.status,
		);
		if (body?.access_token) store.tokens = { ...store.tokens, ...body };
	}

	transport = new era.Transport(new URL(`${BASE}/api/mcp`), {
		authProvider: provider,
	});
	const client = newClient(era);
	await client.connect(transport);
	const { tools } = await client.listTools();
	check(
		`MCP connects with the OAuth access token ${tag}`,
		tools.length > 0,
		`${eraOf(client)}: ${tools.map((t) => t.name).join(", ")}`,
	);
	await exerciseTools(client, `OAuth ${era.name}`);
	await client.close();
}

async function main() {
	console.log(`Testing ${BASE}\n`);
	const cookie = await signIn();
	const created = await authJson("/api-key/create", cookie, {
		name: "smoke-test",
	});
	const key = created.data?.key;
	check(
		"create an API key",
		typeof key === "string" && key.startsWith("bd_"),
		`${created.status} ${key ? `${key.slice(0, 6)}...` : JSON.stringify(created.data)}`,
	);

	console.log("\n-- REST API");
	await testRest(key);

	console.log("\n-- MCP OAuth discovery and bad credentials");
	const server = await testMcpAnonymous();

	for (const era of ERAS) {
		console.log(`\n-- MCP with an API key (${era.name})`);
		for (const [label, headers] of [
			["Authorization: Bearer <API key>", { authorization: `Bearer ${key}` }],
			["x-api-key: <API key>", { "x-api-key": key }],
		]) {
			try {
				const client = await connect(era, label, { requestInit: { headers } });
				await exerciseTools(client, `${label.split(":")[0]} ${era.name}`);
				await client.close();
			} catch (error) {
				check(
					`MCP connects with ${label} (${era.name})`,
					false,
					short(error.message),
				);
			}
		}

		console.log(`\n-- MCP OAuth, what Claude Code and Cursor do (${era.name})`);
		try {
			await testMcpOAuth(era, cookie, server);
		} catch (error) {
			check(`OAuth flow (${era.name})`, false, short(error.stack, 300));
		}
	}

	if (created.data?.id) {
		const removed = await authJson("/api-key/delete", cookie, {
			keyId: created.data.id,
		});
		check(
			"clean up: delete the test API key",
			removed.status === 200,
			removed.status,
		);
	}
	console.log(
		`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

await main();

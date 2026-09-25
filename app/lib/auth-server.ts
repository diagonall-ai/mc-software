import { env } from "cloudflare:workers";
import { Buffer } from "node:buffer";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { db } from "~/db/client";
import * as schema from "~/db/schema";

// Without SITE_URL (a fresh deploy), Better Auth takes the base URL from each
// request, so the app trusts its own address, whatever workers.dev name it got.
function getSiteUrl() {
	const configuredUrl = env.SITE_URL?.trim().replace(/\/+$/, "");
	// Ignore a value that is not a URL (the schema generator stubs env).
	return configuredUrl && URL.canParse(configuredUrl)
		? configuredUrl
		: undefined;
}

function getTrustedOrigins(siteUrl: string | undefined) {
	const origins = ["http://localhost:*", "http://127.0.0.1:*"];
	if (siteUrl) {
		origins.push(siteUrl);
	}
	const configuredOrigins = env.TRUSTED_ORIGINS?.split(",") ?? [];
	for (const origin of configuredOrigins) {
		const trimmedOrigin = origin.trim();
		if (trimmedOrigin) {
			origins.push(trimmedOrigin);
		}
	}

	return Array.from(new Set(origins));
}

// MCP clients that predate `application_type` (older Claude Code, the MCP
// Inspector, SDK v1) register http://localhost or app-scheme callbacks, which
// Better Auth accepts only from native apps. A client whose callbacks are all
// local or app schemes is a native app, so it is registered as one.
function withNativeApplicationType(body: unknown) {
	if (!body || typeof body !== "object" || "application_type" in body) {
		return;
	}
	const redirectUris = (body as { redirect_uris?: unknown }).redirect_uris;
	const isNativeApp =
		Array.isArray(redirectUris) &&
		redirectUris.length > 0 &&
		redirectUris.every((uri) => !String(uri).startsWith("https:"));
	return isNativeApp ? { ...body, application_type: "native" } : undefined;
}

// Better Auth's own hash format and parameters on native scrypt: its pure-JS
// default, which Workers get, can overrun the free plan's CPU budget.
const SCRYPT = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 };
const deriveKey = (password: string, salt: string) =>
	scryptSync(password.normalize("NFKC"), salt, 64, SCRYPT);

const siteUrl = getSiteUrl();

// MCP OAuth binds every token to one fixed resource URL, so it relies on
// SITE_URL. Without it (a first deploy), API keys still work and OAuth starts
// working once SITE_URL is set. The plugins stay registered either way so the
// schema generator always sees their tables.
const oauthOrigin = siteUrl ?? "http://localhost:3934";
export const MCP_RESOURCE = `${oauthOrigin}/api/mcp`;
export const MCP_ISSUER = `${oauthOrigin}/api/auth`;

// Fetches Client ID Metadata Documents, the MCP 2026 way for a client to
// identify itself with a URL. The Node transport pins DNS answers to keep
// requests off private networks; Workers cannot pin, but their requests only
// reach the public internet. HTTPS, GET and HEAD only, redirects not followed.
async function fetchClientMetadataResource(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const request = new Request(input, init);
	const { hostname, protocol } = new URL(request.url);
	const isIpOrLocal = hostname === "localhost" || /^[\d.]+$|:/.test(hostname);
	if (protocol !== "https:" || isIpOrLocal) {
		throw new TypeError("Client metadata must come from a public HTTPS host");
	}
	if (request.method !== "GET" && request.method !== "HEAD") {
		throw new TypeError("Client metadata is fetched with GET or HEAD only");
	}
	return fetch(request, { redirect: "manual" });
}

export const authServer = betterAuth({
	baseURL: siteUrl,
	// The JWT plugin's session-to-JWT endpoint is unused: OAuth issues tokens.
	disabledPaths: ["/token"],
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		password: {
			hash: async (password) => {
				const salt = randomBytes(16).toString("hex");
				return `${salt}:${deriveKey(password, salt).toString("hex")}`;
			},
			verify: async ({ hash, password }) => {
				const [salt, key] = hash.split(":");
				const expected = Buffer.from(key ?? "", "hex");
				if (!salt || expected.length !== 64) {
					return false;
				}
				return timingSafeEqual(deriveKey(password, salt), expected);
			},
		},
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path === "/oauth2/register") {
				const body = withNativeApplicationType(ctx.body);
				return body ? { context: { ...ctx, body } } : undefined;
			}
			if (ctx.path !== "/sign-up/email") {
				return;
			}

			// The invitation code is the only gate: without one, sign-up stays closed.
			const invitationCode = env.SUPER_ADMIN_SIGNUP_PASSWORD?.trim();
			const providedCode = ctx.headers?.get("x-super-admin-password");
			if (!invitationCode || providedCode !== invitationCode) {
				throw new APIError("FORBIDDEN", {
					message: "Code d'invitation incorrect.",
				});
			}
		}),
	},
	plugins: [
		apiKey({
			apiKeyHeaders: "x-api-key",
			defaultPrefix: "bd_",
			deferUpdates: true,
			enableSessionForAPIKeys: true,
			rateLimit: {
				enabled: false,
			},
		}),
		// An explicit issuer: without SITE_URL (a first deploy) the OAuth provider
		// would find no base URL at startup and take all sign-ins down with it.
		jwt({ jwt: { issuer: MCP_ISSUER } }),
		mcp({
			loginPage: "/mcp/login",
			consentPage: "/mcp/consent",
			// Lets the sign-in page name the app asking for access.
			allowPublicClientPrelogin: true,
			resource: MCP_RESOURCE,
			scopes: ["openid", "profile", "email", "offline_access"],
			// Clients that predate Client ID Metadata Documents register themselves.
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
		}),
		cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
	],
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: getTrustedOrigins(siteUrl),
	user: {
		additionalFields: {
			bio: {
				required: false,
				type: "string",
			},
			username: {
				required: false,
				type: "string",
				unique: true,
			},
		},
	},
});

export const auth = authServer;

export const handler = async (request: Request): Promise<Response> => {
	try {
		return await authServer.handler(request);
	} catch (err) {
		console.error("[auth-handler] caught error:", err);
		return Response.json(
			{ error: { message: "Auth service unavailable" } },
			{ status: 502 },
		);
	}
};

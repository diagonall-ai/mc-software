import { env } from "cloudflare:workers";
import { Buffer } from "node:buffer";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { mcp } from "better-auth/plugins";
import { db } from "~/db/client";
import * as schema from "~/db/schema";

// Without SITE_URL (a fresh deploy), Better Auth takes the base URL from each
// request, so the app trusts its own address, whatever workers.dev name it got.
function getSiteUrl() {
	const configuredUrl = env.SITE_URL?.trim().replace(/\/+$/, "");
	return configuredUrl || undefined;
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

// Better Auth's own hash format and parameters on native scrypt: its pure-JS
// default, which Workers get, can overrun the free plan's CPU budget.
const SCRYPT = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 };
const deriveKey = (password: string, salt: string) =>
	scryptSync(password.normalize("NFKC"), salt, 64, SCRYPT);

const siteUrl = getSiteUrl();

export const authServer = betterAuth({
	baseURL: siteUrl,
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
		mcp({
			loginPage: "/mcp/login",
		}),
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

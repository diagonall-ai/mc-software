import { env } from "cloudflare:workers";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { mcp } from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { db } from "~/db/client";
import * as schema from "~/db/schema";

function getSiteUrl() {
	const configuredUrl = env.SITE_URL ?? import.meta.env.VITE_SITE_URL;
	if (typeof configuredUrl === "string" && configuredUrl.trim()) {
		return configuredUrl.trim().replace(/\/+$/, "");
	}

	return "http://localhost:3934";
}

function getTrustedOrigins(siteUrl: string) {
	const origins = [siteUrl, "http://localhost:*", "http://127.0.0.1:*"];
	const configuredOrigins = env.TRUSTED_ORIGINS?.split(",") ?? [];
	for (const origin of configuredOrigins) {
		const trimmedOrigin = origin.trim();
		if (trimmedOrigin) {
			origins.push(trimmedOrigin);
		}
	}

	return Array.from(new Set(origins));
}

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
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/sign-up/email") {
				return;
			}

			const superAdminPassword = env.SUPER_ADMIN_SIGNUP_PASSWORD;
			if (!superAdminPassword) {
				return;
			}

			const providedPassword = ctx.headers?.get("x-super-admin-password");
			if (providedPassword !== superAdminPassword) {
				throw new APIError("FORBIDDEN", {
					message: "Invalid super admin password",
				});
			}
		}),
	},
	plugins: [
		organization({
			allowUserToCreateOrganization: true,
		}),
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

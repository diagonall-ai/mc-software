#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEFAULTS = {
	email: "test@test.com",
	name: "test",
	password: "testtest",
	siteUrl: "http://localhost:3934",
};

class CookieJar {
	#cookies = new Map();

	store(response) {
		for (const cookie of getSetCookieHeaders(response.headers)) {
			const [pair] = cookie.split(";");
			const separatorIndex = pair.indexOf("=");
			if (separatorIndex === -1) {
				continue;
			}
			this.#cookies.set(
				pair.slice(0, separatorIndex),
				pair.slice(separatorIndex + 1),
			);
		}
	}

	header() {
		return Array.from(this.#cookies.entries())
			.map(([key, value]) => `${key}=${value}`)
			.join("; ");
	}
}

class AuthHttpError extends Error {
	constructor(result, fallback) {
		super(readErrorMessage(result.data, fallback));
		this.data = result.data;
		this.status = result.response.status;
	}
}

function getSetCookieHeaders(headers) {
	if (typeof headers.getSetCookie === "function") {
		return headers.getSetCookie();
	}

	const value = headers.get("set-cookie");
	if (!value) {
		return [];
	}

	return value
		.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g)
		.map((cookie) => cookie.trim());
}

function readDotEnv(relativePath) {
	const fullPath = path.join(ROOT, relativePath);
	if (!existsSync(fullPath)) {
		return {};
	}

	const values = {};
	for (const line of readFileSync(fullPath, "utf8").split(/\r?\n/)) {
		const trimmedLine = line.trim();
		if (!trimmedLine || trimmedLine.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmedLine.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmedLine.slice(0, separatorIndex).trim();
		const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
		values[key] = stripOptionalQuotes(rawValue);
	}

	return values;
}

function stripOptionalQuotes(value) {
	const quote = value[0];
	if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
		return value.slice(1, -1);
	}
	return value;
}

function parseArgs(envValues) {
	const args = {
		allowRemote: false,
		email: DEFAULTS.email,
		name: DEFAULTS.name,
		password: DEFAULTS.password,
		siteUrl: envValues.SITE_URL ?? DEFAULTS.siteUrl,
	};

	for (let index = 2; index < process.argv.length; index += 1) {
		const arg = process.argv[index];
		if (arg === "--allow-remote") {
			args.allowRemote = true;
			continue;
		}

		const key = arg?.startsWith("--") ? arg.slice(2) : "";
		if (!["email", "name", "password", "site-url"].includes(key)) {
			throw new Error(`Unknown seed option: ${arg}`);
		}

		const value = process.argv[index + 1];
		if (!value) {
			throw new Error(`Missing value for ${arg}`);
		}
		index += 1;

		if (key === "site-url") {
			args.siteUrl = value;
		} else {
			args[key] = value;
		}
	}

	args.siteUrl = args.siteUrl.replace(/\/+$/, "");
	return args;
}

function assertSafeSiteUrl(siteUrl, allowRemote) {
	const url = new URL(siteUrl);
	const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);
	if (allowedHosts.has(url.hostname) || allowRemote) {
		return;
	}

	throw new Error(
		`Refusing to seed non-local origin ${url.origin}. Pass --allow-remote only if you intentionally want to seed that environment.`,
	);
}

async function authFetch(siteUrl, jar, pathName, init = {}) {
	const headers = new Headers(init.headers ?? {});
	if (!headers.has("Origin")) {
		headers.set("Origin", siteUrl);
	}
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const cookieHeader = jar.header();
	if (cookieHeader) {
		headers.set("Cookie", cookieHeader);
	}

	const response = await fetch(`${siteUrl}${pathName}`, {
		...init,
		body:
			init.body && typeof init.body !== "string"
				? JSON.stringify(init.body)
				: init.body,
		headers,
		redirect: init.redirect ?? "manual",
	});
	jar.store(response);

	const text = await response.text();
	let data = null;
	if (text) {
		try {
			data = JSON.parse(text);
		} catch (_error) {
			data = text;
		}
	}

	return { data, response, text };
}

function readErrorMessage(data, fallback) {
	if (typeof data === "string") {
		return data;
	}

	if (data && typeof data === "object") {
		const record = data;
		const error = record.error;
		if (typeof error === "string") {
			return error;
		}
		if (
			error &&
			typeof error === "object" &&
			typeof error.message === "string"
		) {
			return error.message;
		}
		if (typeof record.message === "string") {
			return record.message;
		}
	}

	return fallback;
}

function isConflictError(result) {
	const message = readErrorMessage(result.data, "").toLowerCase();
	return (
		result.response.status === 400 &&
		(message.includes("already") ||
			message.includes("exist") ||
			message.includes("taken"))
	);
}

function isRecoverableSignInError(error) {
	if (!(error instanceof AuthHttpError)) {
		return false;
	}

	return error.status === 400 || error.status === 401 || error.status === 403;
}

async function signIn(siteUrl, jar, email, password) {
	const result = await authFetch(siteUrl, jar, "/api/auth/sign-in/email", {
		body: { email, password },
		method: "POST",
	});

	if (!result.response.ok) {
		throw new AuthHttpError(result, "Sign-in failed");
	}
}

async function signUp(siteUrl, jar, args, superAdminPassword) {
	const headers = {};
	if (superAdminPassword) {
		headers["x-super-admin-password"] = superAdminPassword;
	}

	return authFetch(siteUrl, jar, "/api/auth/sign-up/email", {
		body: {
			email: args.email,
			name: args.name,
			password: args.password,
		},
		headers,
		method: "POST",
	});
}

async function main() {
	const envValues = { ...readDotEnv(".dev.vars"), ...process.env };
	const args = parseArgs(envValues);
	assertSafeSiteUrl(args.siteUrl, args.allowRemote);
	const jar = new CookieJar();

	try {
		await signIn(args.siteUrl, jar, args.email, args.password);
		console.log(`Signed in existing dev user ${args.email}`);
	} catch (error) {
		if (!isRecoverableSignInError(error)) {
			throw error;
		}

		const signUpResult = await signUp(
			args.siteUrl,
			jar,
			args,
			envValues.SUPER_ADMIN_SIGNUP_PASSWORD,
		);
		if (!signUpResult.response.ok) {
			if (!isConflictError(signUpResult)) {
				throw new Error(
					readErrorMessage(signUpResult.data, "Dev user signup failed"),
				);
			}
			await signIn(args.siteUrl, jar, args.email, args.password);
			console.log(`Signed in existing dev user ${args.email}`);
		} else {
			console.log(`Created dev user ${args.email}`);
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

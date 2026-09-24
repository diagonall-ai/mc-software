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

function getPersonalOrganizationName(name, email) {
	const label = normalizeLabel(name) ?? emailLabel(email);
	return `${toPossessive(label)} Organization`;
}

function getPersonalOrganizationSlugBase(name, email) {
	const label = normalizeLabel(name) ?? emailLabel(email);
	return `${toOrganizationSlug(label)}-organization`;
}

function normalizeLabel(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function emailLabel(email) {
	const localPart = email?.split("@")[0] ?? "personal";
	const cleaned = localPart.replace(/[._-]+/g, " ").trim();
	return cleaned || "Personal";
}

function toPossessive(value) {
	return value.endsWith("s") ? `${value}'` : `${value}'s`;
}

function toOrganizationSlug(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

function getSlugCandidate(baseSlug, suffix) {
	if (suffix === 0) {
		return baseSlug;
	}
	return `${baseSlug}-${suffix + 1}`;
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

function extractOrganizations(data) {
	if (Array.isArray(data)) {
		return data;
	}

	if (data && typeof data === "object" && Array.isArray(data.data)) {
		return data.data;
	}

	return [];
}

function readString(value, key) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const fieldValue = value[key];
	return typeof fieldValue === "string" ? fieldValue : null;
}

async function setActiveOrganization(siteUrl, jar, organizationId) {
	const result = await authFetch(
		siteUrl,
		jar,
		"/api/auth/organization/set-active",
		{
			body: { organizationId },
			method: "POST",
		},
	);
	if (!result.response.ok) {
		throw new Error(
			readErrorMessage(result.data, "Failed to set active organization"),
		);
	}
}

async function ensureOrganization(siteUrl, jar, args) {
	const listResult = await authFetch(
		siteUrl,
		jar,
		"/api/auth/organization/list",
	);
	if (!listResult.response.ok) {
		throw new Error(
			readErrorMessage(listResult.data, "Failed to list organizations"),
		);
	}

	const organizations = extractOrganizations(listResult.data);
	const [firstOrganization] = organizations;
	const firstOrganizationId = readString(firstOrganization, "id");
	if (firstOrganizationId) {
		await setActiveOrganization(siteUrl, jar, firstOrganizationId);
		return { created: false, id: firstOrganizationId };
	}

	return createOrganization(siteUrl, jar, args);
}

async function createOrganization(siteUrl, jar, args) {
	const name = getPersonalOrganizationName(args.name, args.email);
	const baseSlug = getPersonalOrganizationSlugBase(args.name, args.email);

	for (let suffix = 0; suffix < 100; suffix += 1) {
		const slug = getSlugCandidate(baseSlug, suffix);
		const checkResult = await authFetch(
			siteUrl,
			jar,
			"/api/auth/organization/check-slug",
			{
				body: { slug },
				method: "POST",
			},
		);
		if (!checkResult.response.ok) {
			continue;
		}

		const createResult = await authFetch(
			siteUrl,
			jar,
			"/api/auth/organization/create",
			{
				body: {
					keepCurrentActiveOrganization: false,
					name,
					slug,
				},
				method: "POST",
			},
		);
		if (!createResult.response.ok) {
			if (isConflictError(createResult)) {
				continue;
			}
			throw new Error(
				readErrorMessage(createResult.data, "Failed to create organization"),
			);
		}

		const organizationId = readString(createResult.data, "id");
		if (!organizationId) {
			throw new Error("Organization was created without an id in the response");
		}

		return { created: true, id: organizationId, slug };
	}

	throw new Error("Failed to find an available organization slug");
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

	const organization = await ensureOrganization(args.siteUrl, jar, args);
	console.log(
		organization.created
			? `Created and activated organization ${organization.id}`
			: `Activated existing organization ${organization.id}`,
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

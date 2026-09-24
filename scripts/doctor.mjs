#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const REQUIRED_ENV_KEYS = [
	"BETTER_AUTH_SECRET",
	"SUPER_ADMIN_SIGNUP_PASSWORD",
	"SITE_URL",
	"TRUSTED_ORIGINS",
];

const checks = [];

function pass(message) {
	checks.push({ level: "pass", message });
}

function warn(message) {
	checks.push({ level: "warn", message });
}

function fail(message) {
	checks.push({ level: "fail", message });
}

function readText(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function stripJsonComments(input) {
	let output = "";
	let inString = false;
	let quote = "";
	let escaped = false;

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const nextChar = input[index + 1];

		if (inString) {
			output += char;
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === quote) {
				inString = false;
				quote = "";
			}
			continue;
		}

		if (char === '"' || char === "'") {
			inString = true;
			quote = char;
			output += char;
			continue;
		}

		if (char === "/" && nextChar === "/") {
			while (index < input.length && input[index] !== "\n") {
				index += 1;
			}
			output += "\n";
			continue;
		}

		if (char === "/" && nextChar === "*") {
			index += 2;
			while (
				index < input.length &&
				!(input[index] === "*" && input[index + 1] === "/")
			) {
				index += 1;
			}
			index += 1;
			continue;
		}

		output += char;
	}

	return output.replace(/,\s*([}\]])/g, "$1");
}

function readJsonc(relativePath) {
	try {
		return JSON.parse(stripJsonComments(readText(relativePath)));
	} catch (error) {
		fail(`${relativePath} is not valid JSONC: ${getErrorMessage(error)}`);
		return null;
	}
}

function readDotEnv(relativePath) {
	const fullPath = path.join(ROOT, relativePath);
	if (!existsSync(fullPath)) {
		return null;
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

function getConfigEnv() {
	const fileValues = readDotEnv(".dev.vars");
	if (!fileValues) {
		fail(".dev.vars is missing");
		return { ...process.env };
	}

	pass(".dev.vars exists");
	return { ...fileValues, ...process.env };
}

function getRequiredEnv(envValues) {
	for (const key of REQUIRED_ENV_KEYS) {
		if (typeof envValues[key] === "string" && envValues[key].trim()) {
			pass(`${key} is configured`);
		} else {
			fail(`${key} is missing from .dev.vars or process env`);
		}
	}
}

function checkSiteUrl(envValues) {
	const siteUrl = envValues.SITE_URL;
	const trustedOrigins = envValues.TRUSTED_ORIGINS;
	if (!(siteUrl && trustedOrigins)) {
		return null;
	}

	let origin;
	try {
		origin = new URL(siteUrl).origin;
		pass(`SITE_URL parses as ${origin}`);
	} catch (error) {
		fail(`SITE_URL is invalid: ${getErrorMessage(error)}`);
		return null;
	}

	const trustedOriginList = trustedOrigins
		.split(",")
		.map((value) => value.trim().replace(/\/+$/, ""))
		.filter(Boolean);

	if (trustedOriginList.includes(origin)) {
		pass("TRUSTED_ORIGINS includes SITE_URL origin");
	} else {
		fail("TRUSTED_ORIGINS must include the exact SITE_URL origin");
	}

	return origin;
}

function checkWrangler() {
	const config = readJsonc("wrangler.jsonc");
	if (!config) {
		return;
	}

	const databases = Array.isArray(config.d1_databases)
		? config.d1_databases
		: [];
	const dbBindings = databases.filter((database) => database.binding === "DB");
	if (dbBindings.length === 1) {
		pass("wrangler.jsonc has exactly one DB D1 binding");
	} else {
		fail(
			`wrangler.jsonc must have exactly one DB D1 binding; found ${dbBindings.length}`,
		);
	}

	const [dbBinding] = dbBindings;
	if (!dbBinding) {
		return;
	}

	if (dbBinding.migrations_dir === "drizzle/migrations") {
		pass("DB migrations_dir points to drizzle/migrations");
	} else {
		fail("DB migrations_dir must be drizzle/migrations");
	}

	if (dbBinding.database_id === "00000000-0000-0000-0000-000000000000") {
		warn("DB database_id is still the template placeholder");
	} else if (
		typeof dbBinding.database_id === "string" &&
		dbBinding.database_id
	) {
		pass("DB database_id is configured");
	} else {
		fail("DB database_id is missing");
	}
}

function checkMigrations() {
	if (existsSync(path.join(ROOT, "drizzle/migrations"))) {
		pass("drizzle/migrations exists");
	} else {
		fail("drizzle/migrations is missing");
	}

	if (existsSync(path.join(ROOT, "drizzle/migrations/meta/_journal.json"))) {
		pass("Drizzle migration journal exists");
	} else {
		fail("Drizzle migration journal is missing");
	}
}

async function checkRuntime(origin) {
	if (!origin) {
		fail("doctor:full cannot run runtime probes without a valid SITE_URL");
		return;
	}

	await checkFetch(
		`${origin}/`,
		(response) => response.ok,
		"SITE_URL responds",
	);
	await checkFetch(
		`${origin}/api/v1/openapi.json`,
		async (response) => {
			if (!response.ok) {
				return false;
			}
			const body = await response.json();
			return typeof body?.openapi === "string";
		},
		"OpenAPI JSON responds with an OpenAPI document",
	);
	await checkFetch(
		`${origin}/api/v1/docs`,
		(response) => response.ok,
		"API docs route responds",
	);
	await checkFetch(
		`${origin}/api/mcp`,
		(response) => !response.ok || response.status === 303,
		"Unauthenticated MCP request rejects",
		{
			body: JSON.stringify({
				id: 1,
				jsonrpc: "2.0",
				method: "tools/list",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
			redirect: "manual",
		},
	);
}

async function checkFetch(url, validate, message, init) {
	try {
		const response = await fetch(url, init);
		const isValid = await validate(response);
		if (isValid) {
			pass(message);
		} else {
			fail(`${message} failed with status ${response.status}`);
		}
	} catch (error) {
		fail(`${message} failed: ${getErrorMessage(error)}`);
	}
}

async function runCommand(command, args) {
	console.log(`\n$ ${[command, ...args].join(" ")}`);
	const exitCode = await new Promise((resolve) => {
		const child = spawn(command, args, {
			env: process.env,
			stdio: "inherit",
		});
		child.on("close", resolve);
		child.on("error", (error) => {
			console.error(getErrorMessage(error));
			resolve(1);
		});
	});

	if (exitCode === 0) {
		pass(`${command} ${args.join(" ")} passed`);
	} else {
		fail(`${command} ${args.join(" ")} failed with exit code ${exitCode}`);
	}
}

function printReport() {
	console.log("\nStarter Doctor");
	for (const check of checks) {
		const label =
			check.level === "pass"
				? "PASS"
				: check.level === "warn"
					? "WARN"
					: "FAIL";
		console.log(`[${label}] ${check.message}`);
	}
}

function getErrorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}

const isFull = process.argv.includes("--full");
const envValues = getConfigEnv();
getRequiredEnv(envValues);
const origin = checkSiteUrl(envValues);
checkWrangler();
checkMigrations();

if (isFull && !checks.some((check) => check.level === "fail")) {
	await checkRuntime(origin);
}

if (isFull && !checks.some((check) => check.level === "fail")) {
	await runCommand("pnpm", ["build"]);
}

if (isFull && !checks.some((check) => check.level === "fail")) {
	await runCommand("pnpm", [
		"wrangler",
		"deploy",
		"--dry-run",
		"--config",
		"dist/server/wrangler.json",
	]);
}

printReport();
process.exit(checks.some((check) => check.level === "fail") ? 1 : 0);

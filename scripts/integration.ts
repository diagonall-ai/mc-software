// Calls one shell method against the real service with the secrets in
// .dev.vars, and prints the result or the error. Run it after adding or
// changing a method, before wiring it into the app (see INTEGRATIONS.md):
//
//   pnpm integration <shell> <method> [arguments...] [--timeout "5 minutes"]
//   pnpm integration pennylane listSupplierInvoices '{"limit": 2}'
//   pnpm integration google-sheets readRange 1AbC... "Clients!A1:C5"
//
// Arguments are read as JSON when they parse ('{"limit": 2}', 42, true), as
// text otherwise. `@args.json` reads one argument from a JSON file, for Windows
// PowerShell 5.1, which strips the quotes of JSON typed on the command line. Credentials come from the secrets named after the shell
// file and its init fields: google-sheets.ts + serviceAccountKey reads
// GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY. Like the app, a call gets 30 seconds
// unless --timeout says otherwise. Secret values are masked in all output.
import { readdirSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { parseEnv } from "node:util";
import { Effect, Result } from "effect";
import type { IntegrationError } from "../app/integrations/http.ts";

// The app imports files without their extension (Vite resolves them): do the
// same here, before importing a shell. `cloudflare:sockets` only exists in
// Workers: shells that speak TCP (SFTP) get a Node stand-in.
registerHooks({
	resolve: (specifier, context, next) => {
		if (specifier === "cloudflare:sockets") {
			return {
				shortCircuit: true,
				url: new URL("./node-sockets.ts", import.meta.url).href,
			};
		}
		return specifier.startsWith(".") && !/\.\w+$/.test(specifier)
			? next(`${specifier}.ts`, context)
			: next(specifier, context);
	},
});

const shells = readdirSync(new URL("../app/integrations/", import.meta.url))
	.filter((file) => file.endsWith(".ts") && file !== "http.ts")
	.map((file) => file.slice(0, -3));
const argv = process.argv.slice(2);
const timeoutFlag = argv.indexOf("--timeout");
const timeout =
	timeoutFlag === -1 ? "30 seconds" : argv.splice(timeoutFlag, 2)[1];
const [shellName, methodName, ...rawArgs] = argv;

const stop = (message: string): never => {
	console.error(message);
	process.exit(2);
};

if (!shellName || !shells.includes(shellName)) {
	stop(
		`Usage: pnpm integration <shell> <method> [arguments...] [--timeout "5 minutes"]\nShells: ${shells.join(", ")}`,
	);
}

const module = await import(`../app/integrations/${shellName}.ts`);
const Shell = Object.values(module).find(
	(
		value,
	): value is { init: (credentials: object) => object; prototype: object } =>
		typeof value === "function" && "init" in value,
);
if (!Shell) {
	stop(`app/integrations/${shellName}.ts exports no class with a static init.`);
}
const methods = Object.getOwnPropertyNames(Shell.prototype).filter(
	(name) => name !== "constructor",
);
if (!methodName || !methods.includes(methodName)) {
	stop(
		`Usage: pnpm integration ${shellName} <method> [arguments...]\nMethods: ${methods.join(", ")}`,
	);
}

// .dev.vars wins over variables already set in the terminal, as in the app.
let devVars: Record<string, string> = {};
try {
	devVars = parseEnv(
		readFileSync(new URL("../.dev.vars", import.meta.url), "utf8"),
	);
} catch {
	// No .dev.vars: use the terminal's variables only.
}
const vars: Record<string, string | undefined> = { ...process.env, ...devVars };
const prefix = `${shellName.replaceAll("-", "_").toUpperCase()}_`;
const secretNames = Object.keys(vars).filter((name) => name.startsWith(prefix));
if (secretNames.length === 0) {
	stop(
		`No ${prefix}* secret in .dev.vars. Name each init field of app/integrations/${shellName}.ts as ${prefix}<FIELD>, for example ${prefix}API_KEY.`,
	);
}
const credentials = Object.fromEntries(
	secretNames.map((name) => [
		name
			.slice(prefix.length)
			.toLowerCase()
			.replace(/_(\w)/g, (_, letter: string) => letter.toUpperCase()),
		vars[name],
	]),
);

// Every line printed goes through `mask`, so no secret value reaches the
// terminal, even inside a URL, an error or a result.
const secretValues = secretNames
	.map((name) => vars[name] ?? "")
	.filter((value) => value.length >= 4);
const mask = (text: string) =>
	secretValues.reduce((masked, value) => masked.replaceAll(value, "•••"), text);
const print = (text: string) => console.log(mask(text));
const note = (text: string) => console.error(mask(text));

const args = rawArgs.map((arg) => {
	if (arg.startsWith("@") && arg.endsWith(".json")) {
		return JSON.parse(readFileSync(arg.slice(1), "utf8"));
	}
	try {
		return JSON.parse(arg);
	} catch {
		return arg;
	}
});

// Log each HTTP call: method, URL and status.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const started = performance.now();
	const response = await realFetch(input, init);
	note(
		`  ${init?.method ?? "GET"} ${String(input)} -> ${response.status} (${Math.round(performance.now() - started)} ms)`,
	);
	return response;
};

const { withTimeLimit } = await import("../app/integrations/http.ts");
note(`Secrets: ${secretNames.join(", ")}`);
const shell = Shell.init(credentials) as Record<
	string,
	(...args: unknown[]) => Effect.Effect<unknown, IntegrationError>
>;
const result = await Effect.runPromise(
	Effect.result(withTimeLimit(shell[methodName](...args), timeout)),
);

if (Result.isSuccess(result)) {
	const value = result.success;
	const output =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	print(
		output.length > 4000
			? `${output.slice(0, 4000)}\n... (${output.length} characters, cut)`
			: output,
	);
	note(`OK: ${shellName}.${methodName}`);
} else {
	const { reason, status, message, detail } = result.failure;
	note(`FAILED: ${reason}${status ? ` (HTTP ${status})` : ""}: ${message}`);
	if (detail) {
		note(detail);
	}
	process.exitCode = 1;
}
// A connection a service never closed must not keep the command running.
process.exit();

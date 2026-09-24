// Calls one shell method against the real service with the secrets in
// .dev.vars, and prints the result or the error. Run it after adding or
// changing a method, before wiring it into the app (see INTEGRATIONS.md):
//
//   pnpm integration <shell> <method> [arguments...]
//   pnpm integration pennylane listSupplierInvoices '{"limit": 2}'
//   pnpm integration google-sheets readRange 1AbC... "Clients!A1:C5"
//
// Arguments are read as JSON when they parse ('{"limit": 2}', 42, true), as
// text otherwise. Credentials come from the secrets named after the shell
// file and its init fields: google-sheets.ts + serviceAccountKey reads
// GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY. Values are never printed.
import { readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { Effect, Result } from "effect";

// The app imports files without their extension (Vite resolves them): do the
// same here, before importing a shell.
registerHooks({
	resolve: (specifier, context, next) =>
		specifier.startsWith(".") && !/\.\w+$/.test(specifier)
			? next(`${specifier}.ts`, context)
			: next(specifier, context),
});

const shells = readdirSync(new URL("../app/integrations/", import.meta.url))
	.filter((file) => file.endsWith(".ts") && file !== "http.ts")
	.map((file) => file.slice(0, -3));
const [shellName, methodName, ...rawArgs] = process.argv.slice(2);

const stop = (message: string): never => {
	console.error(message);
	process.exit(2);
};

if (!shellName || !shells.includes(shellName)) {
	stop(
		`Usage: pnpm integration <shell> <method> [arguments...]\nShells: ${shells.join(", ")}`,
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

try {
	process.loadEnvFile(new URL("../.dev.vars", import.meta.url));
} catch {
	// No .dev.vars: use the shell environment only.
}
const prefix = `${shellName.replaceAll("-", "_").toUpperCase()}_`;
const secretNames = Object.keys(process.env).filter((name) =>
	name.startsWith(prefix),
);
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
		process.env[name],
	]),
);

const args = rawArgs.map((arg) => {
	try {
		return JSON.parse(arg);
	} catch {
		return arg;
	}
});

// Log each HTTP call: method, URL and status only, since headers and bodies
// carry the keys.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const started = performance.now();
	const response = await realFetch(input, init);
	console.error(
		`  ${init?.method ?? "GET"} ${String(input)} -> ${response.status} (${Math.round(performance.now() - started)} ms)`,
	);
	return response;
};

console.error(`Secrets: ${secretNames.join(", ")}`);
const shell = Shell.init(credentials) as Record<
	string,
	(...args: unknown[]) => Effect.Effect<unknown, { [key: string]: unknown }>
>;
const result = await Effect.runPromise(
	Effect.result(shell[methodName](...args)),
);

if (Result.isSuccess(result)) {
	const value = result.success;
	const output =
		typeof value === "string" ? value : JSON.stringify(value, null, 2);
	console.log(
		output.length > 4000
			? `${output.slice(0, 4000)}\n... (${output.length} characters, cut)`
			: output,
	);
	console.error(`OK: ${shellName}.${methodName}`);
} else {
	const { reason, status, message, detail } = result.failure;
	console.error(
		`FAILED: ${reason}${status ? ` (HTTP ${status})` : ""}: ${message}`,
	);
	if (detail) {
		console.error(detail);
	}
	process.exitCode = 1;
}

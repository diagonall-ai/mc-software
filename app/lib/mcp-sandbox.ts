import { env, RpcTarget } from "cloudflare:workers";

import { normalizeMcpCode } from "~/lib/mcp-code";

/**
 * Cloudflare Dynamic Worker runtime for MCP code execution.
 *
 * Uses the LOADER binding declared in wrangler.jsonc (`worker_loaders`)
 * to spin up isolated Worker instances at runtime. Auth secrets never enter
 * the sandbox; tool calls dispatch back to the host via Workers RPC.
 *
 * Usage from a server-side handler:
 *
 *   import { getExecutor } from "~/lib/mcp-sandbox";
 *   const executor = getExecutor();
 *   const result = await executor.execute(code, providers);
 */
export interface ExecuteResult {
	result: unknown;
	error?: string;
	logs?: string[];
}

export type SandboxJsonValue =
	| string
	| number
	| boolean
	| null
	| SandboxJsonValue[]
	| { [key: string]: SandboxJsonValue };

export type SandboxDictionary = Record<string, SandboxJsonValue>;

export interface SandboxExecutionContext {
	dictionary?: SandboxDictionary;
}

export type SandboxTool = (...args: unknown[]) => Promise<unknown>;

export interface SandboxToolProvider {
	name: string;
	tools: Record<string, SandboxTool>;
	positionalArgs?: boolean;
}

interface McpSandboxExecutorOptions {
	loader: WorkerLoader;
	timeout?: number;
	globalOutbound?: Fetcher | null;
	modules?: Record<string, string>;
}

interface CodeExecutorEntrypoint extends Rpc.WorkerEntrypointBranded {
	evaluate(
		dispatchers: Record<string, ToolDispatcher>,
		context?: SandboxExecutionContext,
	): Promise<ExecuteResult>;
}

const EXECUTOR_MODULE = "executor.js";
const DEFAULT_TIMEOUT_MS = 30_000;
const VALID_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const RESERVED_PROVIDER_NAMES = new Set([
	"__context",
	"__dispatchers",
	"__logs",
	"dictionary",
]);

const JS_RESERVED_WORDS = new Set([
	"abstract",
	"arguments",
	"await",
	"boolean",
	"break",
	"byte",
	"case",
	"catch",
	"char",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"double",
	"else",
	"enum",
	"eval",
	"export",
	"extends",
	"false",
	"final",
	"finally",
	"float",
	"for",
	"function",
	"goto",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"int",
	"interface",
	"let",
	"long",
	"native",
	"new",
	"null",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"short",
	"static",
	"super",
	"switch",
	"synchronized",
	"this",
	"throw",
	"throws",
	"transient",
	"true",
	"try",
	"typeof",
	"undefined",
	"var",
	"void",
	"volatile",
	"while",
	"with",
	"yield",
]);

function sanitizeToolName(name: string): string {
	if (!name) {
		return "_";
	}

	let sanitized = name.replace(/[-.\s]/g, "_");
	sanitized = sanitized.replace(/[^a-zA-Z0-9_$]/g, "");
	if (!sanitized) {
		return "_";
	}
	if (/^[0-9]/.test(sanitized)) {
		sanitized = `_${sanitized}`;
	}
	if (JS_RESERVED_WORDS.has(sanitized)) {
		sanitized = `${sanitized}_`;
	}
	return sanitized;
}

function validateProviders(
	providers: SandboxToolProvider[],
): string | undefined {
	const seenNames = new Set<string>();
	for (const provider of providers) {
		if (RESERVED_PROVIDER_NAMES.has(provider.name)) {
			return `Provider name "${provider.name}" is reserved`;
		}
		if (!VALID_IDENTIFIER.test(provider.name)) {
			return `Provider name "${provider.name}" is not a valid JavaScript identifier`;
		}
		if (seenNames.has(provider.name)) {
			return `Duplicate provider name "${provider.name}"`;
		}
		seenNames.add(provider.name);
	}
}

function serializeToolResponse(response: {
	result?: unknown;
	error?: string;
}): string {
	return JSON.stringify(response);
}

/**
 * Workers RPC target passed into each dynamic Worker evaluation.
 * It keeps host-only auth and route execution outside the sandbox boundary.
 */
class ToolDispatcher extends RpcTarget {
	readonly #tools: Record<string, SandboxTool>;
	readonly #positionalArgs: boolean;

	constructor(tools: Record<string, SandboxTool>, positionalArgs = false) {
		super();
		this.#tools = tools;
		this.#positionalArgs = positionalArgs;
	}

	async call(name: string, argsJson: string): Promise<string> {
		const tool = this.#tools[name];
		if (!tool) {
			return serializeToolResponse({ error: `Tool "${name}" not found` });
		}

		try {
			const parsedArgs = argsJson ? JSON.parse(argsJson) : undefined;
			const result = this.#positionalArgs
				? await tool(...(Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs]))
				: await tool(parsedArgs ?? {});
			return serializeToolResponse({ result });
		} catch (error) {
			return serializeToolResponse({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

function createProviderProxySource(provider: SandboxToolProvider): string {
	if (provider.positionalArgs) {
		return `    const ${provider.name} = new Proxy({}, {
      get: (_, toolName) => {
        if (typeof toolName !== "string" || toolName === "then") return undefined;
        return async (...args) => {
          const resJson = await __dispatchers.${provider.name}.call(toolName, JSON.stringify(args));
          const data = JSON.parse(resJson);
          if (data.error) throw new Error(data.error);
          return data.result;
        };
      }
    });`;
	}

	return `    const ${provider.name} = new Proxy({}, {
      get: (_, toolName) => {
        if (typeof toolName !== "string" || toolName === "then") return undefined;
        return async (args) => {
          const resJson = await __dispatchers.${provider.name}.call(toolName, JSON.stringify(args ?? {}));
          const data = JSON.parse(resJson);
          if (data.error) throw new Error(data.error);
          return data.result;
        };
      }
    });`;
}

function createExecutorModule(
	code: string,
	providers: SandboxToolProvider[],
	timeoutMs: number,
): string {
	const normalizedCode = normalizeMcpCode(code).code;

	return [
		'import { WorkerEntrypoint } from "cloudflare:workers";',
		"",
		"export default class CodeExecutor extends WorkerEntrypoint {",
		"  async evaluate(__dispatchers = {}, __context = {}) {",
		"    const __logs = [];",
		"    const dictionary = __context?.dictionary ?? {};",
		'    console.log = (...a) => { __logs.push(a.map(String).join(" ")); };',
		'    console.warn = (...a) => { __logs.push("[warn] " + a.map(String).join(" ")); };',
		'    console.error = (...a) => { __logs.push("[error] " + a.map(String).join(" ")); };',
		...providers.map(createProviderProxySource),
		"",
		"    try {",
		"      const result = await Promise.race([",
		`        (${normalizedCode})(),`,
		`        new Promise((_, reject) => setTimeout(() => reject(new Error("Execution timed out")), ${timeoutMs}))`,
		"      ]);",
		"      return { result, logs: __logs };",
		"    } catch (error) {",
		"      return {",
		"        result: undefined,",
		"        error: error instanceof Error ? error.message : String(error),",
		"        logs: __logs",
		"      };",
		"    }",
		"  }",
		"}",
	].join("\n");
}

function createDispatchers(
	providers: SandboxToolProvider[],
): Record<string, ToolDispatcher> {
	const dispatchers: Record<string, ToolDispatcher> = {};
	for (const provider of providers) {
		const sanitizedTools: Record<string, SandboxTool> = {};
		for (const [name, tool] of Object.entries(provider.tools)) {
			sanitizedTools[sanitizeToolName(name)] = tool;
		}
		dispatchers[provider.name] = new ToolDispatcher(
			sanitizedTools,
			provider.positionalArgs,
		);
	}
	return dispatchers;
}

export class McpSandboxExecutor {
	readonly #loader: WorkerLoader;
	readonly #timeout: number;
	readonly #globalOutbound: Fetcher | null;
	readonly #modules: Record<string, string>;

	constructor(options: McpSandboxExecutorOptions) {
		this.#loader = options.loader;
		this.#timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
		this.#globalOutbound = options.globalOutbound ?? null;
		const { [EXECUTOR_MODULE]: _reserved, ...modules } = options.modules ?? {};
		this.#modules = modules;
	}

	/**
	 * Runs generated JavaScript in a runtime-isolated Dynamic Worker.
	 * Errors are returned in-band so the MCP tool can attach captured logs.
	 */
	async execute(
		code: string,
		providers: SandboxToolProvider[],
		context: SandboxExecutionContext = {},
	): Promise<ExecuteResult> {
		const providerError = validateProviders(providers);
		if (providerError) {
			return { result: undefined, error: providerError };
		}

		const executorModule = createExecutorModule(code, providers, this.#timeout);
		const dispatchers = createDispatchers(providers);

		try {
			const response = await this.#loader
				.get(`mcp-executor-${crypto.randomUUID()}`, () => ({
					compatibilityDate: "2026-05-04",
					compatibilityFlags: ["nodejs_compat"],
					mainModule: EXECUTOR_MODULE,
					modules: {
						...this.#modules,
						[EXECUTOR_MODULE]: executorModule,
					},
					globalOutbound: this.#globalOutbound,
				}))
				.getEntrypoint<CodeExecutorEntrypoint>()
				.evaluate(dispatchers, {
					dictionary: context.dictionary ?? {},
				});

			if (!response || typeof response !== "object") {
				return {
					result: undefined,
					error: "Sandbox returned an invalid response",
				};
			}

			const execution = response as ExecuteResult;
			if (execution.error) {
				return {
					result: undefined,
					error: execution.error,
					logs: execution.logs,
				};
			}
			return {
				result: execution.result,
				logs: execution.logs,
			};
		} catch (error) {
			return {
				result: undefined,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

const getLoader = (): WorkerLoader => env.LOADER;

export function getExecutor(): McpSandboxExecutor {
	return new McpSandboxExecutor({
		loader: getLoader(),
		globalOutbound: null,
	});
}

import type {
	AnonymousClassDeclaration,
	AnonymousFunctionDeclaration,
	ExportDefaultDeclaration,
	ExpressionStatement,
	FunctionDeclaration,
	Node,
	Program,
} from "acorn";
import { parse } from "acorn";

export type NormalizedMcpCode = {
	code: string;
	changed: boolean;
};

/**
 * Normalizes LLM-authored snippets into the async function shape required by
 * the sandbox executor while preserving the original code's intent.
 */
export function normalizeMcpCode(code: string): NormalizedMcpCode {
	const normalizedCode = normalizeCodeToAsyncFunction(code);
	return {
		code: normalizedCode,
		changed: normalizedCode !== code.trim(),
	};
}

function normalizeCodeToAsyncFunction(code: string): string {
	const source = stripMarkdownCodeFence(code.trim()).trim();
	if (!source) {
		return "async () => {}";
	}

	const program = parseProgram(source);
	if (!program) {
		return wrapStatements(source);
	}

	if (isSingleArrowFunction(program)) {
		return source;
	}

	const defaultExport = getSingleDefaultExport(program);
	if (defaultExport) {
		return normalizeDefaultExport(source, defaultExport);
	}

	const functionDeclaration = getSingleFunctionDeclaration(program);
	if (functionDeclaration) {
		return wrapFunctionDeclaration(source, functionDeclaration);
	}

	const lastStatement = program.body.at(-1);
	if (lastStatement?.type === "ExpressionStatement") {
		return wrapWithReturnedExpression(source, lastStatement);
	}

	return wrapStatements(source);
}

function stripMarkdownCodeFence(code: string): string {
	const fence = code.match(
		/^```(?:js|javascript|jsx|ts|typescript|tsx)?\s*\n([\s\S]*?)```\s*$/,
	);
	return fence?.[1] ?? code;
}

function parseProgram(source: string): Program | null {
	try {
		return parse(source, {
			ecmaVersion: "latest",
			sourceType: "module",
		});
	} catch {
		return null;
	}
}

function isSingleArrowFunction(program: Program): boolean {
	const statement = program.body[0];
	return (
		program.body.length === 1 &&
		statement?.type === "ExpressionStatement" &&
		statement.expression.type === "ArrowFunctionExpression"
	);
}

function getSingleDefaultExport(
	program: Program,
): ExportDefaultDeclaration | null {
	const statement = program.body[0];
	return program.body.length === 1 &&
		statement?.type === "ExportDefaultDeclaration"
		? statement
		: null;
}

function normalizeDefaultExport(
	source: string,
	defaultExport: ExportDefaultDeclaration,
): string {
	const declaration = defaultExport.declaration;
	const innerSource = source.slice(declaration.start, declaration.end);

	if (isAnonymousFunctionDeclaration(declaration)) {
		return `async () => {\nreturn (${innerSource})();\n}`;
	}

	if (isAnonymousClassDeclaration(declaration)) {
		return `async () => {\nreturn (${innerSource});\n}`;
	}

	return normalizeCodeToAsyncFunction(innerSource);
}

function getSingleFunctionDeclaration(
	program: Program,
): FunctionDeclaration | null {
	const statement = program.body[0];
	return program.body.length === 1 && statement?.type === "FunctionDeclaration"
		? statement
		: null;
}

function wrapFunctionDeclaration(
	source: string,
	functionDeclaration: FunctionDeclaration,
): string {
	return `async () => {\n${source}\nreturn ${functionDeclaration.id.name}();\n}`;
}

function wrapWithReturnedExpression(
	source: string,
	statement: ExpressionStatement,
): string {
	const beforeExpression = source.slice(0, statement.start);
	const expression = source.slice(
		statement.expression.start,
		statement.expression.end,
	);
	return `async () => {\n${beforeExpression}return (${expression});\n}`;
}

function wrapStatements(source: string): string {
	return `async () => {\n${source}\n}`;
}

function isAnonymousFunctionDeclaration(
	node: Node,
): node is AnonymousFunctionDeclaration {
	return (
		node.type === "FunctionDeclaration" && "id" in node && node.id === null
	);
}

function isAnonymousClassDeclaration(
	node: Node,
): node is AnonymousClassDeclaration {
	return node.type === "ClassDeclaration" && "id" in node && node.id === null;
}

import MiniSearch from "minisearch";
import { getOpenApiSpec } from "~/lib/api";

/** Minimal catalog entry optimized for MCP tool search. */
export interface CatalogEntry {
	method: string;
	path: string;
	summary: string;
	description: string;
	inputType: string;
	outputType: string;
	tags: string[];
	parameters: {
		name: string;
		in: string;
		required: boolean;
		schema?: string;
	}[];
	requestBodyContentTypes: string[];
	responseContentTypes: string[];
	schemaSummary: string;
}

interface SearchDocument extends CatalogEntry {
	id: string;
	tagsText: string;
	parametersText: string;
	requestBodyText: string;
	responseBodyText: string;
	inputTypeText: string;
	outputTypeText: string;
}

const PUBLIC_ROUTE_CATALOG: CatalogEntry[] = [
	{
		method: "GET",
		path: "/api/v1/openapi.json",
		summary: "OpenAPI schema",
		description:
			"Returns the machine-readable OpenAPI 3.1 schema for the public API surface.",
		inputType: "type Input = {}",
		outputType: "type Output = unknown",
		tags: ["public", "openapi"],
		parameters: [],
		requestBodyContentTypes: [],
		responseContentTypes: ["application/json"],
		schemaSummary: "res200(application/json): object",
	},
	{
		method: "GET",
		path: "/api/v1/docs",
		summary: "API reference",
		description:
			"Returns the interactive API reference UI for the public API surface.",
		inputType: "type Input = {}",
		outputType: "type Output = string",
		tags: ["public", "docs"],
		parameters: [],
		requestBodyContentTypes: [],
		responseContentTypes: ["text/html"],
		schemaSummary: "res200(text/html): string",
	},
];

type CatalogIndex = {
	entries: CatalogEntry[];
	miniSearch: MiniSearch<SearchDocument>;
	documentsById: Map<string, SearchDocument>;
};

let fullCatalogIndexCache: CatalogIndex | null = null;
let publicCatalogIndexCache: CatalogIndex | null = null;

/**
 * Derives a compact route catalog from the in-memory OpenAPI spec.
 * Reads the spec synchronously via `getOpenApiSpec()` — no HTTP fetch needed.
 */
export function buildCatalog(): CatalogEntry[] {
	const spec = getOpenApiSpec() as OpenApiSpec;
	const paths = spec.paths ?? {};
	const components = spec.components?.schemas ?? {};
	const entries: CatalogEntry[] = [];

	for (const [path, methods] of Object.entries(paths)) {
		if (!methods) continue;
		for (const [method, op] of Object.entries(methods)) {
			if (
				!op ||
				typeof op !== "object" ||
				!("summary" in op || "responses" in op)
			) {
				continue;
			}
			const operation = op as OperationObject;
			entries.push({
				method: method.toUpperCase(),
				path,
				summary: operation.summary ?? "",
				description: operation.description ?? "",
				inputType: buildInputType(operation, components),
				outputType: buildOutputType(operation, components),
				tags: operation.tags ?? [],
				parameters: (operation.parameters ?? []).map((p) => ({
					name: p.name,
					in: p.in,
					required: p.required ?? false,
					schema: summarizeSchema(p.schema),
				})),
				requestBodyContentTypes: operation.requestBody?.content
					? Object.keys(operation.requestBody.content)
					: [],
				responseContentTypes: extractResponseContentTypes(operation.responses),
				schemaSummary: buildSchemaSummary(operation),
			});
		}
	}

	return entries;
}

export function describeCatalogEntries(entries: CatalogEntry[]): string {
	return entries
		.map((entry) => {
			const details = [entry.summary, entry.description]
				.filter(Boolean)
				.join(" - ");
			return details
				? `${entry.method} ${entry.path}: ${details}`
				: `${entry.method} ${entry.path}`;
		})
		.join("\n");
}

/**
 * Searches the catalog by keyword, matching against path, summary,
 * description, and tags. Returns entries sorted by relevance (number of
 * matched fields).
 */
export function searchCatalog(query: string): CatalogEntry[] {
	return searchWithIndex(query, getFullCatalogIndex());
}

/** Search only the public route catalog exposed to MCP callers. */
export function searchPublicCatalog(query: string): CatalogEntry[] {
	return searchWithIndex(query, getPublicCatalogIndex());
}

// ---- internal helpers ----

function getFullCatalogIndex(): CatalogIndex {
	if (!fullCatalogIndexCache) {
		fullCatalogIndexCache = createCatalogIndex(buildCatalog());
	}
	return fullCatalogIndexCache;
}

function getPublicCatalogIndex(): CatalogIndex {
	if (!publicCatalogIndexCache) {
		publicCatalogIndexCache = createCatalogIndex(PUBLIC_ROUTE_CATALOG);
	}
	return publicCatalogIndexCache;
}

function createCatalogIndex(entries: CatalogEntry[]): CatalogIndex {
	const documents = entries.map((entry, index) =>
		toSearchDocument(entry, index),
	);
	const miniSearch = new MiniSearch<SearchDocument>({
		fields: [
			"method",
			"path",
			"summary",
			"description",
			"tagsText",
			"parametersText",
			"requestBodyText",
			"responseBodyText",
			"inputTypeText",
			"outputTypeText",
			"schemaSummary",
		],
		storeFields: [
			"method",
			"path",
			"summary",
			"description",
			"inputType",
			"outputType",
			"tags",
			"parameters",
			"requestBodyContentTypes",
			"responseContentTypes",
			"schemaSummary",
		],
		searchOptions: {
			boost: {
				path: 6,
				method: 2,
				summary: 4,
				description: 2,
				tagsText: 3,
				parametersText: 2,
				requestBodyText: 2,
				responseBodyText: 1,
				schemaSummary: 1,
			},
			prefix: true,
			fuzzy: 0.2,
			combineWith: "OR",
		},
	});
	miniSearch.addAll(documents);

	return {
		entries,
		miniSearch,
		documentsById: new Map(
			documents.map((document) => [document.id, document]),
		),
	};
}

function toSearchDocument(entry: CatalogEntry, index: number): SearchDocument {
	return {
		...entry,
		id: `${entry.method}:${entry.path}:${index}`,
		tagsText: entry.tags.join(" "),
		parametersText: entry.parameters
			.map((parameter) =>
				[
					parameter.name,
					parameter.in,
					parameter.required ? "required" : "optional",
					parameter.schema ?? "",
				]
					.filter(Boolean)
					.join(" "),
			)
			.join(" "),
		requestBodyText: entry.requestBodyContentTypes.join(" "),
		responseBodyText: entry.responseContentTypes.join(" "),
		inputTypeText: entry.inputType,
		outputTypeText: entry.outputType,
	};
}

function searchWithIndex(query: string, index: CatalogIndex): CatalogEntry[] {
	const normalizedQuery = query.trim();
	if (!normalizedQuery) {
		return index.entries;
	}

	const matches = index.miniSearch.search(normalizedQuery);
	if (matches.length === 0) {
		return [];
	}

	return matches
		.map((match) => index.documentsById.get(String(match.id)))
		.filter((document): document is SearchDocument => Boolean(document))
		.map(toCatalogEntry);
}

function toCatalogEntry(document: SearchDocument): CatalogEntry {
	return {
		method: document.method,
		path: document.path,
		summary: document.summary,
		description: document.description,
		inputType: document.inputType,
		outputType: document.outputType,
		tags: document.tags,
		parameters: document.parameters,
		requestBodyContentTypes: document.requestBodyContentTypes,
		responseContentTypes: document.responseContentTypes,
		schemaSummary: document.schemaSummary,
	};
}

/** Produce a shallow one-line summary of a JSON schema without recursing. */
function summarizeSchema(schema: Record<string, unknown> | undefined): string {
	if (!schema) return "";
	const type = schema.type as string | undefined;
	if (type === "object" && schema.properties) {
		const keys = Object.keys(schema.properties as Record<string, unknown>);
		return `object{${keys.join(", ")}}`;
	}
	if (type === "array" && schema.items) {
		const items = schema.items as Record<string, unknown>;
		return `array<${items.type ?? "unknown"}>`;
	}
	return type ?? "unknown";
}

function extractResponseContentTypes(
	responses: Record<string, ResponseObject> | undefined,
): string[] {
	if (!responses) return [];
	const types = new Set<string>();
	for (const resp of Object.values(responses)) {
		if (resp?.content) {
			for (const ct of Object.keys(resp.content)) {
				types.add(ct);
			}
		}
	}
	return [...types];
}

/** Build a human-readable schema summary for the operation. */
function buildSchemaSummary(op: OperationObject): string {
	const parts: string[] = [];

	// Request body schema
	if (op.requestBody?.content) {
		for (const [ct, media] of Object.entries(op.requestBody.content)) {
			const s = summarizeSchema(media.schema);
			if (s) parts.push(`req(${ct}): ${s}`);
		}
	}

	// Response schemas (only 2xx)
	if (op.responses) {
		for (const [code, resp] of Object.entries(op.responses)) {
			if (!code.startsWith("2") || !resp?.content) continue;
			for (const [ct, media] of Object.entries(resp.content)) {
				const s = summarizeSchema(media.schema);
				if (s) parts.push(`res${code}(${ct}): ${s}`);
			}
		}
	}

	return parts.join("; ") || "none";
}

function buildInputType(
	op: OperationObject,
	components: Record<string, Record<string, unknown>>,
): string {
	const parts: string[] = [];
	const groupedParameters = groupParameters(op.parameters ?? [], components);

	if (groupedParameters.params.length > 0) {
		parts.push(`params: ${formatObjectType(groupedParameters.params)}`);
	}
	if (groupedParameters.query.length > 0) {
		parts.push(`query: ${formatObjectType(groupedParameters.query)}`);
	}
	if (groupedParameters.headers.length > 0) {
		parts.push(`headers: ${formatObjectType(groupedParameters.headers)}`);
	}

	const requestJsonSchema =
		op.requestBody?.content?.["application/json"]?.schema ??
		firstSchemaFromContent(op.requestBody?.content);
	if (requestJsonSchema) {
		parts.push(`body: ${schemaToTsType(requestJsonSchema, components)}`);
	}

	return parts.length > 0
		? `type Input = ${wrapObject(parts)}`
		: "type Input = {}";
}

function buildOutputType(
	op: OperationObject,
	components: Record<string, Record<string, unknown>>,
): string {
	if (!op.responses) {
		return "type Output = unknown";
	}

	for (const [code, response] of Object.entries(op.responses)) {
		if (!code.startsWith("2") || !response?.content) continue;
		const schema =
			response.content["application/json"]?.schema ??
			firstSchemaFromContent(response.content);
		if (schema) {
			return `type Output = ${schemaToTsType(schema, components)}`;
		}
	}

	return "type Output = unknown";
}

function groupParameters(
	parameters: ParameterObject[],
	components: Record<string, Record<string, unknown>>,
): {
	params: TypeField[];
	query: TypeField[];
	headers: TypeField[];
} {
	const grouped = {
		params: [] as TypeField[],
		query: [] as TypeField[],
		headers: [] as TypeField[],
	};

	for (const parameter of parameters) {
		const field: TypeField = {
			name: parameter.name,
			required: parameter.required ?? false,
			type: schemaToTsType(parameter.schema, components),
		};

		if (parameter.in === "path") grouped.params.push(field);
		if (parameter.in === "query") grouped.query.push(field);
		if (parameter.in === "header") grouped.headers.push(field);
	}

	return grouped;
}

function formatObjectType(fields: TypeField[]): string {
	return wrapObject(
		fields.map(
			(field) =>
				`${escapePropertyName(field.name)}${field.required ? "" : "?"}: ${field.type}`,
		),
	);
}

function wrapObject(fields: string[]): string {
	if (fields.length === 0) return "{}";
	return `{\n  ${fields.map((field) => indentMultiline(field, 2)).join("\n  ")}\n}`;
}

function firstSchemaFromContent(
	content: Record<string, MediaTypeObject> | undefined,
): Record<string, unknown> | undefined {
	if (!content) return undefined;
	for (const media of Object.values(content)) {
		if (media?.schema) return media.schema;
	}
	return undefined;
}

function schemaToTsType(
	schema: Record<string, unknown> | undefined,
	components: Record<string, Record<string, unknown>>,
	seenRefs = new Set<string>(),
): string {
	if (!schema) return "unknown";

	if (typeof schema.$ref === "string") {
		const ref = schema.$ref;
		const refName = ref.split("/").pop() ?? "UnknownRef";
		if (seenRefs.has(ref)) return refName;
		const resolved = resolveSchemaRef(ref, components);
		if (!resolved) return refName;
		const nextSeenRefs = new Set(seenRefs);
		nextSeenRefs.add(ref);
		return schemaToTsType(resolved, components, nextSeenRefs);
	}

	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
	}

	if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
		return schema.oneOf
			.map((item) => schemaToTsType(item, components, seenRefs))
			.join(" | ");
	}

	if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
		return schema.anyOf
			.map((item) => schemaToTsType(item, components, seenRefs))
			.join(" | ");
	}

	if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
		return schema.allOf
			.map((item) => schemaToTsType(item, components, seenRefs))
			.join(" & ");
	}

	const type = schema.type as string | undefined;
	if (type === "string") return "string";
	if (type === "number" || type === "integer") return "number";
	if (type === "boolean") return "boolean";
	if (type === "null") return "null";
	if (type === "array") {
		return `Array<${schemaToTsType(
			(schema.items as Record<string, unknown> | undefined) ?? undefined,
			components,
			seenRefs,
		)}>`;
	}
	if (type === "object" || schema.properties) {
		const properties = (schema.properties ?? {}) as Record<
			string,
			Record<string, unknown>
		>;
		const required = new Set((schema.required as string[] | undefined) ?? []);
		const fields = Object.entries(properties).map(([name, propertySchema]) => ({
			name,
			required: required.has(name),
			type: schemaToTsType(propertySchema, components, seenRefs),
		}));
		return formatObjectType(fields);
	}

	return "unknown";
}

function resolveSchemaRef(
	ref: string,
	components: Record<string, Record<string, unknown>>,
): Record<string, unknown> | undefined {
	const match = ref.match(/^#\/components\/schemas\/(.+)$/);
	if (!match) return undefined;
	return components[match[1]];
}

function escapePropertyName(name: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function indentMultiline(value: string, spaces: number): string {
	const prefix = " ".repeat(spaces);
	return value
		.split("\n")
		.map((line, index) => (index === 0 ? line : `${prefix}${line}`))
		.join("\n");
}

// ---- minimal OpenAPI type stubs (avoids importing full openapi-types) ----

interface TypeField {
	name: string;
	required: boolean;
	type: string;
}

interface OpenApiSpec {
	paths?: Record<string, Record<string, unknown>>;
	components?: {
		schemas?: Record<string, Record<string, unknown>>;
	};
}

interface ParameterObject {
	name: string;
	in: string;
	required?: boolean;
	schema?: Record<string, unknown>;
}

interface MediaTypeObject {
	schema?: Record<string, unknown>;
}

interface ResponseObject {
	content?: Record<string, MediaTypeObject>;
}

interface RequestBodyObject {
	content?: Record<string, MediaTypeObject>;
}

interface OperationObject {
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: ParameterObject[];
	requestBody?: RequestBodyObject;
	responses?: Record<string, ResponseObject>;
}

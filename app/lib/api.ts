import {
	OpenAPIGenerator,
	type OpenAPIGeneratorGenerateOptions,
} from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { ApiContext } from "~/lib/orpc/context";
import { createApiContext } from "~/lib/orpc/context";
import { apiRouter } from "~/lib/orpc/router";
import { PROJECT_NAME } from "~/lib/project";

const schemaConverters = [new ZodToJsonSchemaConverter()];

const openApiGenerateOptions = {
	info: {
		title: `${PROJECT_NAME} API`,
		version: "1.0.0",
	},
	security: [{ bearerAuth: [] as string[] }],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http" as const,
				scheme: "bearer",
				description: "Send an API key as Authorization: Bearer <api-key>.",
			},
		},
	},
} satisfies OpenAPIGeneratorGenerateOptions;

const openApiReferencePlugin = new OpenAPIReferencePlugin({
	schemaConverters,
	docsProvider: "scalar",
	specPath: "/api/v1/openapi.json",
	docsPath: "/api/v1/docs",
	docsTitle: `${PROJECT_NAME} API Reference`,
	specGenerateOptions: openApiGenerateOptions,
	docsConfig: {
		theme: "deepSpace",
		layout: "modern",
		defaultOpenAllTags: true,
		defaultOpenFirstTag: true,
		hideSearch: true,
		authentication: {
			preferredSecurityScheme: "httpBearer",
			securitySchemes: {
				httpBearer: {
					scheme: "bearer",
					token: "API key",
				},
			},
		},
	},
});

const apiHandler = new OpenAPIHandler(apiRouter, {
	plugins: [openApiReferencePlugin],
});

const openApiGenerator = new OpenAPIGenerator({
	schemaConverters,
});

const openApiSpec = await openApiGenerator.generate(
	apiRouter,
	openApiGenerateOptions,
);

/**
 * Returns the generated OpenAPI spec as a plain JS object.
 * Useful for programmatic access without an HTTP round-trip.
 */
export function getOpenApiSpec(): Record<string, unknown> {
	return openApiSpec as Record<string, unknown>;
}

export async function handleApiRequest(
	request: Request,
	context?: ApiContext,
): Promise<Response> {
	const result = await apiHandler.handle(request, {
		context: context ?? (await createApiContext(request)),
	});

	if (!result.matched) {
		return new Response("Not Found", { status: 404 });
	}

	return result.response;
}

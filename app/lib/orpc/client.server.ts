import { createJsonifiedRouterClient } from "@orpc/openapi";

import type { AppApiClient } from "~/lib/orpc/client.shared";
import { createApiContext } from "~/lib/orpc/context";
import { apiRouter } from "~/lib/orpc/router";

export function createServerApiClient(request: Request): AppApiClient {
	return createJsonifiedRouterClient(apiRouter, {
		context: () => createApiContext(request),
	}) as AppApiClient;
}

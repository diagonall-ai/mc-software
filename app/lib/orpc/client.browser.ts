import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

import type { AppApiClient } from "~/lib/orpc/client.shared";
import { apiContract } from "~/lib/orpc/contract";

function getBrowserApiBaseUrl(): string {
	return window.location.origin;
}

export function createBrowserApiClient(): AppApiClient {
	const link = new OpenAPILink(apiContract, {
		fetch: (request, init) =>
			fetch(request, {
				...init,
				credentials: "same-origin",
			}),
		url: () => getBrowserApiBaseUrl(),
	});

	return createORPCClient(link) as AppApiClient;
}

let browserApiClient: AppApiClient | null = null;

export function getBrowserApiClient(): AppApiClient {
	if (typeof window === "undefined") {
		throw new Error("Browser oRPC client is not available during SSR");
	}

	browserApiClient ??= createBrowserApiClient();
	return browserApiClient;
}

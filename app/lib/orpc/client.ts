import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getBrowserApiClient } from "~/lib/orpc/client.browser";
import { createServerApiClient } from "~/lib/orpc/client.server";
import type { AppApiClient } from "~/lib/orpc/client.shared";

export type { AppApiClient } from "~/lib/orpc/client.shared";

const resolveDefaultApiClient = createIsomorphicFn()
	.client(() => getBrowserApiClient())
	.server(() => createServerApiClient(getRequest()));

export function getDefaultApiClient(): AppApiClient {
	return resolveDefaultApiClient();
}

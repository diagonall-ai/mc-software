import type { AppApiClient } from "~/lib/orpc/client";
import type { AppServerRequestContext } from "~/server-request-context";

export type AppRouterContext = {
	getOrpc: () => AppApiClient;
	serverContext?: AppServerRequestContext;
};

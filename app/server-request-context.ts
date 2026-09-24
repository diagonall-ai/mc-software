import type { AppApiClient } from "~/lib/orpc/client";

export type AppServerRequestContext = {
	orpc: AppApiClient;
};

import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";

import type { apiContract } from "~/lib/orpc/contract";

export type AppApiClient = JsonifiedClient<
	ContractRouterClient<typeof apiContract>
>;

import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { getDefaultApiClient } from "~/lib/orpc/client";
import type { AppRouterContext } from "./router-context";
import { routeTree } from "./routeTree.gen";
import type { AppServerRequestContext } from "./server-request-context";

function createRouter() {
	return createTanStackRouter({
		routeTree,
		context: {
			getOrpc: () => getDefaultApiClient(),
		} satisfies AppRouterContext,
		defaultPreload: "intent",
		defaultViewTransition: true,
		scrollRestoration: true,
	});
}

export function getRouter() {
	return createRouter();
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
		server: {
			requestContext: AppServerRequestContext;
		};
	}
}

declare module "@tanstack/react-start" {
	interface Register {
		server: {
			requestContext: AppServerRequestContext;
		};
	}
}

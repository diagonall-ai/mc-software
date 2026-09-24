import { createFileRoute } from "@tanstack/react-router";
import { NotFoundRouteState } from "~/components/route-error-state";

export const Route = createFileRoute("/$")({
	component: NotFoundRouteState,
});

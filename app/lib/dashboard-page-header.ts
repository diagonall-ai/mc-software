import type { StaticDataRouteOption } from "@tanstack/router-core";

export type DashboardPageHeader = {
	backHref?: string;
	description?: string;
	title: string;
};

type DashboardHeaderMatch = {
	loaderData?: unknown;
	staticData: StaticDataRouteOption;
};

declare module "@tanstack/router-core" {
	interface StaticDataRouteOption {
		dashboardHeader?: DashboardPageHeader;
	}
}

export function getDashboardPageHeader(
	matches: Array<DashboardHeaderMatch>,
): DashboardPageHeader | null {
	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const match = matches[index];
		const loaderHeader = getLoaderDashboardHeader(match?.loaderData);
		if (loaderHeader) {
			return loaderHeader;
		}

		const staticHeader = match?.staticData.dashboardHeader;
		if (staticHeader) {
			return staticHeader;
		}
	}

	return null;
}

function getLoaderDashboardHeader(
	loaderData: unknown,
): DashboardPageHeader | null {
	if (!loaderData || typeof loaderData !== "object") {
		return null;
	}

	const { dashboardHeader } = loaderData as { dashboardHeader?: unknown };
	if (!isDashboardPageHeader(dashboardHeader)) {
		return null;
	}

	return dashboardHeader;
}

function isDashboardPageHeader(value: unknown): value is DashboardPageHeader {
	if (!value || typeof value !== "object") {
		return false;
	}

	const header = value as Record<string, unknown>;
	const hasTitle = typeof header.title === "string" && header.title.length > 0;
	const hasValidDescription =
		header.description === undefined || typeof header.description === "string";
	const hasValidBackHref =
		header.backHref === undefined || typeof header.backHref === "string";

	return hasTitle && hasValidDescription && hasValidBackHref;
}

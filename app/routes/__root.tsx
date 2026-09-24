import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NavigationProgress } from "~/components/navigation-progress";
import {
	NotFoundRouteState,
	RouteErrorComponent,
} from "~/components/route-error-state";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { PROJECT_NAME } from "~/lib/project";
import type { AppRouterContext } from "~/router-context";
import appCss from "../app.css?url";

const faviconHref = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#111827"/><path d="M20 16h14c8.837 0 16 7.163 16 16s-7.163 16-16 16H20z" fill="#f8fafc"/><path d="M30 28h6c4.418 0 8 3.582 8 8s-3.582 8-8 8h-6z" fill="#111827"/></svg>',
)}`;

export const Route = createRootRouteWithContext<AppRouterContext>()({
	errorComponent: RouteErrorComponent,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: PROJECT_NAME },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: faviconHref },
		],
	}),
	notFoundComponent: NotFoundRouteState,
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script>{`(() => {
  const savedTheme = window.localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : prefersDark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
})();`}</script>
			</head>
			<body className="min-h-screen antialiased">
				<TooltipProvider>
					<NavigationProgress />
					{children}
					<Toaster richColors />
					<Scripts />
				</TooltipProvider>
			</body>
		</html>
	);
}

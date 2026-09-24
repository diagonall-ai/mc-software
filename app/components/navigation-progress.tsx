import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";

export function NavigationProgress() {
	const shouldShowProgress = useRouterState({
		select: (state) =>
			state.status === "pending" || state.isLoading || state.isTransitioning,
	});
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (shouldShowProgress) {
			setIsVisible(true);
			return;
		}

		const timeout = window.setTimeout(() => setIsVisible(false), 180);
		return () => window.clearTimeout(timeout);
	}, [shouldShowProgress]);

	if (!isVisible) {
		return null;
	}

	return (
		<div
			aria-hidden="true"
			className={cn(
				"pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-secondary/10 transition-opacity duration-150",
				shouldShowProgress ? "opacity-100" : "opacity-0",
			)}
		>
			<div className="navigation-progress-bar h-full w-2/3 rounded-full bg-secondary shadow-[0_0_12px_color-mix(in_oklab,var(--secondary)_35%,transparent)]" />
		</div>
	);
}

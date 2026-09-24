import {
	Children,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";

export const DASHBOARD_HEADER_ACTIONS_PORTAL_ID = "dashboard-header-actions";
export const DASHBOARD_FOOTER_LEFT_PORTAL_ID = "dashboard-footer-left";
export const DASHBOARD_FOOTER_RIGHT_PORTAL_ID = "dashboard-footer-right";

type DashboardFooterSlot = "left" | "right";

type DashboardShellPortalContextValue = {
	footerVersion: number;
	hasFooterContent: boolean;
	registerFooterSlot: (slot: DashboardFooterSlot) => () => void;
};

const DashboardShellPortalContext =
	createContext<DashboardShellPortalContextValue | null>(null);
const useClientLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;

export function DashboardShellPortalProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [footerSlots, setFooterSlots] = useState<{
		left: number;
		right: number;
	}>({ left: 0, right: 0 });

	const registerFooterSlot = useCallback((slot: DashboardFooterSlot) => {
		setFooterSlots((currentSlots) => ({
			...currentSlots,
			[slot]: currentSlots[slot] + 1,
		}));

		return () => {
			setFooterSlots((currentSlots) => ({
				...currentSlots,
				[slot]: Math.max(0, currentSlots[slot] - 1),
			}));
		};
	}, []);

	const value = useMemo(
		() => ({
			footerVersion: footerSlots.left + footerSlots.right,
			hasFooterContent: footerSlots.left > 0 || footerSlots.right > 0,
			registerFooterSlot,
		}),
		[footerSlots.left, footerSlots.right, registerFooterSlot],
	);

	return (
		<DashboardShellPortalContext.Provider value={value}>
			{children}
		</DashboardShellPortalContext.Provider>
	);
}

function useDashboardShellPortalContext(consumerName: string) {
	const context = useContext(DashboardShellPortalContext);
	if (!context) {
		throw new Error(`${consumerName} must be used within DashboardShell.`);
	}
	return context;
}

export function DashboardShellFooterPortalTargets() {
	const { hasFooterContent } = useDashboardShellPortalContext(
		"DashboardShellFooterPortalTargets",
	);

	if (!hasFooterContent) {
		return null;
	}

	return (
		<footer className="h-14 shrink-0 border-t border-border/70 bg-background/95 backdrop-blur">
			<div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6">
				<div
					className="flex min-w-0 items-center gap-2"
					id={DASHBOARD_FOOTER_LEFT_PORTAL_ID}
				/>
				<div
					className="flex shrink-0 items-center gap-2"
					id={DASHBOARD_FOOTER_RIGHT_PORTAL_ID}
				/>
			</div>
		</footer>
	);
}

function DashboardShellPortal({
	children,
	footerSlot,
	name,
	targetId,
}: {
	children: ReactNode;
	footerSlot?: DashboardFooterSlot;
	name: string;
	targetId: string;
}) {
	const { footerVersion, registerFooterSlot } =
		useDashboardShellPortalContext(name);
	const [target, setTarget] = useState<HTMLElement | null>(null);
	const hasChildren = Children.toArray(children).length > 0;

	useClientLayoutEffect(() => {
		if (!(footerSlot && hasChildren)) {
			return;
		}

		return registerFooterSlot(footerSlot);
	}, [footerSlot, hasChildren, registerFooterSlot]);

	useClientLayoutEffect(() => {
		if (!hasChildren) {
			setTarget(null);
			return;
		}

		const targetNode = document.getElementById(targetId);
		if (!(targetNode || footerSlot)) {
			throw new Error(`${name} target "${targetId}" was not found.`);
		}

		setTarget(targetNode);
		return () => setTarget(null);
	}, [footerSlot, footerVersion, hasChildren, name, targetId]);

	if (!target) {
		return null;
	}

	return createPortal(children, target);
}

export function DashboardHeaderActionsPortal({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<DashboardShellPortal
			name="DashboardHeaderActionsPortal"
			targetId={DASHBOARD_HEADER_ACTIONS_PORTAL_ID}
		>
			{children}
		</DashboardShellPortal>
	);
}

export function DashboardFooterLeftPortal({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<DashboardShellPortal
			footerSlot="left"
			name="DashboardFooterLeftPortal"
			targetId={DASHBOARD_FOOTER_LEFT_PORTAL_ID}
		>
			{children}
		</DashboardShellPortal>
	);
}

export function DashboardFooterRightPortal({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<DashboardShellPortal
			footerSlot="right"
			name="DashboardFooterRightPortal"
			targetId={DASHBOARD_FOOTER_RIGHT_PORTAL_ID}
		>
			{children}
		</DashboardShellPortal>
	);
}

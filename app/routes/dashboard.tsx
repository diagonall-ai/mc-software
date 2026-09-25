import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
	useMatches,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	BookOpen,
	Home,
	Key,
	Layers3,
	LogOut,
	Moon,
	Plug,
	Sparkles,
	Sun,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ApiKeyDrawer } from "~/components/api-keys/api-key-drawer";
import {
	DASHBOARD_HEADER_ACTIONS_PORTAL_ID,
	DashboardShellFooterPortalTargets,
	DashboardShellPortalProvider,
} from "~/components/dashboard/shell-portals";
import { DashboardSidebarCommandBar } from "~/components/dashboard/sidebar-command-bar";
import { McpConnectDialog } from "~/components/mcp/mcp-connect-dialog";
import { RouteErrorComponent } from "~/components/route-error-state";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { getBetterAuthSessionStatus } from "~/lib/auth.functions";
import { authClient } from "~/lib/auth-client";
import { getDashboardPageHeader } from "~/lib/dashboard-page-header";
import { cn } from "~/lib/utils";

const dashboardLinks = [
	{ to: "/dashboard", label: "Accueil", icon: Home },
	// References for building (the example assistant, the screens): listed in
	// local dev only. An app that ships its own assistant lists it for everyone.
	...(import.meta.env.DEV
		? ([
				{ to: "/dashboard/assistant", label: "Assistant", icon: Sparkles },
				{
					to: "/dashboard/design-system",
					label: "Design System",
					icon: Layers3,
				},
			] as const)
		: []),
] as const;

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const authStatus = await getBetterAuthSessionStatus();
		if (authStatus === "anonymous") {
			throw redirect({ to: "/" });
		}
	},
	errorComponent: RouteErrorComponent,
	staticData: {
		dashboardHeader: {
			description: "Authenticated application workspace",
			title: "Tableau de bord",
		},
	},
	component: DashboardLayoutRoute,
});

function DashboardLayoutRoute() {
	return <DashboardShell />;
}

function DashboardShell() {
	const { data: sessionData, isPending: loadingSession } =
		authClient.useSession();
	const user = sessionData?.user
		? {
				email: sessionData.user.email,
				image: sessionData.user.image,
				name: sessionData.user.name,
			}
		: loadingSession
			? undefined
			: null;
	const pageHeader = getDashboardPageHeader(useMatches());
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [mcpOpen, setMcpOpen] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		setTheme(root.classList.contains("dark") ? "dark" : "light");
	}, []);

	async function handleSignOut() {
		await authClient.signOut();
		navigate({ to: "/", viewTransition: true });
	}

	function applyTheme(nextTheme: "light" | "dark") {
		document.documentElement.classList.toggle("dark", nextTheme === "dark");
		window.localStorage.setItem("theme", nextTheme);
		setTheme(nextTheme);
	}

	return (
		<DashboardShellPortalProvider>
			<SidebarProvider
				className="fixed inset-0 overflow-hidden"
				style={
					{
						"--sidebar-width": "14.25rem",
						"--sidebar-width-icon": "3.75rem",
					} as React.CSSProperties
				}
			>
				<Sidebar collapsible="icon">
					<SidebarHeader className="h-14 p-0">
						<DashboardSidebarUser user={user} />
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarMenu>
								{dashboardLinks.map((link) => (
									<DashboardSidebarLink
										isActive={isActiveLink(pathname, link.to)}
										key={link.to}
										link={link}
									/>
								))}
							</SidebarMenu>
						</SidebarGroup>
					</SidebarContent>
					<DashboardSidebarFooter
						onOpenMcp={() => setMcpOpen(true)}
						onSignOut={handleSignOut}
						onThemeChange={applyTheme}
						theme={theme}
						user={user}
					/>
				</Sidebar>
				<SidebarInset className="h-screen min-h-0 overflow-hidden">
					<header className="sticky top-0 z-10 h-14 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur">
						<div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
							<div className="flex items-center gap-2">
								<SidebarTrigger />
								{pageHeader?.backHref ? (
									<Button
										nativeButton={false}
										render={<Link to={pageHeader.backHref} viewTransition />}
										size="icon-sm"
										variant="ghost"
									>
										<ArrowLeft className="size-4" />
										<span className="sr-only">Retour</span>
									</Button>
								) : null}
								<div className="min-w-0 leading-tight">
									<p className="font-medium text-[0.8125rem] text-foreground leading-tight">
										{pageHeader?.title}
									</p>
									<p className="truncate text-[0.6875rem] text-muted-foreground leading-tight">
										{pageHeader?.description}
									</p>
								</div>
							</div>
							<div
								className="flex shrink-0 items-center gap-2"
								id={DASHBOARD_HEADER_ACTIONS_PORTAL_ID}
							/>
						</div>
					</header>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 [view-transition-name:dashboard-content] sm:px-6">
						<Outlet />
					</div>
					<DashboardShellFooterPortalTargets />
				</SidebarInset>
				<McpConnectDialog onOpenChange={setMcpOpen} open={mcpOpen} />
			</SidebarProvider>
		</DashboardShellPortalProvider>
	);
}

function DashboardSidebarLink({
	isActive,
	link,
}: {
	isActive: boolean;
	link: (typeof dashboardLinks)[number];
}) {
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				className="h-10 rounded-full px-3 text-[0.9375rem] font-semibold group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! data-active:border data-active:border-(--primary-edge) data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:shadow-[2px_2px_0_var(--primary-edge)]"
				isActive={isActive}
				render={<Link to={link.to} viewTransition />}
				tooltip={link.label}
			>
				<link.icon className="size-4 shrink-0" />
				<SidebarLabel>{link.label}</SidebarLabel>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

function DashboardSidebarUser({
	user,
}: {
	user:
		| {
				email?: string;
				image?: string | null;
				name?: string;
		  }
		| null
		| undefined;
}) {
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const compact = isCollapsed && !isMobile;
	const avatarSize = compact ? "size-10" : "size-6.5";

	if (user === undefined) {
		return (
			<div
				className={cn(
					"flex h-full items-center gap-3 px-3",
					compact && "justify-center px-0",
				)}
			>
				<Skeleton className={cn("shrink-0 rounded-full", avatarSize)} />
				{compact ? null : <Skeleton className="h-3.5 w-28 rounded-md" />}
			</div>
		);
	}

	const userLabel = user?.name ?? user?.email ?? "Connecté";

	return (
		<div
			className={cn(
				"flex h-full min-w-0 items-center gap-3 px-3 text-sidebar-accent-foreground",
				compact && "justify-center px-0",
			)}
		>
			<Avatar
				className={cn(
					"border border-(--primary-edge) shadow-[2px_2px_0_var(--primary-edge)]",
					avatarSize,
				)}
				size={compact ? "lg" : "default"}
			>
				<AvatarImage alt={userLabel} src={user?.image ?? undefined} />
				<AvatarFallback className="bg-primary font-semibold text-primary-foreground">
					{getInitials(userLabel)}
				</AvatarFallback>
			</Avatar>
			{compact ? null : (
				<div className="min-w-0 leading-tight">
					<p className="text-xs text-muted-foreground">Bonjour,</p>
					<p className="truncate text-[0.9375rem] font-semibold">{userLabel}</p>
				</div>
			)}
		</div>
	);
}

function SessionFooter({
	className,
	onOpenMcp,
	onSignOut,
	user,
}: {
	className?: string;
	onOpenMcp: () => void;
	user:
		| {
				email?: string;
				image?: string | null;
				name?: string;
		  }
		| null
		| undefined;
	onSignOut: () => Promise<void>;
}) {
	const [apiKeyDrawerOpen, setApiKeyDrawerOpen] = useState(false);

	if (user === undefined) {
		return <SessionFooterSkeleton className={className} />;
	}

	const userLabel = user?.name ?? user?.email ?? "Connecté";

	return (
		<>
			<ApiKeyDrawer
				onOpenChange={setApiKeyDrawerOpen}
				open={apiKeyDrawerOpen}
				showTrigger={false}
			/>
			<div className={cn("rounded-xl", className)}>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								className="h-10 w-full justify-start rounded-xl px-3"
								variant="ghost"
							/>
						}
					>
						<div className="flex min-w-0 items-center gap-2 text-left">
							<Avatar className="size-6.5 border border-border/70">
								<AvatarImage alt={userLabel} src={user?.image ?? undefined} />
								<AvatarFallback>{getInitials(userLabel)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 space-y-0.5">
								<p className="truncate text-xs font-medium leading-tight">
									{userLabel}
								</p>
								<p className="truncate text-[11px] leading-tight text-muted-foreground">
									{user?.email ?? "Compte"}
								</p>
							</div>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="min-w-56"
						side="right"
						sideOffset={10}
					>
						<CompteMenuItems
							onOpenMcp={onOpenMcp}
							onOpenApiKeys={() => setApiKeyDrawerOpen(true)}
							onSignOut={onSignOut}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
}

function CompteMenuItems({
	onOpenMcp,
	onOpenApiKeys,
	onSignOut,
}: {
	onOpenMcp: () => void;
	onOpenApiKeys: () => void;
	onSignOut: () => Promise<void>;
}) {
	return (
		<>
			<DropdownMenuItem render={<a href="/api/docs" />}>
				<BookOpen className="size-4" />
				<span>Référence API</span>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={onOpenApiKeys}>
				<Key className="size-4" />
				<span>Clés API</span>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={onOpenMcp}>
				<Plug className="size-4" />
				<span>Connecter un agent (MCP)</span>
			</DropdownMenuItem>
			<DropdownMenuItem render={<Link to="/dashboard/profile" />}>
				<UserRound className="size-4" />
				<span>Profil</span>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => void onSignOut()} variant="destructive">
				<LogOut className="size-4" />
				<span>Déconnexion</span>
			</DropdownMenuItem>
		</>
	);
}

function SessionFooterSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("min-w-0 flex-1 rounded-xl", className)}>
			<div className="h-10 w-full px-3">
				<div className="flex h-full min-w-0 items-center gap-2">
					<Skeleton className="size-6.5 shrink-0 rounded-full" />
					<div className="min-w-0 flex-1 space-y-1">
						<Skeleton className="h-3 w-20 rounded-md" />
						<Skeleton className="h-2.5 w-28 rounded-md" />
					</div>
				</div>
			</div>
		</div>
	);
}

function CollapsedSessionFooterSkeleton() {
	return (
		<div className="flex size-10 items-center justify-center">
			<Skeleton className="size-8 rounded-full" />
		</div>
	);
}

function DashboardSidebarFooter({
	onOpenMcp,
	onThemeChange,
	theme,
	user,
	onSignOut,
}: {
	onOpenMcp: () => void;
	onThemeChange: (theme: "light" | "dark") => void;
	theme: "light" | "dark";
	user:
		| {
				email?: string;
				image?: string | null;
				name?: string;
		  }
		| null
		| undefined;
	onSignOut: () => Promise<void>;
}) {
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const [apiKeyDrawerOpen, setApiKeyDrawerOpen] = useState(false);
	const userLabel = user?.name ?? user?.email ?? "Connecté";

	if (isCollapsed && !isMobile) {
		if (user === undefined) {
			return (
				<SidebarFooter className="items-center gap-1">
					<DashboardSidebarCommandBar
						onOpenMcp={onOpenMcp}
						onSignOut={onSignOut}
						onThemeChange={onThemeChange}
						theme={theme}
					/>
					<ThemeToggle
						className="size-10"
						onThemeChange={onThemeChange}
						size="icon"
						theme={theme}
						variant="ghost"
					/>
					<CollapsedSessionFooterSkeleton />
				</SidebarFooter>
			);
		}

		return (
			<SidebarFooter className="items-center gap-1">
				<ApiKeyDrawer
					onOpenChange={setApiKeyDrawerOpen}
					open={apiKeyDrawerOpen}
					showTrigger={false}
				/>
				<DashboardSidebarCommandBar
					onOpenMcp={onOpenMcp}
					onSignOut={onSignOut}
					onThemeChange={onThemeChange}
					theme={theme}
				/>
				<ThemeToggle
					className="size-10"
					onThemeChange={onThemeChange}
					size="icon"
					theme={theme}
					variant="ghost"
				/>
				<DropdownMenu>
					<Tooltip>
						<TooltipTrigger
							render={
								<DropdownMenuTrigger
									render={
										<Button className="size-10" size="icon" variant="ghost" />
									}
								/>
							}
						>
							<Avatar className="border border-border/70">
								<AvatarImage alt={userLabel} src={user?.image ?? undefined} />
								<AvatarFallback>{getInitials(userLabel)}</AvatarFallback>
							</Avatar>
							<span className="sr-only">Ouvrir le menu du compte</span>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							Menu du compte
						</TooltipContent>
					</Tooltip>
					<DropdownMenuContent align="start" side="right" sideOffset={10}>
						<CompteMenuItems
							onOpenMcp={onOpenMcp}
							onOpenApiKeys={() => setApiKeyDrawerOpen(true)}
							onSignOut={onSignOut}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		);
	}

	return (
		<SidebarFooter className="space-y-2">
			<DashboardSidebarCommandBar
				onOpenMcp={onOpenMcp}
				onSignOut={onSignOut}
				onThemeChange={onThemeChange}
				theme={theme}
			/>
			<div className="flex items-center gap-2">
				<SessionFooter
					className="min-w-0 flex-1"
					onOpenMcp={onOpenMcp}
					onSignOut={onSignOut}
					user={user}
				/>
				<ThemeToggle compact onThemeChange={onThemeChange} theme={theme} />
			</div>
		</SidebarFooter>
	);
}

function ThemeToggle({
	className,
	compact = false,
	onThemeChange,
	size = "default",
	theme,
	variant = "outline",
}: Pick<
	React.ComponentProps<typeof Button>,
	"className" | "size" | "variant"
> & {
	compact?: boolean;
	onThemeChange: (theme: "light" | "dark") => void;
	theme: "light" | "dark";
}) {
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed";

	function toggleTheme() {
		onThemeChange(theme === "dark" ? "light" : "dark");
	}

	const Icon = theme === "dark" ? Sun : Moon;
	const label = theme === "dark" ? "Mode clair" : "Mode sombre";

	if (compact) {
		return (
			<Button
				className={cn("size-10 rounded-xl", className)}
				onClick={toggleTheme}
				size="icon"
				type="button"
				variant="ghost"
			>
				<Icon className="size-4" />
				<span className="sr-only">{label}</span>
			</Button>
		);
	}

	if (!isCollapsed || isMobile) {
		return (
			<div
				className={cn(
					"flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-background/60 px-2.5 py-1.5",
					className,
				)}
			>
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
						<Icon className="size-4" />
					</div>
					<div className="min-w-0" id="theme-toggle-label">
						<p className="text-sm font-medium">Mode sombre</p>
					</div>
				</div>
				<Switch
					aria-labelledby="theme-toggle-label"
					checked={theme === "dark"}
					onCheckedChange={(checked) =>
						onThemeChange(checked ? "dark" : "light")
					}
				/>
			</div>
		);
	}

	const collapsedButton = (
		<Button
			className={className}
			onClick={toggleTheme}
			size={size}
			variant={variant}
		>
			<Icon className="size-4" />
			{isCollapsed && !isMobile ? (
				<span className="sr-only">{label}</span>
			) : (
				<span>{label}</span>
			)}
		</Button>
	);

	if (isCollapsed && !isMobile) {
		return (
			<Tooltip>
				<TooltipTrigger render={collapsedButton} />
				<TooltipContent side="right" sideOffset={10}>
					{label}
				</TooltipContent>
			</Tooltip>
		);
	}

	return collapsedButton;
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed";

	return isCollapsed && !isMobile ? null : (
		<span className="truncate">{children}</span>
	);
}

function getInitials(value: string | undefined) {
	if (!value) {
		return "U";
	}

	const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

	if (!parts.length) {
		return "U";
	}

	return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function isActiveLink(pathname: string, to: string) {
	if (to === "/dashboard") {
		return pathname === "/dashboard" || pathname === "/dashboard/";
	}

	return pathname === to || pathname.startsWith(`${to}/`);
}

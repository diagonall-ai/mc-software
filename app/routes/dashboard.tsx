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
	Building2,
	Copy,
	Home,
	Key,
	Layers3,
	LogOut,
	Mail,
	Moon,
	Sun,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiKeyDrawer } from "~/components/api-keys/api-key-drawer";
import {
	DASHBOARD_HEADER_ACTIONS_PORTAL_ID,
	DashboardShellFooterPortalTargets,
	DashboardShellPortalProvider,
} from "~/components/dashboard/shell-portals";
import { DashboardSidebarCommandBar } from "~/components/dashboard/sidebar-command-bar";
import { OrganizationSwitcher } from "~/components/organizations/organization-switcher";
import { PendingInvitationsDrawer } from "~/components/organizations/pending-invitations-drawer";
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
import { ensureOrganizationForSession } from "~/lib/organization";
import { cn } from "~/lib/utils";

const dashboardLinks = [
	{ to: "/dashboard", label: "Dashboard", icon: Home },
	{ to: "/dashboard/design-system", label: "Design System", icon: Layers3 },
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
	const { data: activeOrganization, isPending: loadingActiveOrganization } =
		authClient.useActiveOrganization();
	const { data: organizations, isPending: loadingOrganizations } =
		authClient.useListOrganizations();

	useEffect(() => {
		if (!user?.email) return;
		if (loadingActiveOrganization || loadingOrganizations) return;
		void ensureOrganizationForSession(
			authClient,
			{ email: user.email, name: user.name },
			{
				activeOrganization: activeOrganization?.id
					? { id: activeOrganization.id }
					: null,
				organizations:
					organizations?.map((organization) => ({
						id: organization.id,
						name: organization.name,
					})) ?? null,
			},
		);
	}, [
		activeOrganization?.id,
		loadingActiveOrganization,
		loadingOrganizations,
		organizations,
		user?.email,
		user?.name,
	]);

	useEffect(() => {
		const root = document.documentElement;
		setTheme(root.classList.contains("dark") ? "dark" : "light");
	}, []);

	async function handleSignOut() {
		await authClient.signOut();
		navigate({ to: "/", viewTransition: true });
	}

	async function handleCopyMcpUrl() {
		const mcpUrl = `${window.location.origin}/api/mcp`;

		try {
			await navigator.clipboard.writeText(mcpUrl);
			toast.success("URL MCP copiée");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Copie de l’URL MCP impossible",
			);
		}
	}

	function applyTheme(nextTheme: "light" | "dark") {
		document.documentElement.classList.toggle("dark", nextTheme === "dark");
		window.localStorage.setItem("theme", nextTheme);
		setTheme(nextTheme);
	}

	return (
		<DashboardShellPortalProvider>
			<SidebarProvider className="fixed inset-0 overflow-hidden">
				<Sidebar>
					<SidebarHeader className="h-14 p-0">
						<DashboardSidebarOrganizationSwitcher />
					</SidebarHeader>
					<SidebarContent>
						<SidebarMenu>
							{dashboardLinks.map((link) => (
								<DashboardSidebarLink
									isActive={isActiveLink(pathname, link.to)}
									key={link.to}
									link={link}
								/>
							))}
						</SidebarMenu>
					</SidebarContent>
					<DashboardSidebarFooter
						onCopyMcpUrl={handleCopyMcpUrl}
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
									<Button asChild size="icon-sm" type="button" variant="ghost">
										<Link to={pageHeader.backHref} viewTransition>
											<ArrowLeft className="size-4" />
											<span className="sr-only">Retour</span>
										</Link>
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
	const { isCollapsed, isMobile } = useSidebar();
	const button = (
		<SidebarMenuButton asChild isActive={isActive}>
			<Link to={link.to} viewTransition>
				<link.icon className="size-4 shrink-0" />
				<SidebarLabel>{link.label}</SidebarLabel>
			</Link>
		</SidebarMenuButton>
	);

	return (
		<SidebarMenuItem>
			{isCollapsed && !isMobile ? (
				<Tooltip>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					<TooltipContent side="right" sideOffset={10}>
						{link.label}
					</TooltipContent>
				</Tooltip>
			) : (
				button
			)}
		</SidebarMenuItem>
	);
}

function DashboardSidebarOrganizationSwitcher() {
	const { isCollapsed } = useSidebar();

	return <OrganizationSwitcher isCollapsed={isCollapsed} />;
}

function SessionFooter({
	activeOrganization,
	className,
	onCopyMcpUrl,
	onSignOut,
	user,
}: {
	activeOrganization: { id: string } | null | undefined;
	className?: string;
	onCopyMcpUrl: () => Promise<void>;
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
	const [pendingInvitationsDrawerOpen, setPendingInvitationsDrawerOpen] =
		useState(false);

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
			<PendingInvitationsDrawer
				onOpenChange={setPendingInvitationsDrawerOpen}
				open={pendingInvitationsDrawerOpen}
				showTrigger={false}
			/>
			<div className={cn("rounded-xl", className)}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							className="h-10 w-full justify-start rounded-xl px-3"
							variant="ghost"
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
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-56"
						collisionPadding={12}
						side="right"
						sideOffset={10}
					>
						<CompteMenuItems
							activeOrganization={activeOrganization}
							onCopyMcpUrl={onCopyMcpUrl}
							onOpenApiKeys={() => setApiKeyDrawerOpen(true)}
							onOpenPendingInvitations={() =>
								setPendingInvitationsDrawerOpen(true)
							}
							onSignOut={onSignOut}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
}

function CompteMenuItems({
	activeOrganization,
	onCopyMcpUrl,
	onOpenApiKeys,
	onOpenPendingInvitations,
	onSignOut,
}: {
	activeOrganization: { id: string } | null | undefined;
	onCopyMcpUrl: () => Promise<void>;
	onOpenApiKeys: () => void;
	onOpenPendingInvitations: () => void;
	onSignOut: () => Promise<void>;
}) {
	return (
		<>
			<DropdownMenuItem asChild>
				<a href="/api/v1/docs">
					<BookOpen className="size-4" />
					<span>Référence API</span>
				</a>
			</DropdownMenuItem>
			<DropdownMenuItem onSelect={onOpenApiKeys}>
				<Key className="size-4" />
				<span>Clés API</span>
			</DropdownMenuItem>
			<DropdownMenuItem onSelect={onOpenPendingInvitations}>
				<Mail className="size-4" />
				<span>Invitations</span>
			</DropdownMenuItem>
			<DropdownMenuItem onSelect={() => void onCopyMcpUrl()}>
				<Copy className="size-4" />
				<span>Copier l’URL MCP</span>
			</DropdownMenuItem>
			{activeOrganization ? (
				<DropdownMenuItem asChild>
					<Link to="/dashboard/organization-settings">
						<Building2 className="size-4" />
						<span>Paramètres de l’organisation</span>
					</Link>
				</DropdownMenuItem>
			) : null}
			<DropdownMenuItem asChild>
				<Link to="/dashboard/profile">
					<UserRound className="size-4" />
					<span>Profil</span>
				</Link>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onSelect={() => void onSignOut()} variant="destructive">
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
		<div className="flex h-14 w-full items-center justify-center rounded-none border-0">
			<Skeleton className="size-8 rounded-full" />
		</div>
	);
}

function DashboardSidebarFooter({
	onCopyMcpUrl,
	onThemeChange,
	theme,
	user,
	onSignOut,
}: {
	onCopyMcpUrl: () => Promise<void>;
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
	const { data: activeOrganization } = authClient.useActiveOrganization();
	const { isCollapsed, isMobile } = useSidebar();
	const [apiKeyDrawerOpen, setApiKeyDrawerOpen] = useState(false);
	const [pendingInvitationsDrawerOpen, setPendingInvitationsDrawerOpen] =
		useState(false);
	const userLabel = user?.name ?? user?.email ?? "Connecté";

	if (isCollapsed && !isMobile) {
		if (user === undefined) {
			return (
				<SidebarFooter className="p-0">
					<DashboardSidebarCommandBar
						onCopyMcpUrl={onCopyMcpUrl}
						onSignOut={onSignOut}
						onThemeChange={onThemeChange}
						theme={theme}
					/>
					<ThemeToggle
						className="m-0 h-14 w-full rounded-none border-b border-border/70"
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
			<SidebarFooter className="p-0">
				<ApiKeyDrawer
					onOpenChange={setApiKeyDrawerOpen}
					open={apiKeyDrawerOpen}
					showTrigger={false}
				/>
				<DashboardSidebarCommandBar
					onCopyMcpUrl={onCopyMcpUrl}
					onSignOut={onSignOut}
					onThemeChange={onThemeChange}
					theme={theme}
				/>
				<PendingInvitationsDrawer
					onOpenChange={setPendingInvitationsDrawerOpen}
					open={pendingInvitationsDrawerOpen}
					showTrigger={false}
				/>
				<ThemeToggle
					className="m-0 h-14 w-full rounded-none border-b border-border/70"
					onThemeChange={onThemeChange}
					size="icon"
					theme={theme}
					variant="ghost"
				/>
				<DropdownMenu>
					<Tooltip>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<Button
									className="m-0 h-14 w-full rounded-none border-0"
									size="icon"
									variant="ghost"
								>
									<Avatar className="size-8 border border-border/70" size="lg">
										<AvatarImage
											alt={userLabel}
											src={user?.image ?? undefined}
										/>
										<AvatarFallback>{getInitials(userLabel)}</AvatarFallback>
									</Avatar>
									<span className="sr-only">Ouvrir le menu du compte</span>
								</Button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							Menu du compte
						</TooltipContent>
					</Tooltip>
					<DropdownMenuContent
						align="start"
						collisionPadding={12}
						side="right"
						sideOffset={10}
					>
						<CompteMenuItems
							activeOrganization={activeOrganization}
							onCopyMcpUrl={onCopyMcpUrl}
							onOpenApiKeys={() => setApiKeyDrawerOpen(true)}
							onOpenPendingInvitations={() =>
								setPendingInvitationsDrawerOpen(true)
							}
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
				onCopyMcpUrl={onCopyMcpUrl}
				onSignOut={onSignOut}
				onThemeChange={onThemeChange}
				theme={theme}
			/>
			<div className="flex items-center gap-2">
				<SessionFooter
					activeOrganization={activeOrganization}
					className="min-w-0 flex-1"
					onCopyMcpUrl={onCopyMcpUrl}
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
	const { isCollapsed, isMobile } = useSidebar();

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
				<TooltipTrigger asChild>{collapsedButton}</TooltipTrigger>
				<TooltipContent side="right" sideOffset={10}>
					{label}
				</TooltipContent>
			</Tooltip>
		);
	}

	return collapsedButton;
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
	const { isCollapsed, isMobile } = useSidebar();

	return isCollapsed && !isMobile ? null : (
		<span className="whitespace-nowrap font-sans text-[0.8125rem] leading-tight">
			{children}
		</span>
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

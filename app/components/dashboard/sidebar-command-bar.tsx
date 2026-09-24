import { useNavigate } from "@tanstack/react-router";
import {
	Command,
	Copy,
	Home,
	LogOut,
	Moon,
	Sparkles,
	Sun,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "~/components/ui/command";
import { useSidebar } from "~/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

type DashboardSidebarCommandBarProps = {
	onCopyMcpUrl: () => Promise<void>;
	onSignOut: () => Promise<void>;
	onThemeChange: (theme: "light" | "dark") => void;
	theme: "light" | "dark";
};

export function DashboardSidebarCommandBar({
	onCopyMcpUrl,
	onSignOut,
	onThemeChange,
	theme,
}: DashboardSidebarCommandBarProps) {
	const { isMobile, state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				!(event.metaKey || event.ctrlKey) ||
				event.key.toLowerCase() !== "k"
			) {
				return;
			}

			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target instanceof HTMLInputElement ||
					target instanceof HTMLTextAreaElement ||
					target instanceof HTMLSelectElement)
			) {
				return;
			}

			event.preventDefault();
			setOpen(true);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (isCollapsed && !isMobile) {
		return (
			<>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								className="size-10"
								onClick={() => setOpen(true)}
								size="icon"
								type="button"
								variant="ghost"
							/>
						}
					>
						<Command className="size-4" />
						<span className="sr-only">Rechercher une commande</span>
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={10}>
						Rechercher
					</TooltipContent>
				</Tooltip>
				<DashboardCommandDialog
					onCopyMcpUrl={onCopyMcpUrl}
					onOpenChange={setOpen}
					onSignOut={onSignOut}
					onThemeChange={onThemeChange}
					open={open}
					theme={theme}
				/>
			</>
		);
	}

	return (
		<>
			<Button
				className="h-9 w-full justify-between px-3 text-muted-foreground"
				onClick={() => setOpen(true)}
				type="button"
				variant="outline"
			>
				<span className="flex items-center gap-2">
					<Command className="size-4" />
					<span className="text-sm">Rechercher</span>
				</span>
				<CommandShortcut className="ml-2.5 inline-flex">⌘K</CommandShortcut>
			</Button>
			<DashboardCommandDialog
				onCopyMcpUrl={onCopyMcpUrl}
				onOpenChange={setOpen}
				onSignOut={onSignOut}
				onThemeChange={onThemeChange}
				open={open}
				theme={theme}
			/>
		</>
	);
}

function DashboardCommandDialog({
	onCopyMcpUrl,
	onOpenChange,
	onSignOut,
	onThemeChange,
	open,
	theme,
}: {
	onCopyMcpUrl: () => Promise<void>;
	onOpenChange: (open: boolean) => void;
	onSignOut: () => Promise<void>;
	onThemeChange: (theme: "light" | "dark") => void;
	open: boolean;
	theme: "light" | "dark";
}) {
	const navigate = useNavigate();

	return (
		<CommandDialog
			description="Rechercher une page ou une action."
			onOpenChange={onOpenChange}
			open={open}
			title="Commandes"
		>
			<CommandInput placeholder="Rechercher..." />
			<CommandList>
				<CommandEmpty>Aucun résultat.</CommandEmpty>
				<CommandGroup heading="Navigation">
					<CommandItem
						onSelect={() => {
							onOpenChange(false);
							void navigate({ to: "/dashboard", viewTransition: true });
						}}
					>
						<Home className="size-4" />
						Tableau de bord
					</CommandItem>
					<CommandItem
						onSelect={() => {
							onOpenChange(false);
							void navigate({
								to: "/dashboard/assistant",
								viewTransition: true,
							});
						}}
					>
						<Sparkles className="size-4" />
						Assistant
					</CommandItem>
					<CommandItem
						onSelect={() => {
							onOpenChange(false);
							void navigate({ to: "/dashboard/profile", viewTransition: true });
						}}
					>
						<UserRound className="size-4" />
						Profil
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Actions">
					{theme === "dark" ? (
						<CommandItem
							onSelect={() => {
								onOpenChange(false);
								onThemeChange("light");
							}}
						>
							<Sun className="size-4" />
							Mode clair
						</CommandItem>
					) : (
						<CommandItem
							onSelect={() => {
								onOpenChange(false);
								onThemeChange("dark");
							}}
						>
							<Moon className="size-4" />
							Mode sombre
						</CommandItem>
					)}
					<CommandItem
						onSelect={() => {
							onOpenChange(false);
							void onCopyMcpUrl();
						}}
					>
						<Copy className="size-4" />
						Copier l’URL MCP
					</CommandItem>
					<CommandItem
						onSelect={() => {
							onOpenChange(false);
							void onSignOut();
						}}
					>
						<LogOut className="size-4" />
						Déconnexion
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}

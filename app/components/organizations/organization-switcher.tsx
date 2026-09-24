"use client";

import { useNavigate, useRouter } from "@tanstack/react-router";
import { Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";
import { CreateOrganizationDialog } from "./create-organization-dialog";

export function OrganizationSwitcher({
	isCollapsed = false,
}: {
	isCollapsed?: boolean;
}) {
	const navigate = useNavigate();
	const router = useRouter();
	const { data: activeOrganization, isPending: loadingActiveOrganization } =
		authClient.useActiveOrganization();
	const { data: organizations, isPending: loadingOrganizations } =
		authClient.useListOrganizations();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [error, setError] = useState("");
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [switchingOrganizationId, setSwitchingOrganizationId] = useState<
		string | null
	>(null);
	const currentOrganization = activeOrganization ?? null;
	const filteredOrganizations = useMemo(() => {
		if (!organizations?.length) {
			return [];
		}

		const query = search.trim().toLowerCase();
		if (!query) {
			return organizations;
		}

		return organizations.filter((organization) =>
			organization.name.toLowerCase().includes(query),
		);
	}, [organizations, search]);

	async function handleSwitchOrganization(organizationId: string) {
		if (organizationId === activeOrganization?.id) {
			setOpen(false);
			return;
		}

		setError("");
		setSwitchingOrganizationId(organizationId);
		try {
			const { error: setActiveError } = await authClient.organization.setActive(
				{ organizationId },
			);

			if (setActiveError) {
				setError(
					setActiveError.message ?? "Changement d’organisation impossible",
				);
				return;
			}

			authClient.$store.notify("$sessionSignal");
			setOpen(false);
			setSearch("");
			await navigate({ replace: true, to: "/dashboard", viewTransition: true });
			await router.invalidate();
		} finally {
			setSwitchingOrganizationId(null);
		}
	}

	const organizationLabel = currentOrganization?.name ?? "Choisir un espace";
	const triggerButton = (
		<Button
			className="h-full w-full justify-between rounded-none border-0 bg-transparent px-2 text-left text-sidebar-accent-foreground shadow-none hover:bg-sidebar-accent/70"
			variant="ghost"
		>
			<div
				className={`flex min-w-0 items-center ${isCollapsed ? "w-full justify-center gap-0" : "gap-3"}`}
			>
				<Avatar
					className={cn(
						"border border-sidebar-border/70 bg-sidebar-accent",
						isCollapsed ? "size-10" : "size-6.5",
					)}
					size={isCollapsed ? "lg" : "default"}
				>
					<AvatarImage
						alt={currentOrganization?.name ?? "Organisation"}
						src={currentOrganization?.logo ?? undefined}
					/>
					<AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
						{getInitials(currentOrganization?.name)}
					</AvatarFallback>
				</Avatar>
				{isCollapsed ? null : (
					<p className="truncate text-sm font-semibold tracking-tight">
						{organizationLabel}
					</p>
				)}
			</div>
			{isCollapsed ? null : (
				<ChevronDown className="size-4 shrink-0 text-sidebar-accent-foreground/70" />
			)}
		</Button>
	);

	return (
		<>
			<Popover onOpenChange={setOpen} open={open}>
				{loadingActiveOrganization || loadingOrganizations ? (
					<PopoverTrigger asChild>
						<OrganizationSwitcherSkeleton isCollapsed={isCollapsed} />
					</PopoverTrigger>
				) : isCollapsed ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							{organizationLabel}
						</TooltipContent>
					</Tooltip>
				) : (
					<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
				)}
				<PopoverContent
					align="start"
					alignOffset={4}
					className="w-[16.5rem] rounded-md border-border/60 p-0 shadow-lg"
					collisionPadding={12}
					side="right"
					sideOffset={12}
				>
					<div className="border-b border-border/60 p-2">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="h-7.5 border-0 bg-transparent px-2 pl-7.5 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Rechercher une organisation"
								value={search}
							/>
						</div>
					</div>
					<div className="p-2 pt-1.5">
						{loadingOrganizations ? (
							<div className="flex items-center justify-center rounded-md border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
								<Loader2 className="mr-2 size-4 animate-spin" />
								Chargement des organisations
							</div>
						) : filteredOrganizations.length ? (
							<ScrollArea className="max-h-56 pr-1">
								<div className="space-y-1">
									{filteredOrganizations.map((organization) => {
										const isActive = organization.id === activeOrganization?.id;
										const isSwitching =
											switchingOrganizationId === organization.id;

										return (
											<button
												className={cn(
													"flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors",
													isActive
														? "border-primary/25 bg-primary/5"
														: "border-border/60 bg-background hover:bg-accent/40",
												)}
												key={organization.id}
												onClick={() =>
													void handleSwitchOrganization(organization.id)
												}
												type="button"
											>
												<Avatar className="size-6 shrink-0 border border-border/70">
													<AvatarImage
														alt={organization.name}
														src={organization.logo ?? undefined}
													/>
													<AvatarFallback>
														{getInitials(organization.name)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium leading-none">
														{organization.name}
													</p>
												</div>
												<div className="flex size-4 shrink-0 items-center justify-center">
													{isSwitching ? (
														<Loader2 className="size-4 animate-spin text-muted-foreground" />
													) : isActive ? (
														<Check className="size-4 text-primary" />
													) : null}
												</div>
											</button>
										);
									})}
								</div>
							</ScrollArea>
						) : (
							<div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-center">
								<p className="text-sm font-medium">
									{search.trim()
										? "Aucune organisation trouvée"
										: "Aucune organisation"}
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{search.trim()
										? "Essayez un autre nom."
										: "Créez une première organisation pour commencer."}
								</p>
							</div>
						)}
						{error ? (
							<p className="px-1 text-sm text-destructive">{error}</p>
						) : null}
					</div>
					<div className="border-t border-border/60 p-2">
						<Button
							className="h-8 w-full justify-center rounded-md border-border/60"
							onClick={() => setCreateDialogOpen(true)}
							type="button"
							variant="outline"
						>
							<Plus className="size-4" />
							Créer une organisation
						</Button>
					</div>
				</PopoverContent>
			</Popover>
			<CreateOrganizationDialog
				onCreated={() => {
					setCreateDialogOpen(false);
					setOpen(false);
				}}
				onOpenChange={setCreateDialogOpen}
				open={createDialogOpen}
			/>
		</>
	);
}

function getInitials(value: string | undefined) {
	if (!value) {
		return "O";
	}

	const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
	if (!parts.length) {
		return "O";
	}

	return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function OrganizationSwitcherSkeleton({
	isCollapsed,
}: {
	isCollapsed: boolean;
}) {
	return (
		<div className="h-full w-full px-2.5">
			<div className="flex h-full items-center justify-between gap-3">
				<div
					className={cn(
						"flex min-w-0 items-center",
						isCollapsed ? "w-full justify-center gap-0" : "gap-3",
					)}
				>
					<Skeleton
						className={cn(
							"shrink-0 rounded-full",
							isCollapsed ? "size-10" : "size-7",
						)}
					/>
					{isCollapsed ? null : <Skeleton className="h-4 w-28 rounded-md" />}
				</div>
				{isCollapsed ? null : (
					<Skeleton className="size-4 shrink-0 rounded-sm" />
				)}
			</div>
		</div>
	);
}

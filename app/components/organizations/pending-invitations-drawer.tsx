"use client";

import { Loader2, Mail, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "~/components/ui/drawer";
import { authClient } from "~/lib/auth-client";

type InvitationLike = {
	email: string;
	expiresAt?: Date | string | number | null;
	id?: string;
	invitationId?: string;
	organizationId?: string | null;
	organizationName?: string | null;
	organizationSlug?: string | null;
	role?: string | null;
	status?: string | null;
};

export function PendingInvitationsDrawer({
	collapsed = false,
	onOpenChange,
	open: controlledOpen,
	showTrigger = true,
}: {
	collapsed?: boolean;
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	showTrigger?: boolean;
}) {
	const [error, setError] = useState("");
	const [invitations, setInvitations] = useState<InvitationLike[]>([]);
	const [loading, setLoading] = useState(false);
	const [processingInvitationId, setProcessingInvitationId] = useState<
		string | null
	>(null);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;

	function handleOpenChange(nextOpen: boolean) {
		onOpenChange?.(nextOpen);
		if (controlledOpen === undefined) {
			setUncontrolledOpen(nextOpen);
		}
	}

	const loadInvitations = useCallback(async () => {
		setLoading(true);
		setError("");

		try {
			const result = await authClient.organization.listUserInvitations();
			const data =
				"data" in result
					? normalizeCollection<InvitationLike>(result.data)
					: normalizeCollection<InvitationLike>(result);
			setInvitations(data.filter(isInvitationLike));
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Chargement des invitations impossible",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		void loadInvitations();
	}, [loadInvitations, open]);

	async function handleAcceptInvitation(invitation: InvitationLike) {
		const invitationId = getInvitationId(invitation);
		if (!invitationId) {
			toast.error("ID d’invitation manquant");
			return;
		}

		setProcessingInvitationId(invitationId);

		try {
			const { data, error } = await authClient.organization.acceptInvitation({
				invitationId,
			});
			if (error) {
				throw new Error(
					error.message ?? "Acceptation de l’invitation impossible",
				);
			}

			const acceptedOrganizationId =
				readString(data, "organizationId") ??
				readNestedString(data, "organization", "id") ??
				invitation.organizationId;

			if (acceptedOrganizationId) {
				const { error: setActiveError } =
					await authClient.organization.setActive({
						organizationId: acceptedOrganizationId,
					});
				if (setActiveError) {
					throw new Error(
						setActiveError.message ??
							"L’invitation est acceptée, mais le changement d’organisation a échoué",
					);
				}
			}

			await loadInvitations();
			toast.success("Invitation acceptée");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Acceptation de l’invitation impossible",
			);
		} finally {
			setProcessingInvitationId(null);
		}
	}

	return (
		<Drawer direction="right" onOpenChange={handleOpenChange} open={open}>
			{showTrigger ? (
				<DrawerTrigger asChild>
					<Button
						className={
							collapsed
								? "m-0 h-16 w-full rounded-none border-b border-border-70"
								: "justify-start border-border/70"
						}
						size={collapsed ? "icon" : "default"}
						variant={collapsed ? "ghost" : "outline"}
					>
						<Mail className="size-4" />
						{collapsed ? (
							<span className="sr-only">Invitations</span>
						) : (
							<span>Invitations</span>
						)}
					</Button>
				</DrawerTrigger>
			) : null}
			<DrawerContent className="w-full border-border/70 sm:w-[40rem] sm:max-w-[40rem]">
				<DrawerHeader className="border-b border-border/70 px-6 py-5 text-left">
					<DrawerTitle className="text-lg">Invitations</DrawerTitle>
					<DrawerDescription className="max-w-lg text-sm leading-6">
						Consultez les invitations reçues et basculez dans l’organisation dès
						acceptation.
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
					<div className="space-y-3">
						<div>
							<h3 className="text-sm font-medium text-foreground">
								Vos invitations
							</h3>
							<p className="text-sm text-muted-foreground">
								Les invitations acceptées deviennent immédiatement votre
								organisation active.
							</p>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						{loading ? (
							<div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
								<Loader2 className="mr-2 size-4 animate-spin" />
								Chargement des invitations
							</div>
						) : !invitations.length ? (
							<div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center">
								<Mail className="mx-auto size-8 text-muted-foreground/60" />
								<p className="mt-3 text-sm text-muted-foreground">
									Aucune invitation en attente.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{invitations.map((invitation) => {
									const invitationId = getInvitationId(invitation);
									const isProcessing =
										invitationId !== null &&
										processingInvitationId === invitationId;

									return (
										<div
											className="rounded-2xl border border-border/70 bg-accent px-5 py-5"
											key={invitationId ?? invitation.email}
										>
											<div className="flex items-start justify-between gap-4">
												<div className="min-w-0 flex-1 space-y-2">
													<div className="space-y-1">
														<p className="truncate text-lg font-semibold text-foreground">
															{invitation.organizationName ??
																invitation.organizationSlug ??
																"Invitation d’organisation"}
														</p>
														<p className="text-sm text-muted-foreground">
															{invitation.email}
														</p>
													</div>
													<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
														<Badge variant="outline">
															{invitation.role === "admin" ? "admin" : "membre"}
														</Badge>
														{invitation.status ? (
															<Badge variant="secondary">
																{invitation.status}
															</Badge>
														) : null}
														<span>
															Expire le {formatCreatedAt(invitation.expiresAt)}
														</span>
													</div>
												</div>
												<Button
													disabled={isProcessing || !invitationId}
													onClick={() =>
														void handleAcceptInvitation(invitation)
													}
													size="sm"
													type="button"
												>
													{isProcessing ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														<UserCheck className="size-4" />
													)}
													Accepter
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function normalizeCollection<T>(
	value: T[] | { data?: T[] } | undefined | null,
) {
	if (Array.isArray(value)) {
		return value;
	}
	return value?.data ?? [];
}

function isInvitationLike(value: unknown): value is InvitationLike {
	if (!value || typeof value !== "object") {
		return false;
	}

	const record = value as Record<string, unknown>;
	return typeof record.email === "string";
}

function getInvitationId(invitation: InvitationLike) {
	return invitation.id ?? invitation.invitationId ?? null;
}

function readString(value: unknown, key: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const fieldValue = record[key];
	return typeof fieldValue === "string" ? fieldValue : null;
}

function readNestedString(value: unknown, objectKey: string, key: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	return readString(record[objectKey], key);
}

function formatCreatedAt(createdAt: Date | string | number | null | undefined) {
	if (!createdAt) {
		return "Inconnu";
	}

	return new Intl.DateTimeFormat("fr-FR", {
		dateStyle: "long",
	}).format(new Date(createdAt));
}

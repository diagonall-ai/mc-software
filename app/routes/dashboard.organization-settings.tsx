import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Camera,
	ChevronRight,
	Clock3,
	Loader2,
	MailPlus,
	Settings2,
	Trash2,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/dashboard/organization-settings")({
	staticData: {
		dashboardHeader: {
			description:
				"Modifier le profil de l’organisation active et les accès de l’équipe.",
			title: "Paramètres de l’organisation",
		},
	},
	component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
	const { data: activeOrganization, isPending } =
		authClient.useActiveOrganization();
	const [draft, setDraft] = useState(
		createOrganizationDraft(activeOrganization),
	);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
	const [isSaving, setIsSaving] = useState(false);
	const [isInviting, setIsInviting] = useState(false);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);
	const [processingInvitationId, setProcessingInvitationId] = useState<
		string | null
	>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const organizationId = activeOrganization?.id;
	const [organizationInvitations, setOrganizationInvitations] = useState<
		InvitationLike[]
	>([]);
	const [loadingOrganizationInvitations, setLoadingOrganizationInvitations] =
		useState(false);

	const loadOrganizationInvitations = useCallback(async () => {
		if (!organizationId) {
			setOrganizationInvitations([]);
			return;
		}

		setLoadingOrganizationInvitations(true);
		try {
			const { data, error } = await authClient.organization.listInvitations({
				query: { organizationId },
			});
			if (error) {
				throw new Error(
					error.message ?? "Chargement des invitations impossible",
				);
			}
			setOrganizationInvitations(
				normalizeCollection<InvitationLike>(data)
					.filter(isInvitationLike)
					.filter(isOutstandingInvitation),
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Chargement des invitations impossible",
			);
		} finally {
			setLoadingOrganizationInvitations(false);
		}
	}, [organizationId]);

	useEffect(() => {
		setDraft(createOrganizationDraft(activeOrganization));
	}, [activeOrganization]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			if (cancelled) {
				return;
			}
			await loadOrganizationInvitations();
		})();

		return () => {
			cancelled = true;
		};
	}, [loadOrganizationInvitations]);

	const hasChanges =
		!!activeOrganization && hasOrganizationChanges(draft, activeOrganization);
	const isFormDisabled = isSaving || isUploadingLogo;

	async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const validationError = validateOrganizationLogoFile(file);
		if (validationError) {
			toast.error(validationError);
			event.target.value = "";
			return;
		}

		setIsUploadingLogo(true);

		try {
			const logo = await convertImageFileToDataUrl(file);
			setDraft((currentDraft) => ({
				...currentDraft,
				logo,
			}));
			toast.success("Image de l’organisation mise à jour");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Mise à jour de l’image impossible",
			);
		} finally {
			setIsUploadingLogo(false);
			event.target.value = "";
		}
	}

	if (isPending) {
		return (
			<Card className="border-border/70">
				<CardContent className="p-6">
					<p className="text-sm text-muted-foreground">
						Chargement des paramètres de l’organisation...
					</p>
				</CardContent>
			</Card>
		);
	}

	if (!activeOrganization) {
		return (
			<div className="space-y-6">
				<Card className="overflow-hidden border-border/70">
					<CardHeader className="gap-3 border-b border-border/70 bg-card/70">
						<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<Settings2 className="size-4" />
							Paramètres de l’organisation
						</div>
						<div className="space-y-2">
							<CardTitle className="text-3xl">
								Aucune organisation active
							</CardTitle>
							<CardDescription className="max-w-2xl text-sm leading-6">
								Créez ou sélectionnez une organisation dans la barre latérale
								avant de gérer ses paramètres.
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="p-6">
						<div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Besoin d’un espace d’abord ?
								</p>
								<p className="text-sm text-muted-foreground">
									Créez-en un depuis le sélecteur d’organisation en haut de la
									barre latérale.
								</p>
							</div>
							<Button asChild variant="outline">
								<Link to="/dashboard">
									Retour au tableau de bord
									<ChevronRight className="size-4" />
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
			<Card className="overflow-hidden border-border/70">
				<CardHeader className="gap-3 border-b border-border/70 bg-card/70">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Settings2 className="size-4" />
						Paramètres de l’organisation
					</div>
					<div className="space-y-2">
						<CardTitle className="text-3xl">
							{activeOrganization.name}
						</CardTitle>
						<CardDescription className="max-w-2xl text-sm leading-6">
							Modifiez le profil de l’organisation active et gérez les
							invitations depuis le même écran.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<form
						className="space-y-6"
						onSubmit={(event) =>
							void handleSaveOrganization(event, {
								activeOrganization,
								draft,
								onSaved: async () => {},
								setIsSaving,
							})
						}
					>
						<div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex items-center gap-4">
									<Avatar className="size-18 border border-border/70" size="lg">
										<AvatarImage
											alt={draft.name.trim() || activeOrganization.name}
											src={draft.logo || activeOrganization.logo || undefined}
										/>
										<AvatarFallback>
											{getInitials(draft.name || activeOrganization.name)}
										</AvatarFallback>
									</Avatar>
									<div className="space-y-1">
										<p className="font-medium text-foreground">
											Image de l’organisation
										</p>
										<p className="text-sm text-muted-foreground">
											Importez une image carrée pour un meilleur rendu. PNG, JPG
											ou WebP jusqu’à 5 Mo.
										</p>
									</div>
								</div>
								<Badge variant="outline">
									Créée le {formatCreatedAt(activeOrganization.createdAt)}
								</Badge>
							</div>
							<div className="flex flex-wrap gap-3">
								<input
									accept="image/*"
									className="hidden"
									disabled={isFormDisabled}
									onChange={handleLogoChange}
									ref={fileInputRef}
									type="file"
								/>
								<Button
									disabled={isFormDisabled}
									onClick={() => fileInputRef.current?.click()}
									type="button"
									variant="outline"
								>
									<Camera className="size-4" />
									<span>
										{isUploadingLogo
											? "Import…"
											: draft.logo || activeOrganization.logo
												? "Changer la photo"
												: "Importer une photo"}
									</span>
								</Button>
								<Button
									disabled={isFormDisabled || !draft.logo}
									onClick={() =>
										setDraft((currentDraft) => ({
											...currentDraft,
											logo: "",
										}))
									}
									type="button"
									variant="ghost"
								>
									<Trash2 className="size-4" />
									Retirer l’image
								</Button>
							</div>
						</div>
						<FieldGroup>
							<Field>
								<FieldContent>
									<FieldLabel htmlFor="organization-name">Nom</FieldLabel>
									<Input
										disabled={isFormDisabled}
										id="organization-name"
										maxLength={80}
										onChange={(event) =>
											setDraft((currentDraft) => ({
												...currentDraft,
												name: event.target.value,
											}))
										}
										placeholder="Northwind Studio"
										value={draft.name}
									/>
									<FieldDescription>
										Affiché dans le sélecteur et les écrans visibles par les
										membres.
									</FieldDescription>
								</FieldContent>
							</Field>
							<Field>
								<FieldContent>
									<FieldLabel htmlFor="organization-slug">Slug</FieldLabel>
									<Input
										autoCapitalize="none"
										disabled={isFormDisabled}
										id="organization-slug"
										maxLength={80}
										onChange={(event) =>
											setDraft((currentDraft) => ({
												...currentDraft,
												slug: event.target.value,
											}))
										}
										placeholder="northwind-studio"
										value={draft.slug}
									/>
									<FieldDescription>
										Le slug est optionnel, mais il garde des URL lisibles.
									</FieldDescription>
								</FieldContent>
							</Field>
						</FieldGroup>
						<div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-end">
							<div className="flex gap-3">
								<Button
									disabled={isFormDisabled || !hasChanges}
									onClick={() =>
										setDraft(createOrganizationDraft(activeOrganization))
									}
									type="button"
									variant="outline"
								>
									Réinitialiser
								</Button>
								<Button disabled={isFormDisabled || !hasChanges} type="submit">
									{isSaving
										? "Enregistrement..."
										: "Enregistrer l’organisation"}
								</Button>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
			<div className="space-y-6">
				<Card className="border-border/70">
					<CardHeader className="gap-2 border-b border-border/70 bg-card/70">
						<CardTitle className="text-lg">Inviter l’équipe</CardTitle>
						<CardDescription>
							Envoyez des invitations sans quitter l’espace courant.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 p-6">
						<form
							className="space-y-4"
							onSubmit={(event) =>
								void handleInviteMember(event, {
									inviteEmail,
									inviteRole,
									organizationId: activeOrganization.id,
									onInvited: async () => {
										setInviteEmail("");
										await loadOrganizationInvitations();
									},
									setIsInviting,
								})
							}
						>
							<div className="space-y-2">
								<Label htmlFor="invite-email">Email</Label>
								<Input
									autoCapitalize="none"
									disabled={isInviting}
									id="invite-email"
									onChange={(event) => setInviteEmail(event.target.value)}
									placeholder="teammate@example.com"
									type="email"
									value={inviteEmail}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="invite-role">Rôle</Label>
								<select
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
									disabled={isInviting}
									id="invite-role"
									onChange={(event) =>
										setInviteRole(event.target.value as "member" | "admin")
									}
									value={inviteRole}
								>
									<option value="member">Membre</option>
									<option value="admin">Admin</option>
								</select>
							</div>
							<Button
								disabled={isInviting || !inviteEmail.trim()}
								type="submit"
								className="w-full"
							>
								{isInviting ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<MailPlus className="size-4" />
								)}
								{isInviting ? "Envoi..." : "Envoyer l’invitation"}
							</Button>
						</form>
						<Separator />
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="font-medium text-foreground">
										Invitations en attente
									</p>
									<p className="text-sm text-muted-foreground">
										Suivez les emails invités. Pour relancer, invitez de nouveau
										la même adresse.
									</p>
								</div>
								<Badge variant="secondary">
									{loadingOrganizationInvitations
										? "Chargement"
										: `${organizationInvitations.length} au total`}
								</Badge>
							</div>
							{loadingOrganizationInvitations ? (
								<LoadingState label="Chargement des invitations..." />
							) : organizationInvitations.length ? (
								<div className="space-y-3">
									{organizationInvitations.map((invitation) => {
										const invitationId = getInvitationId(invitation);
										const isProcessing =
											invitationId !== null &&
											processingInvitationId === invitationId;
										return (
											<div
												className="rounded-2xl border border-border/70 bg-background/70 p-4"
												key={invitationId ?? invitation.email}
											>
												<div className="flex items-start justify-between gap-4">
													<div className="min-w-0 space-y-1">
														<p className="truncate font-medium text-foreground">
															{invitation.email}
														</p>
														<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
															<Badge variant="outline">
																{invitation.role === "admin"
																	? "admin"
																	: "membre"}
															</Badge>
															<Badge variant="secondary">
																{invitation.status}
															</Badge>
															<span>
																Expire le{" "}
																{formatCreatedAt(invitation.expiresAt)}
															</span>
														</div>
													</div>
													{invitationId ? (
														<Button
															disabled={isProcessing}
															onClick={() =>
																void handleCancelInvitation(invitationId, {
																	onCompleted: async () => {
																		await loadOrganizationInvitations();
																	},
																	setOrganizationInvitations,
																	setProcessingInvitationId,
																})
															}
															size="sm"
															type="button"
															variant="ghost"
														>
															{isProcessing ? (
																<Loader2 className="size-4 animate-spin" />
															) : (
																<X className="size-4" />
															)}
															Annuler
														</Button>
													) : null}
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<EmptyState
									description="Invitez des collaborateurs depuis cette page quand l’accès doit être partagé."
									title="Aucune invitation en attente"
								/>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function LoadingState({ label }: { label: string }) {
	return (
		<div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-8 text-sm text-muted-foreground">
			<Loader2 className="mr-2 size-4 animate-spin" />
			{label}
		</div>
	);
}

function EmptyState({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-center">
			<div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
				<Clock3 className="size-4" />
			</div>
			<p className="mt-4 font-medium text-foreground">{title}</p>
			<p className="mt-1 text-sm leading-6 text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

type OrganizationDraft = {
	logo: string;
	name: string;
	slug: string;
};

type OrganizationLike = {
	createdAt?: Date | string | number | null;
	id: string;
	logo?: string | null;
	name: string;
	slug: string;
};

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

function createOrganizationDraft(
	organization: OrganizationLike | null | undefined,
) {
	return {
		logo: organization?.logo ?? "",
		name: organization?.name ?? "",
		slug: organization?.slug ?? "",
	} satisfies OrganizationDraft;
}

function hasOrganizationChanges(
	draft: OrganizationDraft,
	organization: OrganizationLike,
) {
	return (
		draft.name.trim() !== organization.name ||
		draft.slug.trim() !== organization.slug ||
		normalizeOptionalString(draft.logo) !== (organization.logo ?? undefined)
	);
}

async function handleSaveOrganization(
	event: FormEvent<HTMLFormElement>,
	{
		activeOrganization,
		draft,
		onSaved,
		setIsSaving,
	}: {
		activeOrganization: OrganizationLike;
		draft: OrganizationDraft;
		onSaved: () => Promise<void>;
		setIsSaving: (value: boolean) => void;
	},
) {
	event.preventDefault();
	setIsSaving(true);

	try {
		const { error } = await authClient.organization.update({
			data: {
				logo: normalizeOptionalString(draft.logo),
				name: draft.name.trim(),
				slug: draft.slug.trim(),
			},
			organizationId: activeOrganization.id,
		});

		if (error) {
			throw new Error(
				error.message ?? "Mise à jour de l’organisation impossible",
			);
		}

		await onSaved();
		toast.success("Organisation mise à jour");
	} catch (error) {
		toast.error(
			error instanceof Error
				? error.message
				: "Mise à jour de l’organisation impossible",
		);
	} finally {
		setIsSaving(false);
	}
}

async function handleInviteMember(
	event: FormEvent<HTMLFormElement>,
	{
		inviteEmail,
		inviteRole,
		organizationId,
		onInvited,
		setIsInviting,
	}: {
		inviteEmail: string;
		inviteRole: "member" | "admin";
		organizationId: string;
		onInvited: () => Promise<void>;
		setIsInviting: (value: boolean) => void;
	},
) {
	event.preventDefault();
	setIsInviting(true);

	try {
		const { error } = await authClient.organization.inviteMember({
			email: inviteEmail.trim(),
			organizationId,
			resend: true,
			role: inviteRole,
		});
		if (error) {
			throw new Error(error.message ?? "Envoi de l’invitation impossible");
		}

		await onInvited();
		toast.success("Invitation envoyée");
	} catch (error) {
		toast.error(
			error instanceof Error
				? error.message
				: "Envoi de l’invitation impossible",
		);
	} finally {
		setIsInviting(false);
	}
}

async function handleCancelInvitation(
	invitationId: string,
	{
		onCompleted,
		setOrganizationInvitations,
		setProcessingInvitationId,
	}: {
		onCompleted: () => Promise<void>;
		setOrganizationInvitations: React.Dispatch<
			React.SetStateAction<InvitationLike[]>
		>;
		setProcessingInvitationId: (value: string | null) => void;
	},
) {
	setProcessingInvitationId(invitationId);

	try {
		const { error } = await authClient.organization.cancelInvitation({
			invitationId,
		});
		if (error) {
			throw new Error(error.message ?? "Annulation de l’invitation impossible");
		}
		setOrganizationInvitations((currentInvitations) =>
			currentInvitations.filter(
				(invitation) => getInvitationId(invitation) !== invitationId,
			),
		);
		await onCompleted();
		toast.success("Invitation annulée");
	} catch (error) {
		toast.error(
			error instanceof Error
				? error.message
				: "Annulation de l’invitation impossible",
		);
	} finally {
		setProcessingInvitationId(null);
	}
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

function isOutstandingInvitation(invitation: InvitationLike) {
	const status = invitation.status?.toLowerCase();
	return (
		!status ||
		![
			"accepted",
			"canceled",
			"cancelled",
			"declined",
			"expired",
			"rejected",
		].includes(status)
	);
}

function normalizeOptionalString(value: string) {
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function formatCreatedAt(createdAt: Date | string | number | null | undefined) {
	if (!createdAt) {
		return "Inconnu";
	}

	return new Intl.DateTimeFormat("fr-FR", {
		dateStyle: "long",
	}).format(new Date(createdAt));
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

function validateOrganizationLogoFile(file: File) {
	if (!file.type.startsWith("image/")) {
		return "Choisissez un fichier image";
	}

	if (file.size > 5 * 1024 * 1024) {
		return "Les images d’organisation doivent faire 5 Mo maximum";
	}

	return null;
}

async function convertImageFileToDataUrl(file: File) {
	const image = await loadImageFromFile(file);
	const maxDimension = 512;
	const scale = Math.min(
		1,
		maxDimension /
			Math.max(
				image.naturalWidth || image.width,
				image.naturalHeight || image.height,
			),
	);
	const width = Math.max(
		1,
		Math.round((image.naturalWidth || image.width) * scale),
	);
	const height = Math.max(
		1,
		Math.round((image.naturalHeight || image.height) * scale),
	);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error(
			"Le traitement d’image n’est pas disponible dans ce navigateur",
		);
	}

	context.drawImage(image, 0, 0, width, height);

	let lastDataUrl = "";
	for (const quality of [0.9, 0.82, 0.74, 0.66]) {
		lastDataUrl = canvas.toDataURL("image/webp", quality);
		if (lastDataUrl.length <= 500_000) {
			return lastDataUrl;
		}
	}

	if (lastDataUrl.length > 900_000) {
		throw new Error("Choisissez une image plus légère");
	}

	return lastDataUrl;
}

async function loadImageFromFile(file: File) {
	const objectUrl = URL.createObjectURL(file);

	try {
		return await new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error("Lecture de l’image impossible"));
			image.src = objectUrl;
		});
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

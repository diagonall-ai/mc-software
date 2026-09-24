"use client";

import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { Textarea } from "~/components/ui/textarea";
import { updateViewerProfileFn } from "~/lib/profile.functions";

type ProfileUser =
	| {
			bio?: string | null;
			email?: string;
			image?: string | null;
			name?: string;
			username?: string | null;
	  }
	| null
	| undefined;

type ProfileDraft = {
	bio: string;
	name: string;
	username: string;
};

/**
 * Renders a lightweight profile settings surface for the authenticated user.
 */
export function ProfileSettingsPage({ user }: { user: ProfileUser }) {
	const [draft, setDraft] = useState<ProfileDraft>(createProfileDraft(user));
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setDraft(createProfileDraft(user));
	}, [user]);

	const isLoading = user === undefined;
	const isDisabled = isLoading || !user || isSaving;
	const hasChanges = !!user && hasProfileChanges(draft, user);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!user) {
			return;
		}

		setIsSaving(true);

		try {
			await updateViewerProfileFn({ data: draft });
			toast.success("Profil mis à jour");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Impossible de mettre à jour le profil",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
			<Card className="border-border/70">
				<CardHeader className="gap-3 border-b border-border/70 bg-card/70">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Profil</p>
						<CardTitle className="mt-2 text-3xl">Identité du compte</CardTitle>
					</div>
					<CardDescription className="max-w-2xl text-sm leading-6">
						Gérez les informations affichées dans le menu utilisateur et les
						vues d’équipe.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-6">
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-4">
								<Avatar className="size-20 border border-border/70" size="lg">
									<AvatarImage
										alt={draft.name.trim() || user?.email || "Photo de profil"}
										src={user?.image ?? undefined}
									/>
									<AvatarFallback>
										{getInitials(draft.name || user?.email)}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-1">
									<p className="font-medium text-foreground">Photo de profil</p>
									<p className="text-sm text-muted-foreground">
										Importez une image carrée pour un rendu net. PNG, JPG ou
										WebP, 5 Mo maximum.
									</p>
								</div>
							</div>
							<p className="max-w-xs text-sm text-muted-foreground">
								L’import de fichiers n’est pas inclus dans le template D1.
								Ajoutez R2 si une fonctionnalité produit a besoin de stockage
								objet.
							</p>
						</div>
						<FieldGroup>
							<Field>
								<FieldContent>
									<FieldLabel htmlFor="profile-name">Nom</FieldLabel>
									<Input
										autoComplete="name"
										disabled={isDisabled}
										id="profile-name"
										maxLength={80}
										onChange={(event) =>
											setDraft((currentDraft) => ({
												...currentDraft,
												name: event.target.value,
											}))
										}
										placeholder="Nom affiché"
										value={draft.name}
									/>
									<FieldDescription>
										Utilisé quand l’app affiche une personne plutôt qu’un email.
									</FieldDescription>
								</FieldContent>
							</Field>
							<Field>
								<FieldContent>
									<FieldLabel htmlFor="profile-username">
										Identifiant
									</FieldLabel>
									<Input
										autoCapitalize="none"
										autoComplete="username"
										disabled={isDisabled}
										id="profile-username"
										maxLength={32}
										onChange={(event) =>
											setDraft((currentDraft) => ({
												...currentDraft,
												username: event.target.value,
											}))
										}
										placeholder="identifiant"
										value={draft.username}
									/>
									<FieldDescription>
										Enregistré en minuscules. Lettres, chiffres, tirets et
										underscores acceptés.
									</FieldDescription>
								</FieldContent>
							</Field>
							<Field>
								<FieldContent>
									<FieldLabel htmlFor="profile-bio">Présentation</FieldLabel>
									<Textarea
										disabled={isDisabled}
										id="profile-bio"
										maxLength={280}
										onChange={(event) =>
											setDraft((currentDraft) => ({
												...currentDraft,
												bio: event.target.value,
											}))
										}
										placeholder="Courte description de la personne derrière ce compte."
										rows={5}
										value={draft.bio}
									/>
									<div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
										<FieldDescription>
											Restez bref. Ce texte peut apparaître près d’un avatar ou
											d’un en-tête de profil.
										</FieldDescription>
										<span>{draft.bio.length}/280</span>
									</div>
								</FieldContent>
							</Field>
						</FieldGroup>
						<div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-muted-foreground">
								{user?.email ?? "Compte connecté"}
							</p>
							<div className="flex gap-3">
								<Button
									disabled={isDisabled || !hasChanges}
									onClick={() => setDraft(createProfileDraft(user))}
									type="button"
									variant="outline"
								>
									Réinitialiser
								</Button>
								<Button disabled={isDisabled || !hasChanges} type="submit">
									{isSaving ? "Enregistrement…" : "Enregistrer le profil"}
								</Button>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
			<div>
				<Card className="border-border/70">
					<CardHeader>
						<CardTitle>Aperçu</CardTitle>
						<CardDescription>
							Vérifiez comment ces informations apparaîtront dans l’interface.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Avatar className="size-16 border border-border/70" size="lg">
							<AvatarImage
								alt={draft.name.trim() || user?.email || "Photo de profil"}
								src={user?.image ?? undefined}
							/>
							<AvatarFallback>
								{getInitials(draft.name || user?.email)}
							</AvatarFallback>
						</Avatar>
						<div className="space-y-1">
							<p className="text-lg font-semibold text-foreground">
								{draft.name.trim() || "Utilisateur sans nom"}
							</p>
							<p className="text-sm text-muted-foreground">
								{draft.username.trim()
									? `@${draft.username.trim().toLowerCase()}`
									: "@username"}
							</p>
						</div>
						<p className="text-sm leading-6 text-muted-foreground">
							{draft.bio.trim() ||
								"Une courte bio rend le profil moins anonyme."}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function createProfileDraft(user: ProfileUser): ProfileDraft {
	return {
		bio: user?.bio ?? "",
		name: user?.name ?? "",
		username: user?.username ?? "",
	};
}

function hasProfileChanges(
	draft: ProfileDraft,
	user: Exclude<ProfileUser, undefined | null>,
) {
	return (
		draft.name.trim() !== (user.name ?? "") ||
		draft.username.trim() !== (user.username ?? "") ||
		draft.bio.trim() !== (user.bio ?? "")
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

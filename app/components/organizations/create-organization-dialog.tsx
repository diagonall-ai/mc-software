"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";
import {
	createOrganizationWithAvailableSlug,
	OrganizationSlugUnavailableError,
	toOrganizationSlug,
} from "~/lib/organization";

type CreateOrganizationDialogProps = {
	onCreated?: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

export function CreateOrganizationDialog({
	onCreated,
	onOpenChange,
	open,
}: CreateOrganizationDialogProps) {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState("");
	const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);

	async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setSlugSuggestion(null);
		const trimmedName = name.trim();
		const trimmedSlug = slug.trim();
		if (!trimmedName) return;

		const manualSlug = trimmedSlug ? toOrganizationSlug(trimmedSlug) : null;
		if (trimmedSlug && !manualSlug) {
			setError("Le slug doit contenir au moins une lettre ou un chiffre.");
			return;
		}

		setCreating(true);
		try {
			await createOrganizationWithAvailableSlug(authClient, {
				name: trimmedName,
				preferredSlug: manualSlug ?? toOrganizationSlug(trimmedName),
				retrySlugConflicts: !manualSlug,
			});
		} catch (createError) {
			if (createError instanceof OrganizationSlugUnavailableError) {
				setSlugSuggestion(createError.suggestedSlug);
				setError(
					createError.suggestedSlug
						? `Slug déjà utilisé. Suggestion : ${createError.suggestedSlug}`
						: "Slug déjà utilisé.",
				);
				return;
			}

			setError(
				createError instanceof Error
					? createError.message
					: "Création de l’organisation impossible",
			);
			return;
		} finally {
			setCreating(false);
		}

		setName("");
		setSlug("");
		setSlugSuggestion(null);
		onOpenChange(false);
		onCreated?.();
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && !creating) {
			setError("");
			setSlugSuggestion(null);
		}
		onOpenChange(nextOpen);
	}

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="max-w-xl rounded-3xl border-border/70 p-0 sm:max-w-xl">
				<form onSubmit={handleCreate}>
					<DialogHeader className="border-b border-border/70 px-6 py-6">
						<DialogTitle>Créer une organisation</DialogTitle>
						<DialogDescription className="max-w-md text-sm leading-6">
							Créez un espace pour une équipe, un client ou une entité. Le slug
							sert d’identifiant compatible URL.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 px-6 py-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="organization-name">Nom</Label>
								<Input
									autoFocus
									id="organization-name"
									onChange={(event) => {
										setName(event.target.value);
										setError("");
										setSlugSuggestion(null);
									}}
									placeholder="Northwind Studio"
									value={name}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="organization-slug">Slug</Label>
								<Input
									id="organization-slug"
									onChange={(event) => {
										setSlug(toOrganizationSlug(event.target.value));
										setError("");
										setSlugSuggestion(null);
									}}
									placeholder={
										name ? toOrganizationSlug(name) : "northwind-studio"
									}
									value={slug}
								/>
							</div>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						{slugSuggestion ? (
							<Button
								className="h-auto px-0 text-sm"
								onClick={() => {
									setSlug(slugSuggestion);
									setError("");
									setSlugSuggestion(null);
								}}
								type="button"
								variant="link"
							>
								Utiliser {slugSuggestion}
							</Button>
						) : null}
					</div>
					<DialogFooter className="border-t border-border/70 px-6 py-4">
						<Button
							disabled={creating || !name.trim()}
							type="submit"
							className="min-w-40"
						>
							{creating ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Plus className="size-4" />
							)}
							{creating ? "Création..." : "Créer une organisation"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

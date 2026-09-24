"use client";

import { Check, Copy, Ellipsis, Key, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "~/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";

type ApiKeyRecord = {
	createdAt: Date;
	enabled: boolean;
	expiresAt: Date | null;
	id: string;
	name: string | null;
	start: string | null;
};

type LatestCreatedKey = {
	id: string;
	key: string;
} | null;

/**
 * Opens a sidebar drawer for listing, creating, and deleting Clés API.
 */
export function ApiKeyDrawer({
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
	const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
	const [latestCreatedKey, setLatestCreatedKey] =
		useState<LatestCreatedKey>(null);
	const [loading, setLoading] = useState(false);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;

	function handleOpenChange(nextOpen: boolean) {
		onOpenChange?.(nextOpen);
		if (controlledOpen === undefined) {
			setUncontrolledOpen(nextOpen);
		}
	}

	const loadKeys = useCallback(async () => {
		setLoading(true);
		setError("");
		const { data, error: listError } = await authClient.apiKey.list();
		setLoading(false);

		if (listError) {
			setError(listError.message ?? "Chargement des clés API impossible");
			return;
		}

		setKeys(data?.apiKeys ?? []);
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		void loadKeys();
	}, [loadKeys, open]);

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
						<Key className="size-4" />
						{collapsed ? (
							<span className="sr-only">Clés API</span>
						) : (
							<span>Clés API</span>
						)}
					</Button>
				</DrawerTrigger>
			) : null}
			<DrawerContent className="w-full border-border/70 sm:w-[40rem] sm:max-w-[40rem]">
				<DrawerHeader className="border-b border-border/70 px-6 py-5 text-left">
					<DrawerTitle className="text-lg">Clés API</DrawerTitle>
					<DrawerDescription className="max-w-lg text-sm leading-6">
						Créez et gérez les identifiants machine depuis la barre latérale. La
						dernière clé complète reste visible ici jusqu’à fermeture ou
						rechargement.
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
					<CreateApiKeyForm
						onCreated={(apiKey) => {
							setLatestCreatedKey(apiKey);
							void loadKeys();
						}}
					/>
					{latestCreatedKey ? (
						<NewKeyBanner
							apiKey={latestCreatedKey.key}
							onDismiss={() => setLatestCreatedKey(null)}
						/>
					) : null}
					<div className="space-y-3">
						<div>
							<h3 className="text-sm font-medium text-foreground">Vos clés</h3>
							<p className="text-sm text-muted-foreground">
								Les clés existantes n’affichent que leur préfixe pour des
								raisons de sécurité.
							</p>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						{loading ? (
							<div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
								<Loader2 className="mr-2 size-4 animate-spin" />
								Chargement des clés API
							</div>
						) : !keys.length ? (
							<div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center">
								<Key className="mx-auto size-8 text-muted-foreground/60" />
								<p className="mt-3 text-sm text-muted-foreground">
									Aucune clé API. Créez-en une ci-dessus pour commencer.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{keys.map((apiKey) => (
									<ApiKeyRow
										apiKey={apiKey}
										key={apiKey.id}
										onDeleted={() => void loadKeys()}
										onUpdated={() => void loadKeys()}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function CreateApiKeyForm({
	onCreated,
}: {
	onCreated: (apiKey: { id: string; key: string }) => void;
}) {
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState("");
	const [name, setName] = useState("");

	async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setCreating(true);
		setError("");

		const { data, error: createError } = await authClient.apiKey.create({
			name: name.trim() || undefined,
		});
		setCreating(false);

		if (createError) {
			setError(createError.message ?? "Création de la clé API impossible");
			return;
		}

		if (data?.id && data.key) {
			onCreated({ id: data.id, key: data.key });
		}

		setName("");
	}

	return (
		<div className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4">
			<div className="space-y-1">
				<h3 className="text-sm font-medium text-foreground">
					Créer une clé API
				</h3>
				<p className="text-sm text-muted-foreground">
					Nommez la clé selon son intégration ou son usage pour la reconnaître
					facilement.
				</p>
			</div>
			<form
				className="flex flex-col gap-3 sm:flex-row sm:items-end"
				onSubmit={handleCreate}
			>
				<div className="flex-1 space-y-2">
					<Label htmlFor="key-name">Nom</Label>
					<Input
						id="key-name"
						onChange={(event) => setName(event.target.value)}
						placeholder="my-integration"
						value={name}
					/>
				</div>
				<Button disabled={creating} type="submit">
					{creating ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Plus className="size-4" />
					)}
					{creating ? "Création..." : "Créer la clé"}
				</Button>
			</form>
			{error ? <p className="text-sm text-destructive">{error}</p> : null}
		</div>
	);
}

function NewKeyBanner({
	apiKey,
	onDismiss,
}: {
	apiKey: string;
	onDismiss: () => void;
}) {
	const [copied, setCopied] = useState(false);

	async function copyToClipboard() {
		await navigator.clipboard.writeText(apiKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="space-y-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
			<p className="text-sm text-muted-foreground">
				Cette valeur complète n’est affichée qu’à la création. Conservez-la
				avant de fermer ce message.
			</p>
			<div className="flex items-center gap-2">
				<code className="flex-1 break-all rounded-2xl border border-border/70 bg-accent px-3 py-2 font-mono text-sm select-all">
					{apiKey}
				</code>
				<Button onClick={copyToClipboard} size="icon" variant="outline">
					{copied ? (
						<Check className="size-4 text-green-600" />
					) : (
						<Copy className="size-4" />
					)}
					<span className="sr-only">Copier</span>
				</Button>
			</div>
			<Button onClick={onDismiss} size="sm" variant="ghost">
				Fermer
			</Button>
		</div>
	);
}

function ApiKeyRow({
	apiKey,
	onDeleted,
	onUpdated,
}: {
	apiKey: ApiKeyRecord;
	onDeleted: () => void;
	onUpdated: () => void;
}) {
	const [deleting, setDeleting] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [updating, setUpdating] = useState(false);

	async function handleDelete() {
		setDeleting(true);
		try {
			await authClient.apiKey.delete({ keyId: apiKey.id });
			setDeleteDialogOpen(false);
			toast.success("Clé API supprimée");
			onDeleted();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Suppression de la clé API impossible",
			);
		} finally {
			setDeleting(false);
		}
	}

	async function handleToggleEnabled() {
		setUpdating(true);
		try {
			await updateApiKeyEnabled({
				enabled: !apiKey.enabled,
				keyId: apiKey.id,
			});
			toast.success(apiKey.enabled ? "Clé API désactivée" : "Clé API activée");
			onUpdated();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Mise à jour de la clé API impossible",
			);
		} finally {
			setUpdating(false);
		}
	}

	const label = apiKey.name || apiKey.start || "Clé sans nom";
	const createdDate = new Date(apiKey.createdAt).toLocaleDateString();

	return (
		<div className="rounded-2xl border border-border/70 bg-accent px-5 py-5">
			<div className="flex items-start gap-4">
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate text-lg font-semibold text-foreground">
								{label}
							</p>
							<p className="mt-1 text-sm font-mono text-muted-foreground">
								{apiKey.start
									? `${apiKey.start}••••`
									: "Aucun préfixe disponible"}
							</p>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button disabled={updating} size="icon" variant="ghost">
									{updating ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Ellipsis className="size-4 text-muted-foreground" />
									)}
									<span className="sr-only">Actions de clé API</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onSelect={() => void handleToggleEnabled()}>
									{apiKey.enabled ? "Désactiver la clé" : "Activer la clé"}
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() => setDeleteDialogOpen(true)}
									variant="destructive"
								>
									Supprimer la clé
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<span>
							Créée le {createdDate}
							{apiKey.expiresAt
								? ` · Expire le ${new Date(apiKey.expiresAt).toLocaleDateString()}`
								: ""}
						</span>
						<span
							className={
								apiKey.enabled
									? "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
									: "inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
							}
						>
							{apiKey.enabled ? "Active" : "Désactivée"}
						</span>
					</div>
				</div>
			</div>
			<AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer la clé API ?</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action supprime{" "}
							<span className="font-medium text-foreground">{label}</span>.
							Toute intégration qui l’utilise cessera de fonctionner
							immédiatement.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={() => void handleDelete()}
							variant="destructive"
						>
							{deleting ? "Suppression..." : "Supprimer la clé"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

async function updateApiKeyEnabled({
	enabled,
	keyId,
}: {
	enabled: boolean;
	keyId: string;
}) {
	const response = await fetch("/api/auth/api-key/update", {
		body: JSON.stringify({ enabled, keyId }),
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	const payload = (await response.json().catch(() => null)) as {
		error?: { message?: string };
		message?: string;
	} | null;

	if (!response.ok) {
		throw new Error(
			payload?.error?.message ??
				payload?.message ??
				"Mise à jour de la clé API impossible",
		);
	}
}

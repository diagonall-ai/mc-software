import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { authClient } from "~/lib/auth-client";
import { ensureOrganizationForSession } from "~/lib/organization";
import { PROJECT_NAME } from "~/lib/project";

export function PublicAuthCard({
	onAuthSuccess,
}: {
	onAuthSuccess?: () => void;
} = {}) {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{PROJECT_NAME}</CardTitle>
				<CardDescription>Connectez-vous ou créez un compte</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="login">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="login">Connexion</TabsTrigger>
						<TabsTrigger value="signup">Créer un compte</TabsTrigger>
					</TabsList>
					<TabsContent value="login">
						<LoginForm onAuthSuccess={onAuthSuccess} />
					</TabsContent>
					<TabsContent value="signup">
						<SignUpForm onAuthSuccess={onAuthSuccess} />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

function LoginForm({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		try {
			const { error: authError } = await authClient.signIn.email({
				email,
				password,
			});
			if (authError) {
				toast.error(authError.message ?? "Connexion impossible");
				return;
			}
			await ensureOrganizationForSession(authClient, { email });
			if (onAuthSuccess) {
				onAuthSuccess();
			} else {
				navigate({ to: "/dashboard" });
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Connexion impossible");
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="mt-4 space-y-4">
			<div className="space-y-2">
				<Label htmlFor="login-email">Email</Label>
				<Input
					id="login-email"
					name="email"
					type="email"
					placeholder="you@example.com"
					autoComplete="email"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="login-password">Mot de passe</Label>
				<Input
					id="login-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
			</div>
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? "Connexion…" : "Se connecter"}
			</Button>
		</form>
	);
}

function SignUpForm({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);

	async function finishSignUp(email: string, name: string) {
		try {
			await waitForAuthSession();
			await ensureOrganizationForSession(authClient, { email, name });
		} catch (err) {
			toast.error("Compte créé, mais l’espace n’a pas pu être initialisé", {
				action: {
					label: "Réessayer",
					onClick: () => {
						void finishSignUp(email, name);
					},
				},
				description: getErrorMessage(err),
				duration: 10_000,
			});
			return;
		}

		if (onAuthSuccess) {
			onAuthSuccess();
		} else {
			navigate({ to: "/dashboard" });
		}
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;
		const name = formData.get("name") as string;
		const superAdminPassword = formData.get("superAdminPassword") as string;

		if (password !== confirmPassword) {
			toast.error("Les mots de passe ne correspondent pas");
			return;
		}

		setLoading(true);
		try {
			const { error: authError } = await authClient.signUp.email(
				{ email, password, name },
				{
					headers: {
						"x-super-admin-password": superAdminPassword,
					},
				},
			);
			if (authError) {
				toast.error(authError.message ?? "Création du compte impossible");
				return;
			}
			await finishSignUp(email, name);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Création du compte impossible",
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="mt-4 space-y-4">
			<div className="space-y-2">
				<Label htmlFor="signup-name">Nom</Label>
				<Input
					id="signup-name"
					name="name"
					type="text"
					placeholder="Ada Lovelace"
					autoComplete="name"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="signup-email">Email</Label>
				<Input
					id="signup-email"
					name="email"
					type="email"
					placeholder="you@example.com"
					autoComplete="email"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="signup-password">Mot de passe</Label>
				<Input
					id="signup-password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="signup-confirm">Confirmation</Label>
				<Input
					id="signup-confirm"
					name="confirmPassword"
					type="password"
					autoComplete="new-password"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="signup-super-admin-password">
					Mot de passe super admin
				</Label>
				<Input
					id="signup-super-admin-password"
					name="superAdminPassword"
					type="password"
					autoComplete="one-time-code"
					required
				/>
			</div>
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? "Création du compte…" : "S’inscrire"}
			</Button>
		</form>
	);
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : undefined;
}

async function waitForAuthSession() {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const { data, error } = await authClient.getSession();
		if (hasSession(data)) {
			return;
		}

		if (error && attempt === 4) {
			throw new Error(error.message ?? "Chargement de la session impossible");
		}

		await delay(100 * (attempt + 1));
	}

	throw new Error("Compte créé, mais la session n’est pas encore prête");
}

function hasSession(value: unknown) {
	return Boolean(
		readNestedString(value, "user", "id") ??
			readNestedString(value, "session", "userId"),
	);
}

function delay(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readNestedString(value: unknown, objectKey: string, fieldKey: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const nested = record[objectKey];
	if (!nested || typeof nested !== "object") {
		return null;
	}

	const nestedRecord = nested as Record<string, unknown>;
	const fieldValue = nestedRecord[fieldKey];
	return typeof fieldValue === "string" ? fieldValue : null;
}

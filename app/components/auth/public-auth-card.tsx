import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
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
import { toast } from "~/components/ui/toast";
import { authClient } from "~/lib/auth-client";
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
				toast.add({
					title: authError.message ?? "Connexion impossible",
					type: "error",
				});
				return;
			}
			if (onAuthSuccess) {
				onAuthSuccess();
			} else {
				navigate({ to: "/dashboard" });
			}
		} catch (err) {
			toast.add({
				title: err instanceof Error ? err.message : "Connexion impossible",
				type: "error",
			});
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

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;
		const name = formData.get("name") as string;
		const superAdminPassword = formData.get("superAdminPassword") as string;

		if (password !== confirmPassword) {
			toast.add({
				title: "Les mots de passe ne correspondent pas",
				type: "error",
			});
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
				toast.add({
					title: authError.message ?? "Création du compte impossible",
					type: "error",
				});
				return;
			}
			if (onAuthSuccess) {
				onAuthSuccess();
			} else {
				navigate({ to: "/dashboard" });
			}
		} catch (err) {
			toast.add({
				title:
					err instanceof Error ? err.message : "Création du compte impossible",
				type: "error",
			});
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
				<Label htmlFor="signup-super-admin-password">Code d'invitation</Label>
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

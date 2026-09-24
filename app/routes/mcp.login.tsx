import { createFileRoute } from "@tanstack/react-router";
import { LogIn, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicAuthCard } from "~/components/auth/public-auth-card";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { PROJECT_NAME } from "~/lib/project";

// Where Better Auth sends people when an AI client asks to connect and they are
// not signed in. The query string is the signed OAuth request: it is read
// as-is, never declared as route search params, so the router cannot rewrite
// it. Signing in resumes the authorization (see oauthProviderClient).
export const Route = createFileRoute("/mcp/login")({
	component: McpLoginPage,
});

const SIGNATURE_PARAMS = ["sig", "ba_iat", "ba_param", "ba_pl"];

function McpLoginPage() {
	const [search, setSearch] = useState<URLSearchParams>();
	const [clientName, setClientName] = useState<string>();
	const { data: sessionData, isPending } = authClient.useSession();
	const clientId = search?.get("client_id");
	// A client can ask for a fresh sign-in (prompt=login), even with a session.
	const showSignIn =
		!sessionData?.user ||
		search?.get("prompt")?.split(" ").includes("login") === true;

	useEffect(() => {
		setSearch(new URLSearchParams(window.location.search));
	}, []);

	useEffect(() => {
		if (!clientId) {
			return;
		}
		void authClient.oauth2
			.publicClientPrelogin({ client_id: clientId })
			.then(({ data }) => setClientName(data?.client_name ?? undefined));
	}, [clientId]);

	if (isPending || !search) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="py-8 text-center text-muted-foreground">
						Chargement…
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="flex w-full max-w-sm flex-col gap-4">
				{clientId ? (
					<McpContextBanner clientName={clientName} signIn={showSignIn} />
				) : null}
				{showSignIn ? (
					<PublicAuthCard onAuthSuccess={() => {}} />
				) : (
					<AuthenticatedContinueCard search={search} />
				)}
			</div>
		</div>
	);
}

function McpContextBanner({
	clientName,
	signIn,
}: {
	clientName?: string;
	signIn: boolean;
}) {
	return (
		<Card className="border-border/50 bg-muted/30">
			<CardContent className="flex items-start gap-3 py-4">
				<Shield className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
				<div className="min-w-0 space-y-1">
					<p className="text-sm font-medium">Demande d’autorisation</p>
					<p className="text-sm text-muted-foreground">
						{clientName ?? "Une application"} demande l’accès à votre compte{" "}
						{PROJECT_NAME}.{signIn ? " Connectez-vous pour continuer." : ""}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// Already signed in (for example in another tab): send the original request
// back to the authorize endpoint, which now finds the session.
function AuthenticatedContinueCard({ search }: { search: URLSearchParams }) {
	const { data: sessionData } = authClient.useSession();
	const user = sessionData?.user;
	const hasAuthorizationContext = search.has("client_id");
	const authorizeQuery = new URLSearchParams(search);
	for (const param of SIGNATURE_PARAMS) {
		authorizeQuery.delete(param);
	}

	return (
		<Card className="w-full">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{PROJECT_NAME}</CardTitle>
				<CardDescription>
					{hasAuthorizationContext
						? "Vous êtes connecté. Continuez pour autoriser cette application."
						: "Vous êtes déjà connecté."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{user && (
					<div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-center">
						<p className="text-sm font-medium">{user.name ?? user.email}</p>
						{user.name && user.email && (
							<p className="text-xs text-muted-foreground">{user.email}</p>
						)}
					</div>
				)}
				{hasAuthorizationContext ? (
					<Button
						className="w-full"
						nativeButton={false}
						render={<a href={`/api/auth/oauth2/authorize?${authorizeQuery}`} />}
					>
						<LogIn className="size-4" />
						Continuer
					</Button>
				) : (
					<Button
						className="w-full"
						nativeButton={false}
						render={<a href="/dashboard" />}
						variant="outline"
					>
						Aller au tableau de bord
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

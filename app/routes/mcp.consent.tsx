import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { toast } from "~/components/ui/toast";
import { authClient } from "~/lib/auth-client";
import { PROJECT_NAME } from "~/lib/project";

// Where Better Auth sends signed-in people the first time an AI client asks for
// access. As on /mcp/login, the query string is the signed OAuth request, read
// as-is; oauthProviderClient sends it along with the answer.
export const Route = createFileRoute("/mcp/consent")({
	component: McpConsentPage,
});

// What each OAuth scope lets the agent do, in the words of the person approving it.
const SCOPE_LABELS: Record<string, string> = {
	openid: "Vous identifier",
	profile: "Voir votre nom et votre photo",
	email: "Voir votre adresse email",
	offline_access: "Rester connectée sans vous redemander",
};

function McpConsentPage() {
	const [search, setSearch] = useState<URLSearchParams>();
	const [clientName, setClientName] = useState<string>();
	const [answering, setAnswering] = useState<"accept" | "deny">();
	const clientId = search?.get("client_id");
	const scopes = search?.get("scope")?.split(" ").filter(Boolean) ?? [];

	useEffect(() => {
		setSearch(new URLSearchParams(window.location.search));
	}, []);

	useEffect(() => {
		if (!clientId) {
			return;
		}
		void authClient.oauth2
			.publicClient({ query: { client_id: clientId } })
			.then(({ data }) => setClientName(data?.client_name ?? undefined));
	}, [clientId]);

	async function answer(accept: boolean) {
		setAnswering(accept ? "accept" : "deny");
		const { data, error } = await authClient.oauth2.consent({ accept });
		if (error || !data?.url) {
			toast.add({
				title: error?.message ?? "La demande a expiré. Relancez la connexion.",
				type: "error",
			});
			setAnswering(undefined);
			return;
		}
		window.location.href = data.url;
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<ShieldCheck className="size-8 text-muted-foreground" />
					<CardTitle className="text-xl">
						{clientName ?? "Une application"} demande l’accès à votre compte{" "}
						{PROJECT_NAME}
					</CardTitle>
					<CardDescription>
						Elle pourra utiliser l’API de {PROJECT_NAME} en votre nom, avec vos
						droits.
					</CardDescription>
				</CardHeader>
				{scopes.length > 0 ? (
					<CardContent>
						<p className="text-sm font-medium">Elle pourra aussi :</p>
						<ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
							{scopes.map((scope) => (
								<li key={scope}>{SCOPE_LABELS[scope] ?? scope}</li>
							))}
						</ul>
					</CardContent>
				) : null}
				<CardFooter className="flex gap-2">
					<Button
						className="flex-1"
						disabled={!search || answering !== undefined}
						onClick={() => void answer(false)}
						variant="outline"
					>
						{answering === "deny" ? "Refus…" : "Refuser"}
					</Button>
					<Button
						className="flex-1"
						disabled={!search || answering !== undefined}
						onClick={() => void answer(true)}
					>
						{answering === "accept" ? "Autorisation…" : "Autoriser"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { LogIn, Shield } from "lucide-react";
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

type McpSearchParams = {
	client_id?: string;
	scope?: string;
	redirect_uri?: string;
	response_type?: string;
	state?: string;
	code_challenge?: string;
	code_challenge_method?: string;
};

export const Route = createFileRoute("/mcp/login")({
	validateSearch: (search: Record<string, unknown>): McpSearchParams => ({
		client_id:
			typeof search.client_id === "string" ? search.client_id : undefined,
		scope: typeof search.scope === "string" ? search.scope : undefined,
		redirect_uri:
			typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
		response_type:
			typeof search.response_type === "string"
				? search.response_type
				: undefined,
		state: typeof search.state === "string" ? search.state : undefined,
		code_challenge:
			typeof search.code_challenge === "string"
				? search.code_challenge
				: undefined,
		code_challenge_method:
			typeof search.code_challenge_method === "string"
				? search.code_challenge_method
				: undefined,
	}),
	component: McpLoginPage,
});

function buildAuthorizeUrl(search: McpSearchParams): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (value) {
			params.set(key, value);
		}
	}
	return `/api/auth/mcp/authorize?${params.toString()}`;
}

function McpLoginPage() {
	const search = Route.useSearch();
	const { data: sessionData, isPending } = authClient.useSession();
	const isAuthenticated = Boolean(sessionData?.user);
	const hasAuthorizationContext = Boolean(search.client_id);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="py-8 text-center text-muted-foreground">
						Loading...
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="flex w-full max-w-sm flex-col gap-4">
				{hasAuthorizationContext && <McpContextBanner search={search} />}
				{isAuthenticated ? (
					<AuthenticatedContinueCard search={search} />
				) : (
					<PublicAuthCard
						onAuthSuccess={
							hasAuthorizationContext
								? () => {
										window.location.href = buildAuthorizeUrl(search);
									}
								: undefined
						}
					/>
				)}
			</div>
		</div>
	);
}

function McpContextBanner({ search }: { search: McpSearchParams }) {
	const scopes = search.scope
		? search.scope.split(/[\s,]+/).filter(Boolean)
		: [];

	return (
		<Card className="border-border/50 bg-muted/30">
			<CardContent className="flex items-start gap-3 py-4">
				<Shield className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
				<div className="min-w-0 space-y-1">
					<p className="text-sm font-medium">Authorization request</p>
					<p className="text-sm text-muted-foreground">
						An application
						{search.client_id ? (
							<>
								{" "}
								(<span className="font-mono text-xs">{search.client_id}</span>)
							</>
						) : null}{" "}
						is requesting access to your {PROJECT_NAME} account.
					</p>
					{scopes.length > 0 && (
						<div className="pt-1">
							<p className="text-xs font-medium text-muted-foreground">
								Requested scopes
							</p>
							<div className="mt-1 flex flex-wrap gap-1">
								{scopes.map((scope) => (
									<span
										key={scope}
										className="inline-block rounded-md bg-background px-2 py-0.5 font-mono text-xs text-foreground"
									>
										{scope}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function AuthenticatedContinueCard({ search }: { search: McpSearchParams }) {
	const { data: sessionData } = authClient.useSession();
	const user = sessionData?.user;
	const authorizeUrl = buildAuthorizeUrl(search);
	const hasAuthorizationContext = Boolean(search.client_id);

	return (
		<Card className="w-full">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{PROJECT_NAME}</CardTitle>
				<CardDescription>
					{hasAuthorizationContext
						? "You are signed in. Continue to authorize this application."
						: "You are already signed in."}
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
					<Button asChild className="w-full">
						<a href={authorizeUrl}>
							<LogIn className="size-4" />
							Continue
						</a>
					</Button>
				) : (
					<Button asChild className="w-full" variant="outline">
						<a href="/dashboard">Go to dashboard</a>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

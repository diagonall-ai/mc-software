import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Database,
	KeyRound,
	Network,
	UserRound,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/")({
	staticData: {
		dashboardHeader: {
			description: "Template baseline and integration checkpoints",
			title: "Dashboard",
		},
	},
	pendingComponent: DashboardSkeleton,
	component: DashboardOverviewPage,
});

function DashboardOverviewPage() {
	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
			<Card className="border-border/70">
				<CardHeader>
					<CardTitle>Template baseline</CardTitle>
					<CardDescription>
						This dashboard is intentionally generic. Add domain-specific pages
						only after the new application domain is defined.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<TemplateCapability
						description="Better Auth stores users, sessions, organizations, API keys, and MCP OAuth data in D1."
						icon={UserRound}
						title="Auth ready"
					/>
					<TemplateCapability
						description="Drizzle uses the Worker D1 binding. Runtime code does not use database URLs or REST access."
						icon={Database}
						title="D1 ready"
					/>
					<TemplateCapability
						description="oRPC generates the OpenAPI route surface used by REST and the MCP execution proxy."
						icon={Network}
						title="API ready"
					/>
					<TemplateCapability
						description="Users can create API keys and call protected REST or MCP endpoints."
						icon={KeyRound}
						title="Machine access"
					/>
				</CardContent>
			</Card>

			<Card className="border-border/70">
				<CardHeader>
					<CardTitle>Next page pattern</CardTitle>
					<CardDescription>
						Use SSR loaders for first paint and return dashboard header metadata
						from the same route module.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button asChild className="w-full justify-between" variant="outline">
						<Link to="/dashboard/profile" viewTransition>
							Profile page
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild className="w-full justify-between" variant="outline">
						<a href="/api/v1/docs">
							API reference
							<ArrowRight className="size-4" />
						</a>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function TemplateCapability({
	description,
	icon: Icon,
	title,
}: {
	description: string;
	icon: typeof UserRound;
	title: string;
}) {
	return (
		<div className="rounded-xl border border-border/70 p-4">
			<div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
				<Icon className="size-4" />
			</div>
			<h2 className="font-medium text-sm">{title}</h2>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
			<Skeleton className="h-80 rounded-xl" />
			<Skeleton className="h-56 rounded-xl" />
		</div>
	);
}

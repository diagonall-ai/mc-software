import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { PROJECT_NAME } from "~/lib/project";

// The welcome page of a fresh app. Replace it with the app's real home page
// once its first pages exist.
export const Route = createFileRoute("/dashboard/")({
	staticData: {
		dashboardHeader: {
			description: "L’application est en ligne.",
			title: "Accueil",
		},
	},
	pendingComponent: WelcomeSkeleton,
	component: WelcomePage,
});

function WelcomePage() {
	return (
		<Card className="max-w-2xl border-border/70">
			<CardHeader>
				<CardTitle>Bienvenue dans {PROJECT_NAME}</CardTitle>
				<CardDescription>
					L’application est en ligne. Ses pages arrivent ici au fur et à mesure
					qu’elles sont construites avec Claude.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3 sm:grid-cols-2">
				<Button
					className="justify-between"
					nativeButton={false}
					render={<Link to="/dashboard/profile" viewTransition />}
					variant="outline"
				>
					Mon profil
					<ArrowRight className="size-4" />
				</Button>
				<Button
					className="justify-between"
					nativeButton={false}
					render={<Link to="/dashboard/assistant" viewTransition />}
					variant="outline"
				>
					Assistant
					<ArrowRight className="size-4" />
				</Button>
			</CardContent>
		</Card>
	);
}

function WelcomeSkeleton() {
	return <Skeleton className="h-48 max-w-2xl rounded-xl" />;
}

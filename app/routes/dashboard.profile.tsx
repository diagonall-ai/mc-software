import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ProfileSettingsPage } from "~/components/profile/profile-settings-page";
import { RouteErrorComponent } from "~/components/route-error-state";
import { Skeleton } from "~/components/ui/skeleton";
import { authClient } from "~/lib/auth-client";

// The reference page pattern: the loader reads through oRPC (in-process during
// SSR), the page writes through the same client, then `router.invalidate()`
// reloads the loaders on screen.
export const Route = createFileRoute("/dashboard/profile")({
	loader: ({ context }) => context.getOrpc().profile.get(),
	staticData: {
		dashboardHeader: {
			description: "Gérez les informations du compte et la photo de profil.",
			title: "Profil",
		},
	},
	pendingComponent: ProfileSkeleton,
	errorComponent: RouteErrorComponent,
	component: DashboardProfileRoute,
});

function DashboardProfileRoute() {
	const user = Route.useLoaderData();
	const { getOrpc } = Route.useRouteContext();
	const router = useRouter();

	return (
		<ProfileSettingsPage
			onSave={async (draft) => {
				await getOrpc().profile.update(draft);
				await router.invalidate();
				// The sidebar shows the Better Auth session user: refresh it too.
				authClient.$store.notify("$sessionSignal");
			}}
			user={user}
		/>
	);
}

function ProfileSkeleton() {
	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
			<Skeleton className="h-[32rem] rounded-xl" />
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}

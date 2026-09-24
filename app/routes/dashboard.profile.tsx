import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "~/components/profile/profile-settings-page";
import { getViewerProfileFn } from "~/lib/profile.functions";

export const Route = createFileRoute("/dashboard/profile")({
	loader: async () => {
		return await getViewerProfileFn();
	},
	staticData: {
		dashboardHeader: {
			description: "Gérez les informations du compte et la photo de profil.",
			title: "Profil",
		},
	},
	component: DashboardProfileRoute,
});

function DashboardProfileRoute() {
	const user = Route.useLoaderData();

	return <ProfileSettingsPage user={user} />;
}

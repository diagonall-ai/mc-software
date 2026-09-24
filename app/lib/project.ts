const DEFAULT_PROJECT_NAME = "Personnal Software";

export const PROJECT_NAME = getProjectName();
export const PROJECT_INITIALS = getProjectInitials(PROJECT_NAME);

function getProjectName() {
	const value = import.meta.env.VITE_APP_NAME;

	if (typeof value !== "string") {
		return DEFAULT_PROJECT_NAME;
	}

	const normalizedValue = value.trim();
	return normalizedValue || DEFAULT_PROJECT_NAME;
}

function getProjectInitials(value: string) {
	const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);

	if (!parts.length) {
		return "PS";
	}

	return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

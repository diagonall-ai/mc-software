import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { user } from "~/db/schema";

export type ViewerProfile = {
	id: string;
	bio?: string | null;
	email: string;
	image?: string | null;
	name: string;
	username?: string | null;
};

export async function getViewerProfile(userId: string): Promise<ViewerProfile> {
	const [row] = await db
		.select({
			bio: user.bio,
			email: user.email,
			id: user.id,
			image: user.image,
			name: user.name,
			username: user.username,
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (!row) {
		throw new Error("User not found");
	}

	return row;
}

export async function updateViewerProfile(
	userId: string,
	input: {
		bio: string;
		name: string;
		username: string;
	},
) {
	const username = normalizeUsername(input.username);
	if (username) {
		const [existingUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.username, username))
			.limit(1);

		if (existingUser && existingUser.id !== userId) {
			throw new Error("Username is already taken");
		}
	}

	await db
		.update(user)
		.set({
			bio: normalizeOptionalValue(input.bio, 280),
			name: normalizeOptionalValue(input.name, 80) ?? "",
			updatedAt: new Date(),
			username,
		})
		.where(eq(user.id, userId));
}

function normalizeOptionalValue(value: string, maxLength: number) {
	const normalizedValue = value.trim().slice(0, maxLength);
	return normalizedValue ? normalizedValue : null;
}

function normalizeUsername(value: string) {
	const normalizedValue = value.trim().toLowerCase().replaceAll(/\s+/g, "-");
	if (!normalizedValue) {
		return null;
	}

	if (!/^[a-z0-9_-]{3,32}$/.test(normalizedValue)) {
		throw new Error(
			"Username must be 3-32 characters and use letters, numbers, hyphens, or underscores",
		);
	}

	return normalizedValue;
}

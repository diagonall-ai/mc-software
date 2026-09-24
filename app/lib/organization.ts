"use client";

import type { authClient } from "~/lib/auth-client";

type AuthClient = typeof authClient;

type OrganizationSummary = {
	id: string;
	name: string;
};

type OrganizationCandidate = {
	name: string;
	slug: string;
};

type CreateOrganizationArgs = {
	keepCurrentActiveOrganization?: boolean;
	name: string;
	preferredSlug?: string | null;
	retrySlugConflicts?: boolean;
};

export class OrganizationSlugUnavailableError extends Error {
	readonly slug: string;
	readonly suggestedSlug: string | null;

	constructor(slug: string, suggestedSlug: string | null) {
		super("Organization slug is unavailable");
		this.name = "OrganizationSlugUnavailableError";
		this.slug = slug;
		this.suggestedSlug = suggestedSlug;
	}
}

type SessionUser = {
	email?: string | null;
	name?: string | null;
};

export async function ensureOrganizationForSession(
	client: AuthClient,
	user: SessionUser,
	options?: {
		activeOrganization?: { id: string } | null;
		organizations?: OrganizationSummary[] | null;
	},
) {
	const activeOrganization = options?.activeOrganization ?? null;
	if (activeOrganization?.id) {
		return activeOrganization.id;
	}

	let organizations = options?.organizations ?? null;

	// When called without pre-fetched org data (e.g. right after sign-in),
	// query the server so we don't blindly create a duplicate org.
	if (!organizations) {
		const listResult = await client.organization.list();
		const listError = readErrorMessage(listResult);
		if (listError) {
			throw new Error(listError);
		}

		organizations =
			(Array.isArray(listResult?.data) ? listResult.data : null) ??
			(Array.isArray(listResult) ? listResult : null);
	}

	if (organizations?.length) {
		const firstOrganizationId = organizations[0]?.id;
		if (!firstOrganizationId) {
			return null;
		}

		const { error } = await client.organization.setActive({
			organizationId: firstOrganizationId,
		});
		if (error) {
			throw new Error(error.message ?? "Failed to activate organization");
		}

		return firstOrganizationId;
	}

	return await createPersonalOrganization(client, user);
}

async function createPersonalOrganization(
	client: AuthClient,
	user: SessionUser,
) {
	const baseName = getPersonalOrganizationName(user);
	const baseSlug = getPersonalOrganizationSlugBase(user);
	const organization = await createOrganizationWithAvailableSlug(client, {
		keepCurrentActiveOrganization: false,
		name: baseName,
		preferredSlug: baseSlug,
	});
	return organization.id;
}

export async function createOrganizationWithAvailableSlug(
	client: AuthClient,
	args: CreateOrganizationArgs,
) {
	const name = normalizeLabel(args.name);
	if (!name) {
		throw new Error("Organization name is required");
	}

	const baseSlug =
		toOrganizationSlug(args.preferredSlug ?? "") ||
		toOrganizationSlug(name) ||
		"organization";
	const maxAttempts = args.retrySlugConflicts === false ? 1 : 100;

	for (let suffix = 0; suffix < maxAttempts; suffix += 1) {
		const candidate = getOrganizationCandidate(name, baseSlug, suffix);
		const isSlugAvailable = await checkOrganizationSlug(client, candidate.slug);
		if (!isSlugAvailable) {
			continue;
		}

		const organization = await tryCreateOrganization(client, candidate, {
			keepCurrentActiveOrganization:
				args.keepCurrentActiveOrganization ?? false,
		});
		if (organization) {
			return organization;
		}
	}

	if (args.retrySlugConflicts === false) {
		throw new OrganizationSlugUnavailableError(
			baseSlug,
			await findAvailableOrganizationSlug(client, baseSlug),
		);
	}

	throw new Error("Failed to find an available organization slug");
}

async function checkOrganizationSlug(client: AuthClient, slug: string) {
	const { data, error } = await client.organization.checkSlug({ slug });

	if (error) {
		if (isOrganizationSlugConflict(error)) {
			return false;
		}

		throw new Error(
			error.message ?? "Failed to validate personal organization slug",
		);
	}

	const status = readBoolean(data, "status");
	return status === true;
}

async function tryCreateOrganization(
	client: AuthClient,
	candidate: OrganizationCandidate,
	options: { keepCurrentActiveOrganization: boolean },
) {
	const { data, error } = await client.organization.create({
		keepCurrentActiveOrganization: options.keepCurrentActiveOrganization,
		name: candidate.name,
		slug: candidate.slug,
	});

	if (error) {
		if (isOrganizationSlugConflict(error)) {
			return null;
		}

		throw new Error(error.message ?? "Failed to create personal organization");
	}

	const createdOrganizationId =
		readString(data, "id") ??
		readString(data, "organizationId") ??
		readNestedString(data, "organization", "id");
	if (createdOrganizationId) {
		return {
			id: createdOrganizationId,
			name: candidate.name,
			slug: candidate.slug,
		};
	}

	const refreshedOrganizations = await client.organization.list();
	const refreshedListError = readErrorMessage(refreshedOrganizations);
	if (refreshedListError) {
		throw new Error(refreshedListError);
	}

	const fallbackId =
		readOrganizationIdBySlug(refreshedOrganizations?.data, candidate.slug) ??
		readOrganizationIdBySlug(refreshedOrganizations, candidate.slug) ??
		readFirstOrganizationId(refreshedOrganizations?.data) ??
		readFirstOrganizationId(refreshedOrganizations);
	return fallbackId
		? {
				id: fallbackId,
				name: candidate.name,
				slug: candidate.slug,
			}
		: null;
}

async function findAvailableOrganizationSlug(
	client: AuthClient,
	baseSlug: string,
) {
	for (let suffix = 1; suffix < 100; suffix += 1) {
		const candidateSlug = getOrganizationSlugCandidate(baseSlug, suffix);
		if (await checkOrganizationSlug(client, candidateSlug)) {
			return candidateSlug;
		}
	}

	return null;
}

function getOrganizationCandidate(
	baseName: string,
	baseSlug: string,
	suffix: number,
): OrganizationCandidate {
	const normalizedBaseSlug = baseSlug || "personal-organization";
	return {
		name: baseName,
		slug: getOrganizationSlugCandidate(normalizedBaseSlug, suffix),
	};
}

function getOrganizationSlugCandidate(baseSlug: string, suffix: number) {
	if (suffix === 0) return baseSlug;
	return `${baseSlug}-${suffix + 1}`;
}

function getPersonalOrganizationName(user: SessionUser) {
	const label = normalizeLabel(user.name) ?? emailLabel(user.email);
	return `${toPossessive(label)} Organization`;
}

function getPersonalOrganizationSlugBase(user: SessionUser) {
	const label = normalizeLabel(user.name) ?? emailLabel(user.email);
	return `${toOrganizationSlug(label)}-organization`;
}

function normalizeLabel(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function emailLabel(email: string | null | undefined) {
	const localPart = email?.split("@")[0] ?? "personal";
	const cleaned = localPart.replace(/[._-]+/g, " ").trim();
	return cleaned || "Personal";
}

function toPossessive(value: string) {
	return value.endsWith("s") ? `${value}'` : `${value}'s`;
}

export function toOrganizationSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

function readString(value: unknown, key: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const fieldValue = record[key];
	return typeof fieldValue === "string" ? fieldValue : null;
}

function readNestedString(value: unknown, objectKey: string, fieldKey: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	return readString(record[objectKey], fieldKey);
}

function readBoolean(value: unknown, key: string) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;
	const fieldValue = record[key];
	return typeof fieldValue === "boolean" ? fieldValue : null;
}

function readFirstOrganizationId(value: unknown) {
	if (!Array.isArray(value)) {
		return null;
	}

	for (const item of value) {
		const id = readString(item, "id");
		if (id) {
			return id;
		}
	}

	return null;
}

function readOrganizationIdBySlug(value: unknown, slug: string) {
	if (!Array.isArray(value)) {
		return null;
	}

	for (const item of value) {
		if (readString(item, "slug") !== slug) {
			continue;
		}

		const id = readString(item, "id");
		if (id) {
			return id;
		}
	}

	return null;
}

function readErrorMessage(value: unknown) {
	if (!value || typeof value !== "object") {
		return null;
	}

	const error = (value as { error?: unknown }).error;
	return readString(error, "message");
}

function isOrganizationSlugConflict(error: unknown) {
	const code = readString(error, "code");
	const message = readString(error, "message") ?? "";

	return (
		code === "ORGANIZATION_ALREADY_EXISTS" ||
		code === "ORGANIZATION_SLUG_ALREADY_TAKEN" ||
		/\borganization\b.*\b(already exists|slug already taken)\b/i.test(message)
	);
}

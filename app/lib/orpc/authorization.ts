import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "~/db/client";
import { member } from "~/db/schema";
import type { ApiAuthState } from "~/lib/orpc/context";

export type AuthenticatedActor = {
	authKind: ApiAuthState["kind"];
	userId: string;
};

export type OrganizationMembership = AuthenticatedActor & {
	organizationId: string;
	role: string;
};

type MembershipOptions = {
	roles?: string[];
};

export function requireAuthenticatedActor(
	auth: ApiAuthState | null,
): AuthenticatedActor {
	if (!auth) {
		throw new ORPCError("UNAUTHORIZED", {
			message:
				"Missing or invalid API credentials. Use a browser session, Authorization: Bearer <api-key>, x-api-key, or MCP session auth.",
		});
	}

	const userId =
		auth.kind === "mcp-session" ? auth.session.userId : auth.user.id;
	if (!userId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Authenticated session is missing a user id.",
		});
	}

	return {
		authKind: auth.kind,
		userId,
	};
}

export async function requireActiveOrganizationMembership(
	auth: ApiAuthState | null,
	options: MembershipOptions = {},
): Promise<OrganizationMembership> {
	const actor = requireAuthenticatedActor(auth);
	const activeOrganizationId =
		auth?.kind === "browser-session" || auth?.kind === "api-key"
			? auth.session.activeOrganizationId
			: null;

	if (activeOrganizationId) {
		return requireOrganizationMembership(auth, activeOrganizationId, options);
	}

	const [membership] = await db
		.select({
			organizationId: member.organizationId,
			role: member.role,
		})
		.from(member)
		.where(createMembershipWhere(actor.userId, options.roles))
		.orderBy(asc(member.createdAt))
		.limit(1);

	if (!membership) {
		throw new ORPCError("FORBIDDEN", {
			message: "No active organization membership is available.",
		});
	}

	return {
		...actor,
		organizationId: membership.organizationId,
		role: membership.role,
	};
}

export async function requireOrganizationMembership(
	auth: ApiAuthState | null,
	organizationId: string,
	options: MembershipOptions = {},
): Promise<OrganizationMembership> {
	const actor = requireAuthenticatedActor(auth);
	const [membership] = await db
		.select({
			organizationId: member.organizationId,
			role: member.role,
		})
		.from(member)
		.where(
			and(
				eq(member.userId, actor.userId),
				eq(member.organizationId, organizationId),
				createRoleWhere(options.roles),
			),
		)
		.limit(1);

	if (!membership) {
		throw new ORPCError("FORBIDDEN", {
			message: "User is not a member of the requested organization.",
		});
	}

	return {
		...actor,
		organizationId: membership.organizationId,
		role: membership.role,
	};
}

function createMembershipWhere(userId: string, roles: string[] | undefined) {
	return and(eq(member.userId, userId), createRoleWhere(roles));
}

function createRoleWhere(roles: string[] | undefined) {
	return roles?.length ? inArray(member.role, roles) : undefined;
}

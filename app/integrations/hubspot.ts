/**
 * HubSpot: CRM (contacts, companies, deals).
 * Used by: Prospection Cleaq.
 *
 * Docs: https://developers.hubspot.com/docs/api-reference/latest/overview
 * Add `.md` to a reference page URL to get its OpenAPI definition, for example
 * https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/get-contacts.md
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: a HubSpot super admin, or a user with "Developer tools access". A key
 *   never gets more scopes than the person who creates it.
 * - Where: Paramètres > Intégrations > Service Keys (also under Development >
 *   Keys > Service keys). Scopes: crm.objects.contacts.read,
 *   crm.objects.companies.read, crm.objects.deals.read (add
 *   crm.objects.owners.read for owner names).
 * - Use a Service Key, not a private app: from 26 October 2026 existing
 *   accounts can no longer create legacy private apps. Service Keys are in
 *   beta, have no expiry, and HubSpot advises rotating them every 6 months.
 * - Secret: HUBSPOT_SERVICE_KEY.
 *
 * API facts:
 * - Base URL https://api.hubapi.com, `Authorization: Bearer`. Versions are
 *   dates in the path (`/crm/objects/2026-09/contacts`); a new one ships every
 *   March and September and lasts 18 months.
 * - 100 to 190 requests per 10 seconds depending on the plan, plus a daily
 *   cap for the whole account. Search: 5 requests per second per account.
 * - Lists: `limit` up to 100, next page with `paging.next.after`. Property
 *   values are always strings or null; misspelled property names are ignored.
 * - Search is `POST .../search` with `filterGroups` (up to 200 per page,
 *   10,000 results at most per query). Use it to filter or sort.
 */
import { Schema } from "effect";
import { type CallOptions, request } from "./http";

const BASE_URL = "https://api.hubapi.com";
const VERSION = "2026-09";

// Only the fields the app uses. Add one when a screen needs it.
const ContactPage = Schema.Struct({
	results: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			properties: Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
			updatedAt: Schema.String,
		}),
	),
	paging: Schema.optional(
		Schema.Struct({
			next: Schema.optional(Schema.Struct({ after: Schema.String })),
		}),
	),
});

export type HubSpotContactPage = typeof ContactPage.Type;

export class HubSpot {
	/** `HubSpot.init({ serviceKey: env.HUBSPOT_SERVICE_KEY })` */
	static init(credentials: { serviceKey: string }): HubSpot {
		return new HubSpot(credentials.serviceKey);
	}

	readonly #serviceKey: string;

	private constructor(serviceKey: string) {
		this.#serviceKey = serviceKey;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /crm/objects/2026-09/contacts: one page of contacts.
	 * Docs: https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/get-contacts
	 * Scope: crm.objects.contacts.read
	 * Companies and deals work the same way with `companies` or `deals` in the path.
	 */
	listContacts(
		options: {
			/** `paging.next.after` from the previous page. */
			after?: string;
			/** Up to 100, default 10. */
			limit?: number;
			/** Default: firstname, lastname, email and a few dates. */
			properties?: string[];
		} = {},
	) {
		return this.call(`/crm/objects/${VERSION}/contacts`, ContactPage, {
			query: {
				after: options.after,
				limit: options.limit,
				properties: options.properties?.join(","),
			},
		});
	}

	private call<A>(
		path: string,
		schema: Schema.Decoder<A>,
		options: CallOptions = {},
	) {
		return request({
			...options,
			headers: { Authorization: `Bearer ${this.#serviceKey}` },
			schema,
			service: "HubSpot",
			url: `${BASE_URL}${path}`,
		});
	}
}

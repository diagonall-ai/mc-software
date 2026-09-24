/**
 * Lemlist: cold email and LinkedIn campaigns.
 * Used by: Prospection Cleaq.
 *
 * Docs: https://developer.lemlist.com
 * OpenAPI: https://developer.lemlist.com/api-reference/openapi/v2.json
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: a Lemlist admin, or a user with the API access permission. Every
 *   paid plan includes the API.
 * - Where: profile picture > Settings > Integrations > Generate. Name the key;
 *   it is shown only once. A key has no scopes: it can do everything, so this
 *   shell must stay read-only.
 * - Credits: never call the endpoints that spend enrichment credits
 *   (`/enrich`, `/v2/enrichments/bulk`, `/leads/{id}/enrich`, or adding leads
 *   with findEmail, verifyEmail, linkedinEnrichment or findPhone) unless the
 *   user explicitly asks. GETs and `POST /v2/campaigns/stats/batch` are free.
 * - Secret: LEMLIST_API_KEY.
 *
 * API facts:
 * - Base URL https://api.lemlist.com/api, HTTP Basic auth with an empty user
 *   name and the key as password. Ignore docs that say Bearer.
 * - 20 requests per 2 seconds per key. A 429 is retried after Retry-After.
 * - Versions are mixed: some routes need `version=v2` in the query, others
 *   have a `/v2/` path prefix. Check each endpoint's page.
 * - Lists use `offset` and `limit` (up to 100) and return a plain array: keep
 *   fetching until a page comes back shorter than `limit`.
 * - Campaign stats: `GET /v2/campaigns/{id}/stats?startDate=&endDate=` (both
 *   dates required), or up to 100 campaigns at once with the batch POST.
 */
import { Schema } from "effect";
import { basicAuth, type CallOptions, request } from "./http";

const BASE_URL = "https://api.lemlist.com/api";

// Only the fields the app uses. Add one when a screen needs it.
const Campaign = Schema.Struct({
	_id: Schema.String,
	name: Schema.String,
	status: Schema.String,
	createdAt: Schema.String,
});

export type LemlistCampaign = typeof Campaign.Type;

export class Lemlist {
	/** `Lemlist.init({ apiKey: env.LEMLIST_API_KEY })` */
	static init(credentials: { apiKey: string }): Lemlist {
		return new Lemlist(credentials.apiKey);
	}

	readonly #apiKey: string;

	private constructor(apiKey: string) {
		this.#apiKey = apiKey;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /campaigns?version=v2: one page of campaigns.
	 * Docs: https://developer.lemlist.com/api-reference/endpoints/campaigns/get-many-campaigns
	 */
	listCampaigns(
		options: {
			offset?: number;
			/** Up to 100. */
			limit?: number;
			status?: "running" | "draft" | "archived" | "ended" | "paused" | "errors";
		} = {},
	) {
		return this.call("/campaigns", Schema.Array(Campaign), {
			query: {
				limit: options.limit ?? 100,
				offset: options.offset,
				status: options.status,
				version: "v2",
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
			headers: { Authorization: basicAuth("", this.#apiKey) },
			schema,
			service: "Lemlist",
			url: `${BASE_URL}${path}`,
		});
	}
}

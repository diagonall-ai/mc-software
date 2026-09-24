/**
 * Trustpilot: customer reviews of the company.
 * Used by: Voix du client.
 *
 * Docs: https://developers.trustpilot.com (no OpenAPI file; Trustpilot's
 * request collection is at https://github.com/trustpilot/documentation-bruno-collection)
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Every API call, even the score, needs the "API Module": a paid add-on on
 *   the Premium plan, included in Enterprise (confirm with Trustpilot sales).
 *   Free, Starter and Plus have no API; use the CSV export from Trustpilot
 *   Business instead.
 * - The public endpoints (API key only) already return the full review text,
 *   stars and company replies. The private ones (OAuth) only add personal
 *   data such as the customer's email and order id.
 * - Where: in Trustpilot Business, create an API application and copy its
 *   API key (help: https://help.trustpilot.com/s/article/How-to-use-Trustpilot-APIs).
 * - Secret: TRUSTPILOT_API_KEY.
 *
 * API facts:
 * - Base URL https://api.trustpilot.com/v1, API key in the `apikey` header.
 * - The yearly allowance is small (Tier 1: 200,000 calls, about 550 a day)
 *   and failed calls count too: store reviews in D1 and sync them, never
 *   call Trustpilot on every page view. At most 833 calls per 5 minutes.
 * - Find the business unit id once with
 *   `GET /business-units/find?name=mobile.club` and keep it: it never changes.
 * - Reviews: `page` and `perPage` (up to 100); 100,000 reviews at most, beyond
 *   that use `/business-units/{id}/all-reviews` with `pageToken`.
 * - If you store reviews, check `/v1/reviews/deletions` at least every 28 days
 *   and delete what Trustpilot lists there (GDPR). Those calls are free.
 * - Treat every field as possibly missing; some dates have no `Z` but are UTC.
 */
import { Schema } from "effect";
import { type CallOptions, request } from "./http";

const BASE_URL = "https://api.trustpilot.com/v1";

// Only the fields the app uses. Add one when a screen needs it.
const ReviewPage = Schema.Struct({
	reviews: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			stars: Schema.Number,
			title: Schema.NullOr(Schema.String),
			text: Schema.NullOr(Schema.String),
			language: Schema.NullOr(Schema.String),
			createdAt: Schema.String,
		}),
	),
});

export type TrustpilotReviewPage = typeof ReviewPage.Type;

export class Trustpilot {
	/** `Trustpilot.init({ apiKey: env.TRUSTPILOT_API_KEY })` */
	static init(credentials: { apiKey: string }): Trustpilot {
		return new Trustpilot(credentials.apiKey);
	}

	readonly #apiKey: string;

	private constructor(apiKey: string) {
		this.#apiKey = apiKey;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /business-units/{id}/reviews: one page of public reviews, text included.
	 * Docs: https://developers.trustpilot.com/business-units-api-(public)/
	 * Stop when a page comes back with fewer than `perPage` reviews.
	 */
	listReviews(
		businessUnitId: string,
		options: {
			/** Starts at 1. */
			page?: number;
			/** 1 to 100, default 20. */
			perPage?: number;
			orderBy?: "createdat.desc" | "createdat.asc" | "stars.desc" | "stars.asc";
		} = {},
	) {
		return this.#call(`/business-units/${businessUnitId}/reviews`, ReviewPage, {
			query: {
				orderBy: options.orderBy ?? "createdat.desc",
				page: options.page,
				perPage: options.perPage ?? 100,
			},
		});
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		return request({
			...options,
			headers: { apikey: this.#apiKey },
			schema,
			service: "Trustpilot",
			url: `${BASE_URL}${path}`,
		});
	}
}

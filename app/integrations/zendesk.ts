/**
 * Zendesk Support: customer tickets and their comments.
 *
 * Docs: https://developer.zendesk.com/api-reference/ticketing/introduction/
 * OpenAPI: https://developer.zendesk.com/zendesk/oas.yaml (it has gaps: trust
 * the reference pages when they disagree).
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Use an OAuth client, not an API token: Zendesk is retiring API tokens. No
 *   new token can be created after 27 October 2026, and all of them stop
 *   working on 30 April 2027.
 * - Who: a Zendesk admin. The export below is admin-only, and the client acts
 *   as the admin who creates it.
 * - Where: Admin Center > Apps and integrations > APIs > OAuth clients > Add
 *   OAuth client, kind "Confidential". Copy the identifier and the secret
 *   (shown only once).
 * - Secrets: ZENDESK_SUBDOMAIN (the "acme" in acme.zendesk.com),
 *   ZENDESK_CLIENT_ID (the identifier), ZENDESK_CLIENT_SECRET.
 *
 * API facts:
 * - Base URL https://{subdomain}.zendesk.com/api/v2. The shell trades the
 *   client id and secret for a 30-minute read-only token (POST /oauth/tokens,
 *   grant type client_credentials) and sends it as `Authorization: Bearer`.
 * - 200 to 2,500 requests per minute depending on the plan, but only 10 per
 *   minute on the incremental exports. A 429 is retried after Retry-After.
 * - Comments of one ticket: `GET /tickets/{id}/comments?page[size]=100`, next
 *   page with `page[after]` set to `meta.after_cursor` while `meta.has_more`.
 *   Without `page[size]` it silently switches to page numbers. In bulk:
 *   `GET /incremental/ticket_events?include=comment_events`.
 * - Attachment `content_url`s can point outside Zendesk: never send the token
 *   there.
 */
import { Effect, Schema } from "effect";
import { type CallOptions, request, withToken } from "./http";

// Only the fields the app uses. Add one when a screen needs it.
const TicketExport = Schema.Struct({
	tickets: Schema.Array(
		Schema.Struct({
			id: Schema.Number,
			subject: Schema.NullOr(Schema.String),
			description: Schema.NullOr(Schema.String),
			status: Schema.String,
			tags: Schema.Array(Schema.String),
			created_at: Schema.String,
			updated_at: Schema.String,
		}),
	),
	after_cursor: Schema.NullOr(Schema.String),
	end_of_stream: Schema.Boolean,
});

export type ZendeskTicketExport = typeof TicketExport.Type;

interface ZendeskCredentials {
	subdomain: string;
	clientId: string;
	clientSecret: string;
}

export class Zendesk {
	/**
	 * `Zendesk.init({ subdomain: env.ZENDESK_SUBDOMAIN, clientId: env.ZENDESK_CLIENT_ID, clientSecret: env.ZENDESK_CLIENT_SECRET })`
	 */
	static init(credentials: ZendeskCredentials): Zendesk {
		return new Zendesk(credentials);
	}

	readonly #credentials: ZendeskCredentials;

	private constructor(credentials: ZendeskCredentials) {
		this.#credentials = credentials;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /incremental/tickets/cursor: every ticket created or updated since a
	 * date, up to 1,000 per page. Admins only; 10 calls per minute.
	 * Docs: https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/
	 * Start with `since` (at least a minute ago), then pass `after_cursor` back
	 * as `cursor` until `end_of_stream` is true. Save the last cursor to resume
	 * from there next time. Deleted tickets are left out.
	 */
	exportTickets(
		/** `since`: a date such as "2026-09-01", at least a minute ago. */
		from: { since: string } | { cursor: string },
	) {
		return this.#call("/incremental/tickets/cursor", TicketExport, {
			query: {
				...("cursor" in from
					? { cursor: from.cursor }
					: { start_time: Math.floor(Date.parse(from.since) / 1000) }),
				exclude_deleted: true,
			},
		});
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		const { subdomain, clientId, clientSecret } = this.#credentials;
		const accessToken = request({
			json: {
				client_id: clientId,
				client_secret: clientSecret,
				expires_in: 1800,
				grant_type: "client_credentials",
				scope: "read",
			},
			method: "POST",
			retries: 3,
			schema: Schema.Struct({ access_token: Schema.String }),
			service: "Zendesk",
			url: `https://${subdomain}.zendesk.com/oauth/tokens`,
		}).pipe(
			Effect.map(({ access_token }) => ({
				expiresInSeconds: 1800,
				value: access_token,
			})),
		);
		return withToken(`zendesk:${subdomain}:${clientId}`, accessToken, (token) =>
			request({
				...options,
				headers: { Authorization: `Bearer ${token}` },
				schema,
				service: "Zendesk",
				url: `https://${subdomain}.zendesk.com/api/v2${path}`,
			}),
		);
	}
}

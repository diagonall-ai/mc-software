/**
 * Tableau: dashboards and their data (Tableau Cloud or Tableau Server).
 *
 * Docs: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm
 * No OpenAPI file for these REST endpoints. The VizQL Data Service has one:
 * https://raw.githubusercontent.com/tableau/VizQL-Data-Service/main/VizQLDataServiceOpenAPISchema.json
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: the Tableau site admin. On Tableau Cloud sites created since June
 *   2023, they must first allow personal access tokens (PAT) in the site
 *   settings. The PAT acts as the user who creates it, so that user needs
 *   View and "Download Summary Data" on the views the app reads.
 * - Where: profile picture > My Account Settings > Personal Access Tokens >
 *   Create. Copy the name and the secret (shown only once). A PAT expires
 *   after 15 days without use.
 * - Tableau Cloud or Server? Take the host from the browser address bar
 *   (`https://10ax.online.tableau.com`, not `online.tableau.com`) and the site
 *   from the URL part after `#/site/` (empty for the default site on Server).
 * - Secrets: TABLEAU_HOST, TABLEAU_SITE, TABLEAU_TOKEN_NAME,
 *   TABLEAU_TOKEN_SECRET.
 *
 * API facts:
 * - The shell signs in with the PAT (POST /api/{version}/auth/signin) and sends
 *   the session token as `X-Tableau-Auth`. URLs use the site id returned by
 *   the sign-in, never the site name. Sessions last 2 hours on Cloud.
 * - One session per PAT: signing in again ends the previous session. When
 *   Tableau refuses the token, the shell signs in once more.
 * - The simple route is the view's data as CSV (the example below). It returns
 *   summary data only, and only the first sheet of a dashboard. Find a view id
 *   with `GET /sites/{siteId}/views?filter=viewUrlName:eq:{name}`.
 * - VizQL Data Service, for querying a published data source directly:
 *   `POST /api/v1/vizql-data-service/query-datasource`. It needs the "API
 *   Access" permission on each data source, granted explicitly, and allows 100
 *   calls per hour per Creator license.
 * - JSON lists come wrapped (`{ views: { view: [...] } }`), the inner key is
 *   missing when the list is empty, and page numbers are strings.
 */
import { Effect, Schema } from "effect";
import { type CallOptions, request, withToken } from "./http";

// 3.25 works on Tableau Cloud and on Tableau Server 2025.1 or later. For an
// older Server, lower it (error 404001 means Tableau does not know the version).
const API_VERSION = "3.25";

const SignIn = Schema.Struct({
	credentials: Schema.Struct({
		token: Schema.String,
		site: Schema.Struct({ id: Schema.String }),
	}),
});

interface TableauCredentials {
	/** For example `https://10ax.online.tableau.com`. */
	host: string;
	/** The part of the URL after `#/site/`; empty for the default site on Server. */
	site: string;
	tokenName: string;
	tokenSecret: string;
}

export class Tableau {
	/**
	 * `Tableau.init({ host: env.TABLEAU_HOST, site: env.TABLEAU_SITE, tokenName: env.TABLEAU_TOKEN_NAME, tokenSecret: env.TABLEAU_TOKEN_SECRET })`
	 */
	static init(credentials: TableauCredentials): Tableau {
		return new Tableau(credentials);
	}

	readonly #credentials: TableauCredentials;

	private constructor(credentials: TableauCredentials) {
		this.#credentials = credentials;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /sites/{siteId}/views/{viewId}/data: the data behind a view, as CSV.
	 * Docs: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_workbooks_and_views.htm#query_view_data
	 * Tableau caches it for an hour; `maxAgeMinutes` asks for fresher data.
	 * `filters` are exact matches on a field, for example `{ Region: "France" }`.
	 */
	getViewData(
		viewId: string,
		options: { maxAgeMinutes?: number; filters?: Record<string, string> } = {},
	) {
		const filters = Object.fromEntries(
			Object.entries(options.filters ?? {}).map(([field, value]) => [
				`vf_${field}`,
				value,
			]),
		);
		return this.#call(
			`/views/${encodeURIComponent(viewId)}/data`,
			Schema.String,
			{
				parse: "text",
				query: { ...filters, maxAge: options.maxAgeMinutes },
			},
		);
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		const { site, tokenName, tokenSecret } = this.#credentials;
		const host = origin(this.#credentials.host);
		const signIn = request({
			json: {
				credentials: {
					personalAccessTokenName: tokenName,
					personalAccessTokenSecret: tokenSecret,
					site: { contentUrl: site },
				},
			},
			method: "POST",
			retries: 3,
			schema: SignIn,
			service: "Tableau",
			url: `${host}/api/${API_VERSION}/auth/signin`,
		}).pipe(
			Effect.map(({ credentials }) => ({
				expiresInSeconds: 110 * 60,
				value: { siteId: credentials.site.id, token: credentials.token },
			})),
		);
		// When another Worker instance signs in with the same PAT, our session
		// ends and withToken signs in again.
		// ponytail: share one session through a Durable Object if it happens often.
		// The secret is part of the key: two tokens with the same name never
		// share a session.
		return withToken(
			`tableau:${host}:${site}:${tokenName}:${tokenSecret}`,
			signIn,
			({ siteId, token }) =>
				request({
					...options,
					headers: { ...options.headers, "X-Tableau-Auth": token },
					schema,
					service: "Tableau",
					url: `${host}/api/${API_VERSION}/sites/${siteId}${path}`,
				}),
		);
	}
}

/** Accepts the bare host or the whole address copied from the browser. */
const origin = (host: string) => {
	try {
		return new URL(host.includes("://") ? host : `https://${host}`).origin;
	} catch {
		return host; // request() reports the invalid address.
	}
};

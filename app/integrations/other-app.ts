/**
 * Another app built from this template, such as a shared metrics dictionary:
 * its API, read with an API key. Copy this file once per app to read
 * (`metrics-app.ts`, class `MetricsApp`), then add one method per route you
 * need. That app lists its routes and their shapes at `/api/docs`, and in
 * machine form at `/api/openapi.json`.
 *
 * Getting access (the recipe is in INTEGRATIONS.md, "Share Data Between Apps"):
 * - Who: the owner of the other app.
 * - Where: in that app, create an account for the reading app with its
 *   invitation code (a clear name, such as "App Cockpit"), sign in with it,
 *   and create an API key in the account menu > "Clés API". The key reads
 *   everything that account sees.
 * - Secrets: OTHER_APP_BASE_URL (its address, `https://….workers.dev`) and
 *   OTHER_APP_API_KEY (the key).
 *
 * API facts:
 * - `Authorization: Bearer <key>`, JSON in and out, errors as
 *   `{ code, message }` with the usual HTTP statuses.
 * - Paths start with `/api/`. Path and query values are text: send numbers
 *   and booleans as text in the query.
 */
import { Schema } from "effect";
import { type CallOptions, request } from "./http";

const Profile = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	email: Schema.String,
});

export class OtherApp {
	/** `OtherApp.init({ baseUrl: env.OTHER_APP_BASE_URL, apiKey: env.OTHER_APP_API_KEY })` */
	static init(credentials: { baseUrl: string; apiKey: string }): OtherApp {
		return new OtherApp(credentials.baseUrl, credentials.apiKey);
	}

	readonly #baseUrl: string;
	readonly #apiKey: string;

	private constructor(baseUrl: string, apiKey: string) {
		this.#baseUrl = baseUrl.trim().replace(/\/+$/, "");
		this.#apiKey = apiKey;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each route the app needs.
	 *
	 * GET /api/profile: the account the key belongs to. Every app built from
	 * the template has it, so it checks that the address and the key work.
	 */
	getProfile() {
		return this.#call("/api/profile", Profile);
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		return request({
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${this.#apiKey}`,
			},
			schema,
			service: "L’autre application",
			url: `${this.#baseUrl}${path}`,
		});
	}
}

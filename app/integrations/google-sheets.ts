/**
 * Google Sheets: read spreadsheet cells, and add rows, with a service account.
 *
 * Docs: https://developers.google.com/workspace/sheets/api/reference/rest
 * Discovery document (Google publishes no OpenAPI file):
 * https://sheets.googleapis.com/$discovery/rest?version=v4
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: the Google Workspace admin creates the service account; whoever owns
 *   a Sheet shares it.
 * - Where: Google Cloud console > a project > enable "Google Sheets API" >
 *   IAM and admin > Service accounts > create one > Keys > Add key > JSON.
 *   Then share each Sheet with the service account's email (untick
 *   "Notify people"): as Viewer to read it, as Editor for `appendRows`.
 * - Pitfall: organizations created since May 2024 block key creation by
 *   default ("Key creation is not allowed on this service account"). An
 *   Organization Policy Administrator must exempt the project from
 *   iam.disableServiceAccountKeyCreation and
 *   iam.managed.disableServiceAccountKeyCreation. If that is refused, upload
 *   the Sheet as CSV instead.
 * - Secret: GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY, the whole downloaded JSON file.
 *   In .dev.vars, paste the whole file between single quotes (`NAME='...'`):
 *   double quotes break the key. Send it to production with the command in
 *   INTEGRATIONS.md.
 *
 * API facts:
 * - The shell signs a JWT with the key (WebCrypto), trades it for a one-hour
 *   token at https://oauth2.googleapis.com/token, and sends it as
 *   `Authorization: Bearer`.
 * - 60 reads per minute per service account: store what you read in D1
 *   instead of reading the Sheet on every page view.
 * - Values come back as displayed text, in the Sheet's locale. Empty trailing
 *   cells and rows are dropped, so rows can have different lengths.
 * - The spreadsheet id is in its URL: docs.google.com/spreadsheets/d/<id>/edit.
 *   An uploaded .xlsx file must first be saved as a Google Sheet.
 */
import { Effect, Encoding, Schema } from "effect";
import { type CallOptions, IntegrationError, request, withToken } from "./http";

const SERVICE = "Google Sheets";
const BASE_URL = "https://sheets.googleapis.com/v4";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
// Read and write: what the service account may change is decided by how each
// Sheet is shared with it (Viewer or Editor).
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const ServiceAccountKey = Schema.fromJsonString(
	Schema.Struct({ client_email: Schema.String, private_key: Schema.String }),
);

export class GoogleSheets {
	/** `GoogleSheets.init({ serviceAccountKey: env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY })` */
	static init(credentials: { serviceAccountKey: string }): GoogleSheets {
		return new GoogleSheets(credentials.serviceAccountKey);
	}

	readonly #serviceAccountKey: string;

	private constructor(serviceAccountKey: string) {
		this.#serviceAccountKey = serviceAccountKey;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /spreadsheets/{id}/values/{range}: the cells of a range, row by row.
	 * Docs: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
	 * Range in A1 notation: "Clients!A1:F", "'Suivi churn'!A:C" (quotes when
	 * the tab name has spaces), or "Clients" for a whole tab.
	 */
	readRange(spreadsheetId: string, range: string) {
		return this.#call(
			`/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
			Schema.Struct({
				values: Schema.optional(Schema.Array(Schema.Array(Schema.String))),
			}),
		).pipe(Effect.map((body) => body.values ?? []));
	}

	/**
	 * WRITE EXAMPLE, only with the user's OK (see "Write Actions" in
	 * INTEGRATIONS.md): adds rows after the last filled row of a range, as if
	 * typed in. The Sheet must be shared with the service account as Editor.
	 * Never retried, since a retry could add the rows twice.
	 * Docs: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
	 */
	appendRows(
		spreadsheetId: string,
		range: string,
		rows: ReadonlyArray<ReadonlyArray<string | number | boolean>>,
	) {
		return this.#call(
			`/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`,
			Schema.Struct({
				updates: Schema.Struct({ updatedRows: Schema.optional(Schema.Number) }),
			}),
			{
				json: { values: rows },
				method: "POST",
				query: {
					insertDataOption: "INSERT_ROWS",
					valueInputOption: "USER_ENTERED",
				},
			},
		).pipe(
			Effect.map((body) => ({ addedRows: body.updates.updatedRows ?? 0 })),
		);
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		return Schema.decodeUnknownEffect(ServiceAccountKey)(
			this.#serviceAccountKey,
		).pipe(
			Effect.mapError(() =>
				invalidKey("copiez tout le fichier JSON téléchargé dans le secret."),
			),
			Effect.flatMap((key) =>
				withToken(`google:${key.client_email}`, accessToken(key), (token) =>
					request({
						...options,
						headers: { ...options.headers, Authorization: `Bearer ${token}` },
						schema,
						service: SERVICE,
						url: `${BASE_URL}${path}`,
					}),
				),
			),
		);
	}
}

const accessToken = (key: { client_email: string; private_key: string }) =>
	Effect.gen(function* () {
		const assertion = yield* Effect.tryPromise({
			try: () => signJwt(key.client_email, key.private_key),
			catch: () => invalidKey("la clé privée est illisible."),
		});
		const token = yield* request({
			form: {
				assertion,
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			},
			method: "POST",
			retries: 3,
			schema: Schema.Struct({
				access_token: Schema.String,
				expires_in: Schema.Number,
			}),
			service: SERVICE,
			url: TOKEN_URL,
		}).pipe(
			// 400 invalid_grant: the key was deleted or disabled, or the clock is off.
			Effect.mapError((error) =>
				error.status === 400
					? invalidKey(
							"Google l'a refusée. Elle a peut-être été supprimée ou désactivée.",
							error.detail,
						)
					: error,
			),
		);
		return { expiresInSeconds: token.expires_in, value: token.access_token };
	});

const invalidKey = (hint: string, detail?: string) =>
	new IntegrationError({
		detail,
		message: `La clé du compte de service Google n'est pas valide : ${hint}`,
		reason: "unauthorized",
		service: SERVICE,
	});

/** A one-hour RS256 JWT asking for read-only access to Sheets. */
export const signJwt = async (clientEmail: string, privateKeyPem: string) => {
	const now = Math.floor(Date.now() / 1000);
	const unsigned = [
		{ alg: "RS256", typ: "JWT" },
		{
			aud: TOKEN_URL,
			exp: now + 3600,
			iat: now,
			iss: clientEmail,
			scope: SCOPE,
		},
	]
		.map((part) => Encoding.encodeBase64Url(JSON.stringify(part)))
		.join(".");
	const der = Uint8Array.from(
		atob(privateKeyPem.replace(/-----[A-Z ]+-----|\s/g, "")),
		(char) => char.charCodeAt(0),
	);
	const signingKey = await crypto.subtle.importKey(
		"pkcs8",
		der,
		{ hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		signingKey,
		new TextEncoder().encode(unsigned),
	);
	return `${unsigned}.${Encoding.encodeBase64Url(new Uint8Array(signature))}`;
};

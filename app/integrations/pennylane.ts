/**
 * Pennylane: accounting (supplier and customer invoices, ledger).
 * Used by: Revue fournisseurs.
 *
 * Docs: https://pennylane.readme.io/docs/api-overview
 * Every page: https://pennylane.readme.io/llms.txt. Add `.md` to a reference
 * page URL to get its OpenAPI definition, for example
 * https://pennylane.readme.io/reference/getsupplierinvoices.md
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: someone with the "Dirigeant" or "Comptable interne" role. The company
 *   needs the Essentiel plan or higher.
 * - Where: Paramètres > Connectivité > Développeurs > Générer un token API.
 *   Choose "API V2", read only, the scopes the app needs (the example below
 *   needs `supplier_invoices:readonly`) and an expiry date. The token is shown
 *   only once.
 * - One token per company: each legal entity needs its own token. Sage 100 has
 *   no API; its data comes in as a CSV upload.
 * - Secret: PENNYLANE_API_TOKEN.
 *
 * API facts:
 * - Base URL https://app.pennylane.com/api/external/v2, `Authorization: Bearer`.
 * - 25 requests per 5 seconds per token. A 429 is retried after Retry-After.
 * - Lists return one page: `{ items, has_more, next_cursor }`, `limit` 1 to 100
 *   (default 20). Pass `next_cursor` back as `cursor` to get the next page.
 * - `filter` is a JSON array of `{ field, operator, value }`. Send the same
 *   filter and sort with every cursor: the cursor does not remember them.
 * - Amounts are decimal strings ("1200.50"). Keep them as strings and convert
 *   to cents before adding them up.
 */
import { Schema } from "effect";
import { type CallOptions, request } from "./http";

const BASE_URL = "https://app.pennylane.com/api/external/v2";

/** One `filter` condition. Each endpoint's docs list its fields and operators. */
export interface PennylaneFilter {
	field: string;
	operator:
		| "eq"
		| "not_eq"
		| "lt"
		| "lteq"
		| "gt"
		| "gteq"
		| "in"
		| "not_in"
		| "start_with";
	/** An array for `in` and `not_in`. Dates are "YYYY-MM-DD". */
	value: string | number | ReadonlyArray<string | number>;
}

const page = <A>(item: Schema.Decoder<A>) =>
	Schema.Struct({
		items: Schema.Array(item),
		has_more: Schema.Boolean,
		next_cursor: Schema.NullOr(Schema.String),
	});

// Only the fields the app uses. Add one when a screen needs it; the full list
// is in the endpoint's OpenAPI definition.
const SupplierInvoice = Schema.Struct({
	id: Schema.Number,
	invoice_number: Schema.String,
	label: Schema.NullOr(Schema.String),
	date: Schema.NullOr(Schema.String),
	deadline: Schema.NullOr(Schema.String),
	currency: Schema.String,
	amount: Schema.String,
	remaining_amount_with_tax: Schema.NullOr(Schema.String),
	paid: Schema.Boolean,
	payment_status: Schema.String,
	supplier: Schema.NullOr(Schema.Struct({ id: Schema.Number })),
});

export type PennylaneSupplierInvoice = typeof SupplierInvoice.Type;

export class Pennylane {
	/** `Pennylane.init({ apiToken: env.PENNYLANE_API_TOKEN })` */
	static init(credentials: { apiToken: string }): Pennylane {
		return new Pennylane(credentials.apiToken);
	}

	readonly #apiToken: string;

	private constructor(apiToken: string) {
		this.#apiToken = apiToken;
	}

	/**
	 * EXAMPLE ENDPOINT: copy it for each endpoint the app needs.
	 *
	 * GET /supplier_invoices: one page of supplier invoices.
	 * Docs: https://pennylane.readme.io/reference/getsupplierinvoices
	 * Scope: supplier_invoices:readonly
	 * Filter fields: id, supplier_id, invoice_number, date, category_id,
	 * external_reference, payment_status, flow_id.
	 */
	listSupplierInvoices(
		options: {
			cursor?: string;
			/** 1 to 100, default 20. */
			limit?: number;
			filter?: PennylaneFilter[];
			/** Default "-id" (newest first). */
			sort?: "id" | "-id" | "date" | "-date";
		} = {},
	) {
		return this.#call("/supplier_invoices", page(SupplierInvoice), {
			query: {
				cursor: options.cursor,
				filter: options.filter && JSON.stringify(options.filter),
				limit: options.limit,
				sort: options.sort,
			},
		});
	}

	#call<A>(path: string, schema: Schema.Decoder<A>, options: CallOptions = {}) {
		return request({
			...options,
			headers: { Authorization: `Bearer ${this.#apiToken}` },
			schema,
			service: "Pennylane",
			url: `${BASE_URL}${path}`,
		});
	}
}

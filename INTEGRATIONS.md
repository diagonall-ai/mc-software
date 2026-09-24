# Third-Party API Integrations

Every external service the app talks to has one **shell**: a class in `app/integrations/<service>.ts`. All shells have the same shape and send their calls through the shared plumbing in `app/integrations/http.ts`, built on [Effect](https://effect.website) v4.

A shell ships with one example method. When the user needs more data from a service, add one method per endpoint by copying that example.

## The Shells

| Service | File | Used by | Secrets | Watch out |
|---|---|---|---|---|
| Pennylane | `pennylane.ts` | Revue fournisseurs | `PENNYLANE_API_TOKEN` | Essentiel plan or higher; one token per company |
| Tableau | `tableau.ts` | Cockpit Comex | `TABLEAU_HOST`, `TABLEAU_SITE`, `TABLEAU_PAT_NAME`, `TABLEAU_PAT_SECRET` | One session per token; data sources need "API Access" for VizQL |
| Google Sheets | `google-sheets.ts` | Retention Hub | `GOOGLE_SERVICE_ACCOUNT_KEY` | Recent Google Cloud organizations block key creation by default |
| Zendesk | `zendesk.ts` | Voix du client | `ZENDESK_SUBDOMAIN`, `ZENDESK_CLIENT_ID`, `ZENDESK_CLIENT_SECRET` | Use an OAuth client: API tokens are being retired |
| Trustpilot | `trustpilot.ts` | Voix du client | `TRUSTPILOT_API_KEY` | Needs the API Module (Premium add-on, or Enterprise) |
| HubSpot | `hubspot.ts` | Prospection Cleaq | `HUBSPOT_SERVICE_KEY` | Use a Service Key, not a private app |
| Lemlist | `lemlist.ts` | Prospection Cleaq | `LEMLIST_API_KEY` | The key can do everything; enrichment spends credits |

The comment at the top of each shell is the source of truth: docs and OpenAPI links, who creates the key and where, plan requirements, limits, pagination and gotchas.

## Shape Of A Shell

```ts
export class Pennylane {
  static init(credentials: { apiToken: string }): Pennylane; // credentials in, no network call
  listSupplierInvoices(options): Effect<Page, IntegrationError>; // one method per endpoint
  private call(path, schema, options); // base URL + auth, then request()
}
```

Every call gets, from `request` in `http.ts`:

- a 15-second timeout per attempt;
- up to 3 retries with exponential backoff and jitter on network errors, 429 and 5xx, waiting for `Retry-After` when the service sends one (up to 30 seconds);
- response validation with Effect Schema: only the declared fields come back, and a changed API fails loudly;
- one error type, `IntegrationError`, with a `reason` and a French `message` the user can read.

Services that trade credentials for a short-lived token (Zendesk, Google Sheets, Tableau) cache it with `cachedToken`, shared by the requests one Worker instance serves.

## Connect A Service With The User

1. Read the shell's header comment. Explain in plain words who must create the key and where, and check the plan requirement. Use `AskUserQuestion` for "Who is your admin on X?" or "Which plan do you have?".
2. The user creates the key in their browser and pastes it into the chat. Ask for a read-only key whenever the service offers one.
3. Store it, never in code:
   - locally: add `NAME=value` to `.dev.vars`;
   - types: run `pnpm wrangler types worker-configuration.d.ts -c wrangler.jsonc --include-runtime false` so `env.NAME` is typed;
   - production: `printf '%s' 'value' | pnpm wrangler secret put NAME`.
4. Test the connection right away with the example method (see below), before building any screen. Third-party APIs work on localhost; only Workers AI needs a deploy.
5. Note in `APP_BRIEF.md` which services are connected, whose account each key belongs to, and when it expires.

When a call fails, the `reason` says why:

| reason | Meaning | What to tell the user |
|---|---|---|
| `unauthorized` | 401: wrong, expired or revoked key | Create a new key and paste it again |
| `forbidden` | 402/403: missing permission, scope or plan | Ask the admin for the permission named in the shell's comment |
| `not_found` | 404: wrong id, or the key cannot see it | Check the id, or the key's access |
| `bad_request` | Other 4xx: the request is wrong | A bug to fix in the method: read `detail` in the logs |
| `rate_limited` | 429 after retries | Wait, and sync into D1 instead of calling on every view |
| `server_error`, `network` | The service is down or slow | Try again later |
| `invalid_response` | The body no longer matches the schema | Fix the schema from `detail` in the logs |

## Add An Endpoint

1. Find the endpoint in the docs linked at the top of the shell. Prefer the OpenAPI definition when there is one.
2. Copy the example method and name it after what it does: `listSuppliers`, `getInvoice`, `exportTickets`.
3. Declare only the fields the app uses. `Schema.NullOr(...)` for fields that can be `null`, `Schema.optional(...)` for fields that can be missing. Keep money amounts as strings, and convert to cents before adding them.
4. Stay read-only. Before adding a method that writes, sends a message or spends credits, ask the user. Pass `retries: 0` for writes that must not run twice.
5. Return one page and its cursor. Let the caller loop (below).
6. Add the scope or permission the endpoint needs to the header comment.

## Call It From The App

Shells run on the server only: oRPC handlers, server functions, scheduled jobs. Add the capability to `app/lib/orpc/` like any other (see `AI_AGENT_GUIDE.md`), and run the shell with `runIntegration`:

```ts
import { env } from "cloudflare:workers";
import { runIntegration } from "~/integrations/http";
import { Pennylane } from "~/integrations/pennylane";

supplierInvoices: orpc.suppliers.invoices.handler(async ({ context, input }) => {
  requireAuthenticatedActor(context.auth);
  return runIntegration(
    Pennylane.init({ apiToken: env.PENNYLANE_API_TOKEN }).listSupplierInvoices({
      cursor: input.cursor,
    }),
  );
}),
```

`runIntegration` returns the data, or logs the technical detail (`pnpm wrangler tail` in production) and throws an `ORPCError` carrying the French message, ready for a toast.

Several calls in a row read like async code with `Effect.gen`:

```ts
const allInvoices = Effect.gen(function* () {
  const pennylane = Pennylane.init({ apiToken: env.PENNYLANE_API_TOKEN });
  const invoices: PennylaneSupplierInvoice[] = [];
  let cursor: string | undefined;
  do {
    const page = yield* pennylane.listSupplierInvoices({ cursor, limit: 100 });
    invoices.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return invoices;
});
```

The keys belong to the company, not to one user: every signed-in user can read what a shell returns. If some data must stay restricted (finance, HR), ask the user who should see it before building the page.

## Sync Into D1

Most of these services have tight quotas: Trustpilot about 550 calls a day, Google Sheets 60 reads a minute, Zendesk exports 10 a minute, Tableau VizQL 100 an hour. Do not call them on every page view:

- copy what the screens need into D1 tables, through a repository in `app/db/`;
- refresh with a "Actualiser" button that calls a sync procedure, or on a schedule with a Cron Trigger (`triggers.crons` in `wrangler.jsonc` and a `scheduled` handler in the Worker entry);
- save resume points such as Zendesk's `after_cursor`;
- mind the Worker limit on outgoing requests per invocation: 50 on the Free plan, 10,000 on Paid.

## Sources Without An API Shell

- **SFTP files (Retention Hub):** a Worker cannot open an SFTP connection. Start with a CSV upload in the app. Better: the provider pushes its files to a Cloudflare R2 bucket through R2's S3-compatible API, with an access key limited to that bucket. Last resort: a Cloudflare Container that pulls from the SFTP server on a schedule.
- **Sage 100:** no API. CSV export, uploaded in the app.
- **BP Excel (Cockpit Comex):** a file upload, read on the server. Ask before adding a spreadsheet library.
- **Internal databases (Loop, Vecna, Ganesh):** not an HTTP API. With a read-only database user, ideally on a copy of the database, connect through Cloudflare Hyperdrive. Decide the details with the database owner first.
- **Trustpilot without the API Module:** CSV export from Trustpilot Business, uploaded in the app.

## Add A New Service

1. Research it: docs, OpenAPI file (many docs sites publish `llms.txt`, or a `.md` version of each page), auth, rate limits, pagination, who creates the key and on which plan.
2. Copy the closest shell: `pennylane.ts` for a plain key, `zendesk.ts` for credentials traded for a token, `tableau.ts` for a sign-in session.
3. Write the header comment first: it is the guide for getting the key.
4. Keep the shape: `static init({ ... })`, one example method, a `private call`, everything through `request`.
5. Add a row to the table above.

## Effect v4 Notes

- The app pins `effect@4.0.0-rc.117`. Release candidates can still change APIs: upgrade on purpose, then run `pnpm typecheck` and `node scripts/check-integrations.ts`.
- An `Effect` is a description of work; nothing runs until `runIntegration` (or `Effect.runPromise`) runs it.
- v4 names differ from most examples online: `Result` instead of `Either`, `Effect.result`, `Schema.decodeUnknownEffect`, `Schema.Decoder<A>`, `Duration.Input`. See the [v3 to v4 migration guide](https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md).
- `node scripts/check-integrations.ts` checks retries, error mapping, the Google token signature and Tableau's sign-in against a fake server. Run it after changing `http.ts`.

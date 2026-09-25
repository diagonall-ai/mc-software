# Third-Party API Integrations

Every external service the app talks to has one **shell**: a class in `app/integrations/<service>.ts`. All shells have the same shape and send their calls through the shared plumbing in `app/integrations/http.ts`, built on [Effect](https://effect.website) v4.

A shell ships with one example method. When the user needs more data from a service, add one method per endpoint by copying that example.

## The Shells

| Service | File | Secrets | Watch out |
|---|---|---|---|
| Pennylane | `pennylane.ts` | `PENNYLANE_API_TOKEN` | Essentiel plan or higher; one token per company |
| Tableau | `tableau.ts` | `TABLEAU_HOST`, `TABLEAU_SITE`, `TABLEAU_TOKEN_NAME`, `TABLEAU_TOKEN_SECRET` | One session per token; data sources need "API Access" for VizQL |
| SFTP | `sftp.ts` | `SFTP_HOST`, `SFTP_USERNAME`, `SFTP_PASSWORD` or `SFTP_PRIVATE_KEY` (`SFTP_PRIVATE_KEY_PASSPHRASE`), `SFTP_HOST_KEY_FINGERPRINT` (`SFTP_PORT`) | Pin the server's fingerprint; needs Workers Paid; fails if the provider requires a fixed IP |
| Google Sheets | `google-sheets.ts` | `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY` | Recent Google Cloud organizations block key creation by default |
| Zendesk | `zendesk.ts` | `ZENDESK_SUBDOMAIN`, `ZENDESK_CLIENT_ID`, `ZENDESK_CLIENT_SECRET` | Use an OAuth client: API tokens are being retired |
| Trustpilot | `trustpilot.ts` | `TRUSTPILOT_API_KEY` | Needs the API Module (Premium add-on, or Enterprise) |
| HubSpot | `hubspot.ts` | `HUBSPOT_SERVICE_KEY` | Use a Service Key, not a private app |
| Lemlist | `lemlist.ts` | `LEMLIST_API_KEY` | The key can do everything; enrichment spends credits |

The comment at the top of each shell is the source of truth: docs and OpenAPI links, who creates the key and where, plan requirements, limits, pagination and gotchas.

## Shape Of A Shell

```ts
export class Pennylane {
  static init(credentials: { apiToken: string }): Pennylane; // credentials in, no network call
  listSupplierInvoices(options): Effect<Page, IntegrationError>; // one method per endpoint
  #call(path, schema, options); // private: base URL + auth, then request()
}
```

Every call gets, from `request` in `http.ts`:

- a 15-second timeout per attempt, never past the time the call has left;
- for GET, up to 3 retries with exponential backoff and jitter on network errors, 429 and 5xx. When the service sends `Retry-After`, the retry waits for it if the wait fits in the time left, and fails at once otherwise. Other methods are not retried unless they pass `retries`, so a write never runs twice;
- a refusal of any URL whose path climbs with `.` or `..`, so an id cannot reach another endpoint;
- response validation with Effect Schema: only the declared fields come back, and a changed API fails loudly;
- one error type, `IntegrationError`, with a `reason` and a French `message` the user can read.

`runIntegration` gives each call 30 seconds in total, so a page never hangs on a slow service; a job can allow more.

Services that trade credentials for a short-lived token (Zendesk, Google Sheets, Tableau) go through `withToken`: it reuses the token across the requests one Worker instance serves, parallel calls wait for the same token fetch, and when the service rejects the token, it fetches a new one and tries once more before blaming the key.

SFTP is not HTTP: `sftp.ts` uses [edgeport](https://github.com/gmitch215/edgeport), an SSH and SFTP client written for Workers, and gets the same time limits, retries and errors through `withinDeadline`, `retryTransient` and `IntegrationError`.

## Connect A Service With The User

1. Read the shell's header comment. Explain in plain words who must create the key and where, and check the plan requirement. Use `AskUserQuestion` for "Who is your admin on X?" or "Which plan do you have?".
2. A key never goes through the chat. Add `NAME=''` to `.dev.vars` and open the file for the user (`open -e .dev.vars` on macOS, `notepad .dev.vars` on Windows). They create the key in their browser, paste it between the quotes and save. Ask for a read-only key whenever the service offers one. A secret is named after the shell file and the `init` field it fills, in capitals: `pennylane.ts` + `apiToken` is `PENNYLANE_API_TOKEN`, `google-sheets.ts` + `serviceAccountKey` is `GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY`. The test command relies on it.
3. Then do the rest yourself, without printing the key:
   - types: run `pnpm wrangler types worker-configuration.d.ts -c wrangler.jsonc --include-runtime false` so `env.NAME` is typed;
   - production: `node -e "process.loadEnvFile('.dev.vars'); process.stdout.write(process.env.NAME)" | pnpm wrangler secret put NAME`, which works in PowerShell too. Without a pipe, Wrangler stores an empty value.
4. Test the connection right away with `pnpm integration` (next section), before building any screen.
5. Note in `APP_BRIEF.md` which services are connected, whose account each key belongs to, and when it expires.

## Test It From The Terminal

Run every new or changed method against the real service before wiring it into the app. The user should never be the first to see an integration error.

```bash
pnpm integration pennylane listSupplierInvoices '{"limit": 2}'
pnpm integration google-sheets readRange 1AbCdEf "Clients!A1:C5"
pnpm integration zendesk exportTickets '{"since": "2026-09-01", "perPage": 2}'
```

- It reads the secrets from `.dev.vars`, which win over the terminal's variables, and masks their values in everything it prints.
- Arguments are read as JSON when they parse (`'{"limit": 2}'`, `42`, `true`) and as text otherwise. Quote a number that must stay text: `'"12345"'`. Windows PowerShell 5.1 strips the quotes of JSON typed on the command line: write it to a file and pass `@args.json`.
- It prints each HTTP call (method, URL, status, time), then the result, or the `reason`, French `message` and `detail` of the error. It exits with 1 on failure.
- Like the app, a call gets 30 seconds; a method meant for a sync job can pass `--timeout "5 minutes"`.
- `pnpm integration` alone lists the shells; `pnpm integration pennylane` lists its methods.
- Ask for two or three items (`limit`, `perPage`): enough to see the shape, and less customer data in the conversation.
- Not sure what the service returns? Declare the method with `Schema.Unknown`, run it, then declare the fields you need from the real response.
- Third-party APIs work from localhost: no deploy needed (only Workers AI needs one). SFTP too: the command gives edgeport a Node stand-in for Workers' TCP sockets.

Once the method works here, add the oRPC capability and check it through the app (see "API And MCP Smoke Tests" in `AI_AGENT_GUIDE.md`).

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
4. Stay read-only. Before adding a method that writes, sends a message or spends credits, ask the user, then follow "Write Actions" below. Writes are never retried by default; a POST that only reads, like a HubSpot search, can pass `retries: 3`.
5. Take plain JSON arguments (text, numbers, booleans, lists, objects): no `Date` or class instances, so the test command, oRPC and MCP can all pass them.
6. Put a value that comes from outside (an id, a name) into the path with `encodeURIComponent`, and check its format in the oRPC contract, for example `z.uuid()` for Tableau ids.
7. Return one page and its cursor, with a page-size option so a test can ask for two items. For every page at once, add a second method that loops (see below).
8. Add the scope or permission the endpoint needs to the header comment.
9. Run it with `pnpm integration` and fix what it reports.

## Write Actions

Some tools must change something elsewhere: add rows to a Sheet, post a report, prepare a campaign, open a pull request. `GoogleSheets.appendRows` is the example.

1. Only for a need the user asked for, with their OK on what the tool will change.
2. Prefer the reversible form: add a row rather than overwrite one, create a draft or a paused campaign rather than send it.
3. Name the method after what it changes (`appendRows`, `createDraftCampaign`). Writes are not retried, since a retry could write twice; pass `retries` only when the service takes an idempotency key.
4. Test it with `pnpm integration` on something harmless first: a copy of the Sheet, a test channel, a paused campaign. Show the user the result before wiring it into the app.
5. In the app, write only from an explicit action: a button that says what it will do, then a toast with the result. When it matters, record what was written, by whom and when, in D1.

## Slack

To post to one channel (alerts, reports, reminders), use an incoming webhook: no shell needed.

1. Someone allowed to add apps to the Slack workspace opens https://api.slack.com/apps, then "Create New App" > "From scratch", turns on "Incoming Webhooks", clicks "Add New Webhook to Workspace", picks the channel, and copies the webhook URL.
2. The URL is a key: store it as `SLACK_WEBHOOK_URL` with the flow in "Connect A Service With The User".
3. From server code, `await notify("…")` (`app/lib/notify.server.ts`) posts a message. Failed scheduled jobs and services that refuse their key post there on their own.
4. To mention someone, write `<@MEMBER_ID>`: the member ID is in their Slack profile, under "Copy member ID".

Reading Slack, or posting to many channels, needs a Slack app with a bot token: that is a new shell (see "Add A New Service").

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

`runIntegration` returns the data, or logs the technical detail (`pnpm wrangler tail` in production) and throws an `ORPCError` carrying the French message, ready for a toast. It stops after 30 seconds; a background job can allow more with `runIntegration(effect, { timeout: "5 minutes" })`.

Effect stays inside `app/integrations/`: Biome rejects an `effect` import anywhere else. App code only sees the promises `runIntegration` returns. So several calls in a row, such as every page of a list, become one more shell method, written with `Effect.gen` (it reads like async code):

```ts
// In pennylane.ts
listAllSupplierInvoices(filter?: PennylaneFilter[]) {
  const page = (cursor?: string) =>
    this.listSupplierInvoices({ cursor, filter, limit: 100 });
  return Effect.gen(function* () {
    const invoices: PennylaneSupplierInvoice[] = [];
    let cursor: string | undefined;
    do {
      const result = yield* page(cursor);
      invoices.push(...result.items);
      cursor = result.next_cursor ?? undefined;
    } while (cursor);
    return invoices;
  });
}
```

Everyone who can sign in sees what the integrations return, like the rest of the app's data: the invitation code is the gate.

## Sync Into D1

Most of these services have tight quotas: Trustpilot about 550 calls a day, Google Sheets 60 reads a minute, Zendesk exports 10 a minute, Tableau VizQL 100 an hour. Do not call them on every page view:

- copy what the screens need into D1 tables, through a repository in `app/db/`;
- refresh with an "Actualiser" button that calls a sync procedure, or on a schedule with a Cron Trigger (`triggers.crons` in `wrangler.jsonc`, handled in `app/worker/scheduled.ts`);
- save resume points such as Zendesk's `after_cursor`;
- give a sync job more time than a page: `runIntegration(effect, { timeout: "5 minutes" })`;
- on the Free plan, each request or cron run gets 10 ms of CPU and 50 outgoing requests (10,000 on Paid): sync one page per run, save the resume point, and let the next run carry on. AI classification of synced items counts against 10,000 neurons a day: classify in batches, and spread a large backlog over several days.

## Sources Without An API Shell

- **SFTP when `sftp.ts` cannot connect:** if the provider only accepts known IP addresses (Workers have none) or runs an old SSH server, have the provider push its files to a Cloudflare R2 bucket through R2's S3-compatible API, with an access key limited to that bucket, or upload the CSVs in the app.
- **Software with no API:** export a CSV and upload it in the app.
- **Spreadsheet files (Excel):** a file upload, read on the server. Ask before adding a spreadsheet library.
- **Internal databases:** not an HTTP API. With a read-only database user, ideally on a copy of the database, connect through Cloudflare Hyperdrive. Decide the details with the database owner first.
- **Trustpilot without the API Module:** CSV export from Trustpilot Business, uploaded in the app.

## Add A New Service

1. Research it: docs, OpenAPI file (many docs sites publish `llms.txt`, or a `.md` version of each page), auth, rate limits, pagination, who creates the key and on which plan.
2. Copy the closest shell: `pennylane.ts` for a plain key, `zendesk.ts` for credentials traded for a token, `tableau.ts` for a sign-in session, `sftp.ts` for a protocol other than HTTP (edgeport also speaks FTP, IMAP, SMTP and more).
3. Write the header comment first: it is the guide for getting the key.
4. Keep the shape: `static init({ ... })`, one example method, a private `#call`, everything through `request` (or `withinDeadline` and `retryTransient` for a protocol other than HTTP). Never import `cloudflare:workers` in a shell: credentials come in through `init`, which is what lets `pnpm integration` run it.
5. Name the secrets `<FILE>_<INIT_FIELD>` and try the example method with `pnpm integration`.
6. Add a row to the table above.

## Effect v4 Notes

- The app pins `effect@4.0.0-rc.117`. Release candidates can still change APIs: upgrade on purpose, then run `pnpm typecheck` and `pnpm integration:check`.
- An `Effect` is a description of work; nothing runs until `runIntegration` runs it.
- Only `app/integrations/` and `scripts/` may import `effect`; Biome's `noRestrictedImports` rule enforces it. Effect also brings its own Schema next to the app's zod: use Effect Schema for API responses in the shells, zod everywhere else.
- v4 names differ from most examples online: `Result` instead of `Either`, `Effect.result`, `Schema.decodeUnknownEffect`, `Schema.Decoder<A>`, `Duration.Input`. See the [v3 to v4 migration guide](https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md).
- `pnpm integration:check` checks retries and `Retry-After`, the time limits, error mapping, refused paths, the token cache (reuse, expiry, sharing, replacement), the Google token signature and Tableau's sign-in, against a fake server, without keys. Run it after changing `http.ts`.

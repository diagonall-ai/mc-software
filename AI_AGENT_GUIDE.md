# AI Agent Guide

Step-by-step recipes for this repository. `CLAUDE.md` has the rules; this guide has the steps. The profile feature is the working example behind every recipe.

## Read First

1. `APP_BRIEF.md`: the user's business and the agreed app structure.
2. The recipe below that matches the task, and the example files it names.
3. `UI_SYSTEM.md` before building screens, `INTEGRATIONS.md` before connecting a third-party API.
4. `BOOTSTRAP.md` only when setting up a new copy of the template.

## How The App Is Layered

- `app/routes/`: pages, route guards, loaders, skeletons. No database code and no business rules.
- `app/lib/orpc/`: the capabilities that users, agents, and API clients call. The OpenAPI docs and the MCP server are generated from it.
- `app/db/`: D1 tables, repositories, ownership checks.
- `app/agents/` and `app/lib/ai.server.ts`: AI on Workers AI.
- `app/integrations/`: third-party API shells.
- `wrangler.jsonc`: Cloudflare bindings. `app/server.ts`: the Worker entry.

Server-only: `app/db/*`, `app/lib/auth-server.ts`, `app/lib/orpc/router.ts`, `*.server.ts`, and anything importing `cloudflare:workers`. Route components never import them; they go through `context.getOrpc()`.

## Add A Feature, End To End

Example: a list of suppliers the user tracks.

1. **Table.** Add it to `app/db/schema.ts` (or a file it exports). Everyone signed in shares it, so give it `createdBy` (and `updatedBy`) referencing the user, plus indexes on the common filters. Run `pnpm drizzle-kit generate`, read the SQL, and apply it locally.
2. **Repository.** Create `app/db/suppliers.ts` like `app/db/profile.ts`. Functions that write take the signed-in user's id for `createdBy`; reads return every row. Only personal data (settings, drafts) is filtered on the user.
3. **Capability.** Add `suppliers.list`, `suppliers.create`, and so on to `app/lib/orpc/contract.ts`, with paths under `/api/suppliers`. Implement them in `app/lib/orpc/router.ts`, starting each handler with `requireAuthenticatedActor`.
4. **Page.** Create `app/routes/dashboard.suppliers.tsx` like `app/routes/dashboard.profile.tsx`: loader through `context.getOrpc()`, header, skeleton, error component. Mutations call `getOrpc()`, then `router.invalidate()`.
5. **Navigation.** Add the page to `dashboardLinks` in `app/routes/dashboard.tsx` and to the ⌘K list in `app/components/dashboard/sidebar-command-bar.tsx`.
6. **Check.** Run the verification in `CLAUDE.md`, open the page in the preview, and try the new routes at `/api/docs`.

A minimal page:

```tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { RouteErrorComponent } from "~/components/route-error-state";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/suppliers")({
	loader: ({ context }) => context.getOrpc().suppliers.list(),
	staticData: {
		dashboardHeader: {
			title: "Fournisseurs",
			description: "Les fournisseurs que vous suivez.",
		},
	},
	pendingComponent: () => <Skeleton className="h-64 rounded-xl" />,
	errorComponent: RouteErrorComponent,
	component: SuppliersPage,
});

function SuppliersPage() {
	const suppliers = Route.useLoaderData();
	const { getOrpc } = Route.useRouteContext();
	const router = useRouter();

	async function addSupplier(name: string) {
		await getOrpc().suppliers.create({ name });
		await router.invalidate();
	}

	return null; // compose the page from app/components/ui
}
```

Actions for the page header go in `DashboardHeaderActionsPortal`, and footer content in `DashboardFooterLeftPortal` or `DashboardFooterRightPortal`, from `~/components/dashboard/shell-portals`.

## Add A One-Off AI Task

For summarizing, classifying, extracting, or drafting, without memory or tools.

1. Add a function next to `briefText` in `app/lib/ai.server.ts`: one TanStack AI `chat()` call with an `outputSchema`, a Zod schema with a `.describe()` on each field.
2. Call it from an oRPC handler, like `ai.brief` in `app/lib/orpc/router.ts`, or from the server code that needs it, such as a repository saving a record.
3. Tell the user it only works once deployed. Deploy with `pnpm run deploy` and test it there.

## Give The Assistant A Tool

1. In `getTools()` in `app/agents/assistant.ts`, add a `tool({ description, inputSchema, execute })`. `execute` calls an `app/db/` repository with `this.name` as the user id.
2. Write the description for the model: what the tool returns and when to use it.
3. Deploy, then try it on the assistant page.

For a second agent, copy the `Assistant` class, export it from `app/server.ts`, route its path there behind the same session check, add its binding and a new migration tag in `wrangler.jsonc`, and regenerate the types.

## Connect A Third-Party API

Follow `INTEGRATIONS.md`.

## Local Development

- `pnpm dev` serves `http://localhost:3934`. If Vite picks another port, update `SITE_URL` and `TRUSTED_ORIGINS` in `.dev.vars`.
- Scheduled jobs: see the header of `app/worker/scheduled.ts`. With the dev server running, `curl "http://localhost:3934/cdn-cgi/handler/scheduled?cron=0+6+*+*+1"` runs the job for that pattern.
- With the dev server running, `pnpm seed:dev` creates the local account `test@test.com` / `testtest`.
- Everything works offline except AI calls, which need the deployed app.
- `pnpm run doctor` checks the environment, `wrangler.jsonc`, and migrations. `pnpm run doctor:full` also probes the running app, builds, and runs the deploy dry run.

## API And MCP Smoke Tests

The API reference is at `http://localhost:3934/api/docs`, and the spec at `http://localhost:3934/api/openapi.json`.

MCP without credentials must refuse:

```bash
curl -i "http://localhost:3934/api/mcp"
```

With an API key (create one from the account menu, "Clés API"), call a route through MCP:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "Authorization: Bearer bd_your_key" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"call-route","arguments":{"method":"GET","path":"/api/profile"}}}'
```

`pnpm smoke` (dev server running, seed account) runs the whole check end to end, on both MCP protocol versions: API keys in both headers, the MCP OAuth flow (sign-in, consent, refresh token), the MCP tools, and 401s for bad credentials. For a deployed app: `EMAIL=... PASSWORD=... pnpm smoke https://your-app.workers.dev`.

Third-party integrations are tested against the real service before they reach the app:

```bash
pnpm integration pennylane listSupplierInvoices '{"limit": 2}'
```

See "Test It From The Terminal" in `INTEGRATIONS.md`.

## Anti-Drift Search

Before finishing a template-wide change, search for patterns that must not come back:

```bash
rg -n "npm run|yarn |bun |asChild|radix-ui|@radix-ui|sonner|api/v1" \
  CLAUDE.md README.md BOOTSTRAP.md AI_AGENT_GUIDE.md UI_SYSTEM.md TEMPLATE_BOOTSTRAP_PROMPT.md app
```

Allowed matches: package managers named in instructions not to use them, `asChild`, Radix, and `sonner` in rules saying not to use them and in comments inside `app/components/ui/`, and third-party URLs in `app/integrations/`.

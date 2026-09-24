# AI Agent Guide

This guide is the fast path for an AI agent landing in this repository.

The repository is a reusable bootstrap template. Your job is to preserve the template boundary first, then build the requested app on top of it only after bootstrap is complete.

## Read Order

Read these files before changing code:

1. `AGENTS.md` for non-negotiable architecture and anti-drift rules.
2. `README.md` for stack, commands, and project map.
3. `BOOTSTRAP.md` when copying this template into a new app.
4. `FEATURES.md` before adding routes, pages, or capabilities.
5. `DATA_MODEL.md` before adding tables, repositories, or migrations.
6. `ROUTING_AND_DATA_FLOW.md` before wiring loaders or mutations.
7. `UI_SYSTEM.md` before changing UI primitives or dashboard surfaces.

If those docs conflict, prefer `AGENTS.md` for boundaries and `BOOTSTRAP.md` for setup sequence.

## Mental Model

The template has four layers:

- `app/routes/` composes pages, route guards, SSR loaders, and loading skeletons.
- `app/lib/orpc/` defines the canonical user, external API, and MCP capability surface.
- `app/db/` owns D1/Drizzle schema, repositories, data validation that depends on persistence, and ownership checks.
- Cloudflare bindings in `wrangler.jsonc` provide runtime infrastructure.

Do not bypass these layers. If a feature has persistence or ownership, route files should call capabilities; they should not become database controllers.

## Current Stack Contract

- Use `pnpm` only.
- Use D1 through `env.DB` only.
- Use Drizzle from `drizzle-orm/d1`.
- Use Better Auth with the Drizzle adapter.
- Use route loaders for first paint.
- Use oRPC for real feature capabilities.
- Use generated OpenAPI and MCP from the oRPC surface.
- Use Cloudflare primitives deliberately: D1 for relational data, R2 for blobs, Durable Objects for stateful coordination, Queues for async work.
- Use `pnpm run doctor` and `pnpm run doctor:full` to verify bootstrap health.
- Use `pnpm seed:dev` for the local test account instead of raw database inserts.

## Bootstrap A New App

When this template is copied into a new workspace:

1. Put the template files at the workspace root, not inside a nested folder.
2. Remove inherited `.git` metadata and initialize fresh history.
3. Remove inherited `origin`.
4. Install with `pnpm install`.
5. Create a new D1 database:

```bash
pnpm wrangler d1 create <app-slug> --binding DB --update-config --config wrangler.jsonc
```

6. Generate Better Auth schema if plugins changed:

```bash
pnpm dlx auth@latest generate --config app/lib/auth-server.ts --output app/db/auth.schema.ts --yes
```

7. Generate and inspect Drizzle migrations:

```bash
pnpm drizzle-kit generate
```

8. Apply migrations locally and remotely:

```bash
pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
```

9. Set Worker secrets with `pnpm wrangler secret put`.
10. Run `pnpm run doctor`.
11. Run `pnpm seed:dev` against the local app after `pnpm dev` is running.
12. Deploy the scaffold before asking what to build.
13. Ask whether to create a new GitHub remote only after deployment details are known.

Never push a bootstrapped app back to the template repository.

## Local Development Origin

The Vite dev server is configured for `http://localhost:3934`.

If the server starts on another port, use the printed Vite URL as the truth and update local `.dev.vars` accordingly:

```env
SITE_URL=http://localhost:3934
TRUSTED_ORIGINS=http://localhost:3934
```

`auth-server.ts` also allows `http://localhost:*` and `http://127.0.0.1:*` as trusted origins for local development, but `SITE_URL` should still match the canonical local origin used by auth callbacks.

## Add A Dashboard Page

1. Create `app/routes/dashboard.<name>.tsx`.
2. Use `createFileRoute`.
3. Add `staticData.dashboardHeader` or return equivalent metadata from the loader.
4. Add a `pendingComponent` skeleton.
5. Keep JSX composition in the route; push data and business rules down.

Minimal shape:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/example")({
  staticData: {
    dashboardHeader: {
      title: "Example",
      description: "Example page description",
    },
  },
  pendingComponent: ExampleSkeleton,
  loader: async ({ context }) => {
    const api = context.getOrpc();
    return {
      // await api.someCapability.list(...)
    };
  },
  component: ExamplePage,
});

function ExamplePage() {
  return <div />;
}

function ExampleSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />;
}
```

If the page should appear in navigation, add it to `dashboardLinks` in `app/routes/dashboard.tsx`.

Use the shared 404, forbidden, and server-error states from `app/components/route-error-state.tsx` unless the route has a domain-specific recovery action.

## Add A Feature Capability

Use this path when the feature should be available to the UI, REST clients, MCP tools, or future agents.

1. Define input/output schemas and route shape in `app/lib/orpc/contract.ts`.
2. Implement the handler in `app/lib/orpc/router.ts`.
3. Require identity or membership with `app/lib/orpc/authorization.ts`.
4. Put database reads/writes and ownership checks in `app/db/<feature>.ts`.
5. Call the capability from route loaders with `context.getOrpc()`.
6. Use a typed client mutation after hydration and explicitly revalidate.

Do not add hand-written REST handlers for feature capabilities. `/api/v1/*` is generated from oRPC.

## Add A D1 Table

1. Add a focused schema export in `app/db/schema.ts` or a file exported by it.
2. Include ownership columns such as `organizationId` when data is tenant-scoped.
3. Add indexes for ownership and common list filters.
4. Create a repository in `app/db/<feature>.ts`.
5. Generate a migration:

```bash
pnpm drizzle-kit generate
```

6. Inspect the SQL in `drizzle/migrations/`.
7. Apply locally:

```bash
pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
```

8. Apply remotely only during bootstrap/deploy/release work:

```bash
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
```

Never drop, truncate, or destructively migrate a database without explicit user confirmation.

## Auth And Ownership Pattern

Use Better Auth as the identity source.

Server-side code should:

- derive the current user from the Better Auth session or API key session
- support MCP OAuth sessions through the authenticated oRPC context
- derive active organization from the session or membership tables
- use `requireAuthenticatedActor`, `requireActiveOrganizationMembership`, or `requireOrganizationMembership` from `app/lib/orpc/authorization.ts`
- enforce membership in repositories/services
- reject unauthorized access with an error

Do not:

- trust client-provided `userId`
- trust client-provided `organizationId`
- hide auth failures by returning `[]`, `null`, or `{}` as fake success

## Client/Server Boundary

Safe in client components:

- UI primitives from `app/components/ui/`
- browser oRPC client from `app/lib/orpc/client`
- React state and presentation-only transforms

Server-only:

- `app/db/*`
- `app/lib/auth-server.ts`
- `app/lib/orpc/router.ts`
- direct `cloudflare:workers` imports
- Worker bindings such as `env.DB`

If a loader needs data, use `context.getOrpc()`. Do not import `app/db/*` directly into route components.

## API And MCP Smoke Tests

Unauthenticated MCP should reject:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

API-key-backed MCP should work after creating an API key:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "x-api-key: bd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

OpenAPI should be available at:

```text
http://localhost:3934/api/v1/openapi.json
http://localhost:3934/api/v1/docs
```

## Anti-Drift Checklist

Before finishing, search for:

```bash
rg -n "convex|Convex|Molteni|molteni|ecomaison|showroom|declaration|npm run|yarn|bun" \
  AGENTS.md README.md BOOTSTRAP.md AI_AGENT_GUIDE.md DATA_MODEL.md FEATURES.md ROUTING_AND_DATA_FLOW.md UI_SYSTEM.md TEMPLATE_BOOTSTRAP_PROMPT.md app
```

Expected allowed matches:

- `AGENTS.md` may mention Convex only inside the explicit removed-stack warning.
- package-manager names may appear only in instructions saying not to use them.

## Verification

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm run doctor
pnpm run doctor:full
pnpm wrangler deploy --dry-run --config dist/server/wrangler.json
```

For schema work, also apply local migrations before claiming success.

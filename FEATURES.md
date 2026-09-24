# Feature Implementation Guide

This file defines where feature code belongs in this repository.

If you are adding a new feature, do not improvise the structure. Follow these placement rules.

## Core Rule

- Put UI concerns in `app/`.
- Put the canonical machine contract in `app/lib/orpc/`.
- Put persistent data and business logic in server-only repositories/services under `app/db/`.
- Keep route files thin. A route should compose UI and call existing APIs, not become the API.

## Routes

This repo uses TanStack Router flat file routing.

- `app/routes/index.tsx` is the public auth page.
- `app/routes/dashboard.tsx` is the authenticated layout route.
- `app/routes/dashboard.index.tsx` is the default child page for `/dashboard`.
- `app/routes/dashboard.*.tsx` are nested dashboard pages.

When adding a page:

- Add authenticated feature pages under `app/routes/dashboard.*.tsx` unless the page must live outside the dashboard shell.
- Add public pages as top-level route files in `app/routes/`.
- If the page should keep the sidebar visible during navigation, make it a child of `dashboard.tsx`.
- Define a loading component with a skeleton for each new page.
- Rely on the shared route error states unless the page needs domain-specific recovery.

## Route Responsibilities

Use route files for:

- `createFileRoute(...)`
- page-level layout
- route-local UI state
- route loaders for first-paint data
- calling the default oRPC client from loaders
- redirects between public and authenticated areas

Do not use route files for:

- direct database access
- core validation rules
- ownership checks
- reusable mutations or query logic

Those belong in server-only code behind `app/db/` and `app/lib/orpc/`.

Shared route failures live in `app/components/route-error-state.tsx`. Root and dashboard routes already use them for normal 404, forbidden, and server-error cases.

## Loaders

Use TanStack route loaders as the primary source of initial page data.

- Prefer the default oRPC client from router context for loader data.
- Return dashboard header metadata from the loader when the shell needs a title, description, or back button.
- Do not duplicate backend logic inside a loader.
- Do not put auth authorization logic only in a loader. Server-side ownership rules still belong behind the oRPC layer and repositories.
- Do not self-fetch `/api/v1/*` from a loader. Use `context.getOrpc()` so SSR stays in-process.

## Decision Tree

- user or agent capability: define it in the oRPC contract/router layer
- initial page render data: call that capability from the route loader via `context.getOrpc()`
- post-render mutations: use React Query or typed oRPC clients, then invalidate/reload explicitly
- local presentation state: keep it in React state
- small server-only helper that is not a feature capability: use `createServerFn`
- persistent data or ownership rules: put them in `app/db/`

## Machine Contract

- Define user and agent capabilities in the oRPC contract/router layer first.
- `/api/v1/*` is generated from that layer and is the public OpenAPI surface.
- MCP route discovery and execution are driven by the generated OpenAPI spec.
- Do not add hand-written REST handlers for feature capabilities in route files.
- If a capability should be available to an LLM or external client, it belongs in oRPC, not only in the page loader.

## Golden Path

Use the example workflow route as the reference implementation:

- capability contract: `app/lib/orpc/contract.ts`
- capability implementation: `app/lib/orpc/router.ts`
- repository/service: `app/db/*.ts`
- generated public API surface: `app/lib/api.ts`
- dashboard route using the template shell: `app/routes/dashboard.index.tsx`

The intended path:

1. define or extend a capability in oRPC
2. keep backend rules in server-only D1/Drizzle repositories
3. call the capability from the page loader with `context.getOrpc()`
4. render the first payload from loader data
5. use explicit mutation/revalidation for client updates

## Auth Checks

Auth checks belong in two places:

- route-level UX guard in `app/routes/`
- real authorization in repositories/services behind oRPC

Server-side authorization patterns:

- derive identity from Better Auth
- derive active organization from the session or membership table
- use `requireAuthenticatedActor`, `requireActiveOrganizationMembership`, or `requireOrganizationMembership` from `app/lib/orpc/authorization.ts`
- never accept `userId` from the client for auth decisions
- check ownership inside the repository/service that reads or writes protected data

## `createServerFn`

`createServerFn` is for narrow app-internal server helpers, not the canonical feature API surface.

Good fits:

- auth/session glue
- request-scoped helpers
- small server-only transforms or guards

Bad fits:

- user-facing feature capabilities
- machine-readable API surface
- feature mutations that should also be available to MCP or external clients

## UI Decomposition

Place reusable presentational components under:

- `app/components/` for feature components
- `app/components/ui/` for design-system primitives only

Do not put feature-specific components into `app/components/ui/`.

## Verification After Each Feature

After adding or changing a feature, run:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm run doctor
```

If the feature changes auth or ownership, also verify unauthenticated access, authenticated access, redirect behavior, and ownership enforcement.

## Anti-Patterns

- no self-fetching the app's own `/api/v1/*` routes from SSR loaders
- no business logic or ownership checks in route files
- no second machine contract outside `app/lib/orpc/`
- no client-side database imports
- no fake empty results for server failures
- no defaulting to `createServerFn` when the feature is a real user or agent capability

# Routing And Data Flow

This file is the short architecture note for adding features without drifting into a second pattern.

## Core Split

- `app/routes/` composes pages, loaders, redirects, and loading skeletons
- `app/lib/orpc/` defines and implements user or agent capabilities
- `app/db/` owns D1/Drizzle schema, repositories, business rules, and ownership checks
- `/api/v1/*` and MCP are generated from the oRPC layer

If the feature should be usable by the UI, an LLM, or an external client, define the capability in oRPC first.

## Decision Tree

- real user or agent capability: oRPC contract and router
- initial page render data: TanStack route loader calling `context.getOrpc()`
- dashboard shell title/description/back button: return header metadata from the same loader
- post-render updates: typed oRPC/React Query mutation with explicit revalidation
- local presentation mechanics: React state
- small server-only helper: `createServerFn`
- route failures: shared states in `app/components/route-error-state.tsx`

## Golden Path

Use the example workflow route as the starter reference:

- capability contract: [app/lib/orpc/contract.ts](/Users/arnaud/code/personnal-software/app/lib/orpc/contract.ts)
- capability implementation: [app/lib/orpc/router.ts](/Users/arnaud/code/personnal-software/app/lib/orpc/router.ts)
- OpenAPI surface: [app/lib/api.ts](/Users/arnaud/code/personnal-software/app/lib/api.ts)
- default dashboard route: [app/routes/dashboard.index.tsx](/Users/arnaud/code/personnal-software/app/routes/dashboard.index.tsx)

That path demonstrates:

1. define a capability in oRPC
2. keep backend rules behind the D1 repository/service boundary when persistence is needed
3. load initial page data through route loaders with `context.getOrpc()` when a page needs capability data
4. render from loader data on first paint
5. revalidate explicitly after client mutations

## New Feature Checklist

- define or extend the oRPC capability first
- keep ownership checks and persistent mutations in `app/db/`
- call the capability from the route loader for first paint
- return dashboard header metadata from the loader when needed
- define a skeleton loading component
- use the shared 404, forbidden, and server-error states unless domain recovery is required
- keep route files focused on composition and local state
- verify auth, ownership, and machine access

## Do Not Do This

- do not self-fetch `/api/v1/*` from SSR loaders
- do not put business logic or ownership checks in route files
- do not define a second machine contract outside `app/lib/orpc/`
- do not import database code in client components
- do not use `createServerFn` as the default feature API

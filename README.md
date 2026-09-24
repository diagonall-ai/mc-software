# TanStack Start + D1 + Cloudflare Template

A full-stack starter template combining [TanStack Start](https://tanstack.com/start), Cloudflare Workers, Cloudflare D1, Drizzle, Better Auth, oRPC/OpenAPI, and MCP.

## Bootstrap First

For a fresh clone, follow [BOOTSTRAP.md](./BOOTSTRAP.md). It is the canonical local and deployment runbook.

If you are an AI agent, start with [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md). It explains the repo boundaries, common feature recipes, and anti-drift checks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start, Vite, React |
| Routing | TanStack Router file-based routes |
| Machine API | oRPC + OpenAPI |
| Database | Cloudflare D1 through the `env.DB` binding |
| ORM | Drizzle ORM + Drizzle Kit migrations |
| Auth | Better Auth + `@better-auth/drizzle-adapter` |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Edge Runtime | Cloudflare Workers |
| Tooling | pnpm, Biome, TypeScript |

## Prerequisites

- Node.js >= 18
- pnpm
- Cloudflare account and Wrangler authentication

## Local Setup

```bash
pnpm install
pnpm wrangler d1 create <app-slug> --binding DB --update-config --config wrangler.jsonc
pnpm dlx auth@latest generate --config app/lib/auth-server.ts --output app/db/auth.schema.ts --yes
pnpm drizzle-kit generate
pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
pnpm run doctor
pnpm seed:dev
pnpm dev
```

The configured local app origin is `http://localhost:3934`. If Vite starts on a different port, use the URL printed by `pnpm dev` and update `.dev.vars` to match it.

Set local runtime secrets in `.dev.vars`:

```env
BETTER_AUTH_SECRET=replace-with-a-random-secret
SUPER_ADMIN_SIGNUP_PASSWORD=admin123
SITE_URL=http://localhost:3934
TRUSTED_ORIGINS=http://localhost:3934
```

## Cloudflare Deployment

Use Wrangler for remote D1 migrations and Worker secrets:

```bash
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put SUPER_ADMIN_SIGNUP_PASSWORD
pnpm build
pnpm wrangler deploy --dry-run --config dist/server/wrangler.json
pnpm run deploy
```

Do not store secrets in `wrangler.jsonc`.

## Project Structure

```text
.
├── app/
│   ├── db/                    # Drizzle schema, client, and repositories
│   ├── lib/
│   │   ├── auth-server.ts      # Better Auth backed by D1/Drizzle
│   │   ├── orpc/               # Canonical contract and implementation
│   │   └── mcp.ts              # OpenAPI-driven MCP bridge
│   ├── routes/                 # TanStack Router routes and loaders
│   └── worker/                 # Cloudflare Worker examples/modules
├── drizzle/migrations/         # Generated SQL migrations
├── AI_AGENT_GUIDE.md           # Fast path for future AI agents
├── drizzle.config.ts
├── wrangler.jsonc              # Worker config and D1 binding
└── package.json
```

## Data Flow

- Server code gets the database only through `drizzle(env.DB)` in `app/db/client.ts`.
- No client component imports database code.
- Route loaders are the primary source for initial page data and should call `context.getOrpc()` for feature capabilities.
- Loader data should include page header metadata when the dashboard shell needs a title, description, or back button during SSR.
- Each page should define a loading component with a skeleton so SSR and pending navigation have a real shape.
- Profile data, active organization lookup, API keys, organizations, MCP OAuth persistence, and future feature data live in D1.
- Realtime subscriptions and file/blob storage examples are intentionally removed. Add R2 or Durable Objects later only for a real feature.

## Machine Access

The app exposes:

- `GET /api/v1/openapi.json` for the OpenAPI spec
- `GET /api/v1/docs` for the API reference
- `/api/mcp` for MCP
- `/api/auth/*` for Better Auth

REST and MCP can authenticate with Better Auth API keys. MCP OAuth metadata is served from the app origin.

## Starter Utilities

- `pnpm run doctor` verifies local bootstrap configuration without mutating files or data.
- `pnpm run doctor:full` also probes the running local app, builds, and runs a Wrangler dry-run.
- `pnpm seed:dev` creates or reuses `test@test.com` / `testtest` on a local app origin and ensures a default organization exists.

The seed command refuses non-local origins unless `--allow-remote` is passed.

## Starter Error And Auth Patterns

- Shared route failures live in `app/components/route-error-state.tsx`.
- Root and dashboard routes use the shared 404, forbidden, and server-error states by default.
- Server-side permission helpers live in `app/lib/orpc/authorization.ts`.
- Use `requireAuthenticatedActor`, `requireActiveOrganizationMembership`, or `requireOrganizationMembership` inside oRPC handlers and server repositories before reading tenant data.

## Verification

Run before finishing backend or schema work:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm wrangler deploy --dry-run --config dist/server/wrangler.json
```

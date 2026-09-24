# Agent Instructions

This repository is a TanStack Start app on Cloudflare (D1, Workers AI, Durable Objects) with auth, an OpenAPI and MCP machine API, and a Mobile Club–branded UI.

- If `APP_BRIEF.md` exists, this is the user's app: read the brief first, keep it up to date, and build their domain on top of the template.
- If it does not exist, this is still the bare template. To turn it into an app, follow `TEMPLATE_BOOTSTRAP_PROMPT.md`. To improve the template itself, keep it generic: no app-specific domains, data, routes, or names.

## Working With The User

The user is not technical.

- Start each task with one plain sentence on what you are about to do. End with a short recap: what changed, where to see it, what to try next.
- Run commands, install tools, and edit files yourself. Never ask the user to open a terminal or run a command.
- Involve the user only for what they must do themselves: signing in or creating an account in the browser, clicking a button in a window that pops up, typing their own computer password.
- Ask only business questions (what data, who uses it, what a page shows), with `AskUserQuestion` and simple options. Make the technical choices yourself (libraries, tables, routes, names) and mention them in the recap.
- When something fails, fix it before asking the user anything. Do not end on "next, I will…": do it.
- Before building, read `AI_AGENT_GUIDE.md` and the closest existing example, and copy its pattern.
- Check your work in the browser preview. With the dev server running, `pnpm seed:dev` creates a local account: `test@test.com` / `testtest`.

## Stack

- Cloudflare only: Workers through Wrangler, D1 through `env.DB`, Workers AI through `env.AI`, Durable Objects. Do not add another host, database, backend, or model provider. For files, background jobs, or realtime, propose R2, Queues, cron triggers, or Durable Objects.
- TanStack Start and TanStack Router: file routes in `app/routes/`, rendered on the server first.
- Drizzle ORM and Drizzle Kit. Better Auth: email/password, API keys, MCP OAuth.
- oRPC contract and router, with the OpenAPI docs and the MCP server generated from them.
- shadcn/ui on Base UI (`base-vega`), Tailwind CSS v4, lucide icons.
- TanStack AI for one-off AI tasks, Cloudflare Think for agents.
- Third-party APIs: one Effect v4 shell class per service in `app/integrations/`.
- `pnpm` only. Deploy with `pnpm run deploy`: plain `pnpm deploy` is a different pnpm command.

## The Reference Feature

The profile is built the way every feature should be. Copy it:

- `app/db/profile.ts`: the repository. Drizzle queries scoped to a user id, errors as `ORPCError`.
- `app/lib/orpc/contract.ts` and `router.ts`: `profile.get` and `profile.update`. Handlers get the user from `requireAuthenticatedActor`.
- `app/routes/dashboard.profile.tsx`: loads through `context.getOrpc()`, saves through `getOrpc()`, then calls `router.invalidate()`.
- `app/agents/assistant.ts`: an agent tool that calls the same repository.
- `app/lib/ai.server.ts`: a one-off AI task, served as `ai.brief`.

## Data And Auth

- Database code lives in `app/db/`, runs on the server only, and uses Drizzle on `env.DB`. No database URLs, no Cloudflare REST API for queries, no SQL built from strings.
- Every user owns their data. User-owned tables have a `userId` column, and every read and write is scoped to the id from `requireAuthenticatedActor`. Never trust a `userId` sent by the browser. No organizations or teams unless the user asks.
- Keep email/password sign-in, API keys, MCP OAuth, the signup password guard, trusted origins, and the explicit base URL working.
- `.claude/rules/database.md` covers tables and migrations. It loads when you open those files.

## Pages And The App Shell

- Dashboard pages are `app/routes/dashboard.<name>.tsx` and render inside the dashboard shell.
- First-paint data comes from the route loader, through `context.getOrpc()`, which runs in-process during server rendering. Never fetch the app's own `/api/*` from a loader. After a change made from the browser, call `router.invalidate()`.
- Give every page a `pendingComponent` (a skeleton) and `errorComponent: RouteErrorComponent` from `~/components/route-error-state`.
- Header: set `staticData.dashboardHeader` to `{ title, description?, backHref? }`. For a dynamic title, also return `dashboardHeader` from the loader; the static one shows while it loads.
- Header buttons go in `DashboardHeaderActionsPortal`, footer content in `DashboardFooterLeftPortal` or `DashboardFooterRightPortal`, all from `~/components/dashboard/shell-portals`. The footer only appears when a page uses one. Do not build toolbars inside the page.
- Add every new page to `dashboardLinks` in `app/routes/dashboard.tsx` and to the ⌘K list in `app/components/dashboard/sidebar-command-bar.tsx`, or users cannot reach it.
- Anything a user, an agent, or an API client could do goes through oRPC. Use `createServerFn` only for glue that the UI alone needs.

## API, OpenAPI And MCP

- A capability is a contract in `app/lib/orpc/contract.ts` plus a handler in `app/lib/orpc/router.ts`, always changed together, with its data logic in `app/db/`. No hand-written REST routes.
- Paths start with `/api/`, except `/api/auth` and `/api/mcp`, which are taken. The API docs (`/api/docs`), the spec (`/api/openapi.json`), and the MCP tools (`/api/mcp`) follow the contract on their own.
- MCP exposes 3 fixed tools over the spec (`search-routes`, `execute`, `normalize-code`); never add MCP tools by hand. `execute` runs code in a Dynamic Worker through the `LOADER` binding, so keep `worker_loaders` in `wrangler.jsonc`.
- `.claude/rules/orpc.md` covers inputs, errors, and the descriptions agents read. It loads when you open those files.

## AI Features

- All AI runs on Workers AI through `env.AI`. Add another model provider or an API key only if the user asks.
- Local dev has no AI: remote bindings are off in `vite.config.ts`, so AI calls fail on localhost. Tell the user before they try an AI feature, and test it on the deployed app.
- One-off tasks (summarize, classify, extract, draft): one TanStack AI `chat()` call with an `outputSchema`, on the server. Copy `app/lib/ai.server.ts`.
- Assistant or chat agent: Cloudflare Think. Copy `app/agents/assistant.ts` and `app/routes/dashboard.assistant.tsx`. `app/server.ts` checks the session and names each agent instance after the user's id, so tools scope their repository calls to `this.name`.
- Prefer models that run on the free Workers plan. For a structured answer, pick a model with Workers AI JSON mode, like the example's Llama 3.3 70B: other models often answer in prose and fail the schema.

## Cloudflare

- Read bindings and secrets with `import { env } from "cloudflare:workers"`, in server code only.
- A new Durable Object class is exported from `app/server.ts` and gets a binding and a new migration tag in `wrangler.jsonc`. Never edit a migration that was deployed.
- After changing bindings, regenerate the types: `pnpm wrangler types worker-configuration.d.ts -c wrangler.jsonc --include-runtime false`, then `pnpm biome format --write worker-configuration.d.ts`.
- Secrets (`SITE_URL`, `TRUSTED_ORIGINS`, `BETTER_AUTH_SECRET`, `SUPER_ADMIN_SIGNUP_PASSWORD`, and each integration's keys) live in `.dev.vars` locally and are set with `pnpm wrangler secret put <NAME>` for production.
- `pnpm run doctor` checks the local setup.

## Third-Party APIs

Connect external services through the shells in `app/integrations/`, following `INTEGRATIONS.md`.

- One class per service, with a static `init({ ...credentials })` and one method per endpoint. Add endpoints by copying the shell's example method.
- Every call goes through `request` in `app/integrations/http.ts` (timeouts, retries, typed errors, Schema validation); shells that do not speak HTTP, like SFTP, use its `retryTransient` and `IntegrationError`. Do not call `fetch` directly for a third-party API.
- Run shells only on the server (oRPC handlers, server functions, scheduled jobs), through `runIntegration`.
- Credentials are Worker secrets: `.dev.vars` locally, `pnpm wrangler secret put` in production. Never in code or in the browser.
- Stay read-only. Ask the user before adding a method that writes, sends messages, or spends credits.
- Test every new or changed shell method against the real service with `pnpm integration <shell> <method> [args]` before wiring it into the app, and fix what it reports. The user should never be the first to hit an integration error.

## UI

- Build every screen from `app/components/ui/`, following `.claude/skills/shadcn` and `UI_SYSTEM.md`. Add a missing component with `pnpm dlx shadcn@latest add <component>`; no other UI kit.
- Base UI, not Radix: the `render` prop instead of `asChild`, `nativeButton={false}` when a `Button` renders a link, `onClick` (not `onSelect`) on menu items.
- Notifications use `toast.add(...)` from `~/components/ui/toast`. Chat screens use `MessageScroller`, `Message`, `Bubble`, `Marker`, and the AI Elements prompt input, like the assistant page.
- The cream background, the pill buttons with a hard shadow, and Whyte Inktrap are Mobile Club's brand: keep them. The yellow `primary` is only for the main action and active states. Colors come from the theme tokens only. Check light and dark mode.
- Do not add gradients, emoji as icons, numbered "01 / 02 / 03" section labels, monospace labels, italic accent words in titles, hero banners, or large stat tiles on work pages.
- Keep `/dashboard/design-system` generic, and update it when a primitive changes.

## Hygiene

- Keep source files under 1000 lines: split by responsibility before adding more.
- Never commit secrets. `.dev.vars` and `.env.local` ship as local examples; apps keep them out of git.
- A bootstrapped app never pushes to the template repository.
- Do not modify this file unless the user asks.

## Verification

Before finishing a code change, run:

```bash
pnpm lint
pnpm deploy:dry-run
pnpm typecheck
```

`deploy:dry-run` builds first, which generates `app/routeTree.gen.ts`, needed by `typecheck`.

- Schema change: `pnpm drizzle-kit generate`, then apply it locally (see `.claude/rules/database.md`).
- Change in `app/integrations/`: also run `pnpm integration:check`, and call each new or changed method once with `pnpm integration <shell> <method> [args]`.
- Page change: open it in the browser preview, in light and dark mode.

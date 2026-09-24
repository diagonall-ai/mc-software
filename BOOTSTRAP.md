# Bootstrap Runbook

This document is the canonical bootstrap procedure for this repository.

If you are an LLM or a human setting up a fresh clone, do not improvise. Follow these steps in order.

AI agents should also read [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md) before adding application features.

## What This Project Needs

- Node.js (LTS, 22.18 or newer) and pnpm
- Cloudflare Wrangler, installed by `pnpm install`, run as `pnpm wrangler`, and authenticated with the target account
- A D1 database bound as `DB`
- Better Auth secrets stored as Worker secrets or local `.dev.vars`
- Drizzle migrations generated from `app/db/schema.ts`

## Rules

- Use `pnpm` only.
- Use D1 only through the Worker binding `env.DB`.
- Do not use HTTP database URLs or Cloudflare REST calls from app runtime code.
- Do not store secrets in `wrangler.jsonc`.
- Do not deploy before local D1 migrations and auth have been verified.

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Create The D1 Database

Choose an app slug from the app's name, then create the database in Western Europe:

```bash
pnpm wrangler d1 create <app-slug> --location weur
```

Write the printed `database_name` and `database_id` into the existing `DB` entry of `wrangler.jsonc` (`--update-config` would add a second `DB` entry instead). It must read:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "<app-slug>",
    "database_id": "<created-by-wrangler>",
    "migrations_dir": "drizzle/migrations"
  }
]
```

## 3. Configure Local Runtime Secrets

The template ships a ready-to-run `.dev.vars` with local example values. It is gitignored, so it stays out of the new app's commits. Make sure it contains:

```env
BETTER_AUTH_SECRET=replace-with-a-random-secret
SUPER_ADMIN_SIGNUP_PASSWORD=admin123
SITE_URL=http://localhost:3934
TRUSTED_ORIGINS=http://localhost:3934
```

`admin123` is the local invitation code only. The template is public, so every deployed app gets its own code (see section 9); sign-up stays closed wherever no code is set.

## 4. Generate Auth Schema And Migrations

If Better Auth plugins change, regenerate the auth schema first:

```bash
pnpm dlx auth@latest generate --config app/lib/auth-server.ts --output app/db/auth.schema.ts --yes
```

Generate Drizzle migrations:

```bash
pnpm drizzle-kit generate
```

Inspect the generated SQL in `drizzle/migrations/` before applying it.

## 5. Apply Local Migrations

```bash
pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
```

## 6. Start Local Development

```bash
pnpm run doctor
pnpm dev
```

The local app runs on:

```text
http://localhost:3934
```

If Vite prints a different port, use the printed URL and update `SITE_URL` and `TRUSTED_ORIGINS` to match it.

## 7. Local Verification Checklist

Before deploying, verify:

1. Open `http://localhost:3934` or the URL printed by `pnpm dev`.
2. Confirm login/signup renders.
3. Run `pnpm seed:dev` or create a test account with the temporary signup password.
4. Confirm login, signout, and that the sidebar shows the signed-in user's name.
5. Confirm profile update.
6. Confirm the example API route or the first real domain route once added.
7. Confirm API key auth on `/api/*`.
8. Confirm MCP auth and tool listing on `/api/mcp`.

## 8. Machine Access Verification

After creating an account, create an API key from the dashboard account menu and verify rejection without a key (expect `401` with a `WWW-Authenticate` header):

```bash
curl -i "http://localhost:3934/api/mcp"
```

Then verify success with a key:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "x-api-key: bd_your_key" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

The API reference should load at:

```text
http://localhost:3934/api/docs
```

## 9. Remote Cloudflare Setup

Authenticate Wrangler:

```bash
pnpm wrangler login
pnpm wrangler whoami
```

If Wrangler lists multiple Cloudflare accounts, ask which one to use and write its id as `"account_id"` in `wrangler.jsonc` (an environment variable does not persist between commands run by an agent).

Set deployed Worker secrets. Pipe each value in: without a terminal, `wrangler secret put` stores an empty value.

```bash
openssl rand -base64 32 | pnpm wrangler secret put BETTER_AUTH_SECRET
printf '%s' 'soleil-velo-42' | pnpm wrangler secret put SUPER_ADMIN_SIGNUP_PASSWORD
```

The second value is the app's invitation code: a new one per app, easy to type. `SITE_URL` and `TRUSTED_ORIGINS` are only needed for a custom domain; on workers.dev, sign-in trusts the address the app is served from. The Worker Loader binding (MCP `execute`) stays commented out in `wrangler.jsonc` unless the account is on Workers Paid.

On the first deploy of an account without a workers.dev subdomain, Wrangler prints a link to register one: open it, pick a name, and deploy again.

Apply remote migrations:

```bash
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
```

## 10. Build And Deploy

```bash
pnpm lint
pnpm run doctor:full
pnpm typecheck
pnpm run deploy
```

`doctor:full` builds and runs the deploy dry run; the build also generates the route types that `typecheck` needs. Use `pnpm run deploy`: plain `pnpm deploy` is a different pnpm command.

## Troubleshooting

- If auth says `BETTER_AUTH_SECRET` is missing, `.dev.vars` or Worker secrets are not configured for the runtime being used.
- If D1 queries fail locally, confirm local migrations were applied with `--local`.
- If sign-up says the invitation code is wrong, confirm `SUPER_ADMIN_SIGNUP_PASSWORD` was set with a pipe (`pnpm wrangler secret list` shows it exists). On a custom domain, confirm `SITE_URL` and `TRUSTED_ORIGINS` match it.
- If the deploy fails with error 10195, the account is on the Free plan and `worker_loaders` is enabled: comment it out again.
- If a route needs first-paint data, put it in the TanStack loader and return any dashboard header metadata from that loader.
- If `pnpm run doctor` reports multiple `DB` bindings, `d1 create --update-config` appended a second one: keep a single `DB` entry with the new name and id.

# Bootstrap Runbook

This document is the canonical bootstrap procedure for this repository.

If you are an LLM or a human setting up a fresh clone, do not improvise. Follow these steps in order.

AI agents should also read [AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md) before adding application features.

## What This Project Needs

- Node.js and pnpm
- Cloudflare Wrangler authenticated with the target account
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

Choose an app slug from the folder/project name, then create and bind D1:

```bash
pnpm wrangler d1 create <app-slug> --binding DB --update-config --config wrangler.jsonc
```

Verify that `wrangler.jsonc` contains:

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

Create `.dev.vars` locally. Do not commit it.

```env
BETTER_AUTH_SECRET=replace-with-a-random-secret
SUPER_ADMIN_SIGNUP_PASSWORD=admin123
SITE_URL=http://localhost:3934
TRUSTED_ORIGINS=http://localhost:3934
```

`SUPER_ADMIN_SIGNUP_PASSWORD=admin123` is acceptable only as a temporary bootstrap password. Change it before any real or public deployment.

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
4. Confirm a default organization is created after signup/session success.
5. Create another account with the same name and confirm organization slug suffixing works.
6. Confirm login, signout, and active organization selection.
7. Confirm profile update.
8. Confirm the example API route or the first real domain route once added.
9. Confirm API key auth on `/api/v1/*`.
10. Confirm MCP auth and tool listing on `/api/mcp`.

## 8. Machine Access Verification

After creating an account, create an API key from the dashboard account menu and verify rejection without a key:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

Then verify success with a key:

```bash
curl -X POST "http://localhost:3934/api/mcp" \
  -H "x-api-key: bd_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

The API reference should load at:

```text
http://localhost:3934/api/v1/docs
```

## 9. Remote Cloudflare Setup

Authenticate Wrangler:

```bash
pnpm wrangler login
pnpm wrangler whoami
```

If Wrangler lists multiple Cloudflare accounts, choose the target account before
remote D1 commands or deploys by setting `CLOUDFLARE_ACCOUNT_ID` locally or by
adding the chosen account id to the generated Wrangler config for the new app.

Set deployed Worker secrets:

```bash
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put SUPER_ADMIN_SIGNUP_PASSWORD
```

If the deployed site URL is known, also set:

```bash
pnpm wrangler secret put SITE_URL
pnpm wrangler secret put TRUSTED_ORIGINS
```

Apply remote migrations:

```bash
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
```

## 10. Build And Deploy

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm run doctor:full
pnpm wrangler deploy --dry-run --config dist/server/wrangler.json
pnpm run deploy
```

## Troubleshooting

- If auth says `BETTER_AUTH_SECRET` is missing, `.dev.vars` or Worker secrets are not configured for the runtime being used.
- If D1 queries fail locally, confirm local migrations were applied with `--local`.
- If the deployed Worker boots but auth fails, confirm `SITE_URL` and `TRUSTED_ORIGINS` match the public origin.
- If a route needs first-paint data, put it in the TanStack loader and return any dashboard header metadata from that loader.
- If `pnpm run doctor` reports multiple `DB` bindings, Wrangler probably appended a second D1 stanza during `d1 create --update-config`; collapse the config back to one `DB` binding.

# Template Bootstrap Prompt

You are starting from a template repository, not from scratch.

## Initial Requirement

Do not ask the user what to build yet.

First, scaffold and bootstrap the template in the current workspace, create and configure a Cloudflare D1 database for this app, deploy the scaffold, and report the deployment details. Only after that should you use the `AskUserQuestion` tool to ask the user what they want built on top of the template.

## Template Repository

Use this repository as the base:

`https://github.com/beynar/personnal-software`

## Workspace Rule

The user prompt usually starts in an empty folder that is already meant to be the project root.

- Put the template files at the root of the current working directory.
- Do not create a nested subfolder inside the current workspace.
- If the current directory is empty, clone directly into it, for example with `git clone https://github.com/beynar/personnal-software .`.
- If the current directory cannot be cloned into directly, clone into a temporary location and copy the template contents into the current root without leaving the project nested in a child folder.
- If a project name is needed during bootstrap, derive a temporary one from the current folder name instead of asking the user first.
- If the current folder is not empty and cannot safely receive the template at its root, stop and explain the conflict instead of creating a surprise nested directory.

## Git History And Remote Rule

This template's git history is not the new app's history.

After the template files are materialized in the target workspace:

- remove the template repository's git metadata from the target workspace
- reinitialize git history for the new app with `git init`
- make sure there is no inherited `origin` remote pointing at the template repository
- create the first local commit only after bootstrap files and generated config are in a coherent state
- do not push to the template repository
- do not create a remote repository without asking the user first

After the initial bootstrap and deployment are complete, ask the user whether they want a new remote GitHub repository for this app.

Before asking which account should own the remote, fetch the available GitHub owner choices instead of guessing:

- use the installed GitHub app, `gh`, or another available GitHub integration to identify the authenticated user account
- fetch the organizations the authenticated user can create repositories under
- present the user with the available owner choices
- ask whether to create a new remote repository and, if yes, under which owner
- if the user declines, keep the repository local and do not add a remote

If the user asks to create the remote:

- create a new repository for the app under the selected user or organization
- add it as `origin`
- push the current branch
- report the remote URL

## Package Manager Rule

Use `pnpm` for all package management in this template.

- install dependencies with `pnpm install`
- add dependencies with `pnpm add`
- remove dependencies with `pnpm remove`
- run scripts with `pnpm <script>` or `pnpm run <script>`
- update `pnpm-lock.yaml`, not another package-manager lockfile
- do not use `npm install`, `npm uninstall`, `yarn`, or `bun` unless the user explicitly asks for a package-manager migration

## Required Workflow

1. Materialize the template repository at the root of the current working directory.
2. Reinitialize git history for the new app as described in the git history and remote rule.
3. Read these files in this exact order:
   - `AGENTS.md`
   - `AI_AGENT_GUIDE.md`
   - `BOOTSTRAP.md`
   - `FEATURES.md`
   - `DATA_MODEL.md`
   - `UI_SYSTEM.md`
4. Bootstrap the template exactly as instructed by the repository.
5. Create a new Cloudflare D1 database dedicated to this app:
   ```bash
   pnpm wrangler d1 create <app-slug> --binding DB --update-config --config wrangler.jsonc
   ```
   If Wrangler reports multiple available Cloudflare accounts, fetch and present
   the account choices, then use the selected account for D1 creation, remote
   migrations, and deployment. Do not guess the account.
6. Verify `wrangler.jsonc` contains the D1 binding:
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
7. Generate or refresh Better Auth and Drizzle migrations:
   ```bash
   pnpm dlx auth@latest generate --config app/lib/auth-server.ts --output app/db/auth.schema.ts --yes
   pnpm drizzle-kit generate
   ```
8. Apply local and remote D1 migrations:
   ```bash
   pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
   pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   ```
9. Configure secrets with Wrangler:
   ```bash
   pnpm wrangler secret put BETTER_AUTH_SECRET
   pnpm wrangler secret put SUPER_ADMIN_SIGNUP_PASSWORD
   ```
10. Run the bootstrap verifier:
   ```bash
   pnpm run doctor
   ```
11. Confirm the scaffold runs locally.
12. Seed or verify the local development account:
   ```bash
   pnpm seed:dev
   ```
13. Deploy the scaffold to Cloudflare right away by following the repository's documented deployment flow.
14. Once deployed, immediately give the user:
   - the deployed Cloudflare app URL
   - the Cloudflare D1 database name and id
   - the temporary `SUPER_ADMIN_SIGNUP_PASSWORD`
15. Ask the user whether to create a new remote GitHub repository, after fetching the available GitHub user and organization owner choices.
16. After that, use the `AskUserQuestion` tool to ask the user what they want built from the template.
17. Implement the requested application on top of the template.

## Bootstrap-Specific Instruction

During bootstrap, set a short temporary value for `SUPER_ADMIN_SIGNUP_PASSWORD` so signup can be tested quickly.

Rules for this temporary password:

- make it short
- make it easy to type
- use it only as a bootstrap/dev password
- tell the user explicitly what password you chose
- clearly say that it must be changed before any real deployment or public usage

Example acceptable temporary password:

`admin123`

## Non-Negotiable Rules

- Do not start from an empty app.
- Do not invent a different stack.
- Do not replace TanStack Start, D1, Drizzle, Better Auth, or the existing Cloudflare deployment model unless explicitly required.
- Do not guess env var names, auth setup, migration commands, or deploy commands.
- Do not invent a parallel UI system.
- Do not expose internal setup docs in the user-facing app.
- Do not commit secrets.
- Do not keep the template repository's git history in the new app.
- Do not push to a remote until the user has explicitly chosen whether to create one and under which owner.
- Do not use a package manager other than `pnpm`.
- Deployment is required. Follow the repo's Wrangler and Cloudflare instructions exactly.

## How To Work

After bootstrap and deployment are complete, ask the user what they want built and use the template as the base.

While implementing the requested application:

- keep the existing repo structure unless there is a strong reason to change it
- use `AI_AGENT_GUIDE.md` for common page, capability, table, auth, and verification recipes
- reuse existing components and patterns before creating new ones
- keep UI work aligned with `UI_SYSTEM.md`
- keep data modeling aligned with `DATA_MODEL.md`
- keep feature placement aligned with `FEATURES.md`
- use SSR loaders as the primary source of page data
- return dashboard header metadata from loaders when the shell needs a title, description, or back button
- define loading components with skeletons for new pages
- use shared route error states unless the route needs domain-specific recovery
- use `app/lib/orpc/authorization.ts` helpers for server-side permission checks
- keep D1 access server-only through repositories or services under `app/db/`

## Required Output Behavior

Before asking the user what to build, explicitly confirm:

- the template repository was copied into the root of the current workspace
- git history was reinitialized for the new app
- no inherited template `origin` remote remains
- the docs were read
- the bootstrap succeeded
- the app runs locally
- a new D1 database dedicated to this app was created
- the D1 database name and id
- local and remote D1 migrations were applied
- the app was deployed to Cloudflare
- the deployed Cloudflare app URL
- which temporary `SUPER_ADMIN_SIGNUP_PASSWORD` was set

Then ask the user whether to create a new remote repository. Fetch and present the available GitHub user and organization owner choices before asking the user to choose an owner.

After the remote repository decision is handled, ask the user what they want built.

After implementing the requested application, run the full verification again and report the result.

## Required Verification Before Finishing

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm run doctor:full
pnpm wrangler deploy --dry-run --config dist/server/wrangler.json
```

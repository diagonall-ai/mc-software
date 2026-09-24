# Template Bootstrap Prompt

You are starting from a template repository, not from scratch.

## Who You Are Working With

The user is probably not technical. They may have only installed Claude and an MCP plugin, so developer tools such as git, Node.js, pnpm, and Wrangler may be missing from this computer.

- Do every technical step yourself: install tools, run commands, edit files. Never ask the user to open a terminal or run a command.
- Explain progress in short, plain sentences. Avoid jargon, or explain it in a few words.
- Only involve the user for what they must do themselves: signing in or creating an account in the browser, clicking a button in a window that pops up, or typing their own computer password.
- When something fails, fix it yourself before asking the user for anything.
- When a choice is needed, use the `AskUserQuestion` tool with simple options.

## Initial Requirement

Do not ask the user what to build yet.

First, prepare the computer, scaffold and bootstrap the template in the current workspace, create and configure a Cloudflare D1 database for this app, deploy the scaffold, and report the deployment details. Only after that should you use the `AskUserQuestion` tool to ask the user what they want built on top of the template.

## Prepare The Computer

Detect the operating system, then check which tools are installed:

```bash
git --version
node --version
pnpm --version
```

Install what is missing, preferring installers that do not need an admin password:

- pnpm: use the official standalone installer, which works without Node.js.
  - macOS and Linux: `curl -fsSL https://get.pnpm.io/install.sh | sh -`
  - Windows (PowerShell): `Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression`
- Node.js: the template needs an LTS release, 22.12 or newer. If Node.js is missing or older, install it with `pnpm env use --global lts`.
- git:
  - macOS: run `xcode-select --install`, tell the user to click "Install" in the window that opens, and wait until `git --version` works.
  - Windows: `winget install --id Git.Git -e --source winget`
  - Linux: use the system package manager.
- Wrangler, the Cloudflare command-line tool: do not install it globally. It is a dependency of the template, so after `pnpm install` run it as `pnpm wrangler`.

A tool installed a moment ago may not be on the `PATH` of the current shell yet. If it is still "not found", start a new shell or add its install folder to `PATH` before retrying.

## Cloudflare Account

Once the template dependencies are installed, check the Cloudflare login:

```bash
pnpm wrangler whoami
```

If Wrangler is not logged in, run `pnpm wrangler login`. It opens the browser: tell the user to sign in (or first create a free account at https://dash.cloudflare.com/sign-up) and then click "Allow". Never create accounts or type credentials for the user.

MCP tools, including Cloudflare's, do not replace Wrangler. Create the D1 database, apply migrations, set secrets, and deploy with `pnpm wrangler`.

## Template Repository

Use this repository as the base:

`https://github.com/diagonall-ai/mc-software`

## Workspace Rule

The user prompt usually starts in an empty folder that is already meant to be the project root.

- Put the template files at the root of the current working directory.
- Do not create a nested subfolder inside the current workspace.
- If the current directory is empty, clone directly into it, for example with `git clone https://github.com/diagonall-ai/mc-software .`.
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

After the initial bootstrap and deployment are complete, ask the user whether they want a new remote GitHub repository for this app. Present it in plain words as an optional online backup of the code. If GitHub is not set up on this computer, say so and let the user skip it.

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

1. Prepare the computer as described in "Prepare The Computer".
2. Materialize the template repository at the root of the current working directory.
3. Reinitialize git history for the new app as described in the git history and remote rule.
4. Read these files in this exact order:
   - `CLAUDE.md`
   - `AI_AGENT_GUIDE.md`
   - `BOOTSTRAP.md`
   - `FEATURES.md`
   - `DATA_MODEL.md`
   - `UI_SYSTEM.md`
5. Rename the template for this app: set `name` in `package.json` and `wrangler.jsonc` to the app slug, and replace `[TOREPLACE]` in `.env.local` with a readable app name. Every app needs its own Worker name, otherwise deploying overwrites another app on the same Cloudflare account.
6. Bootstrap the template exactly as instructed by the repository.
7. Make sure Wrangler is logged in to the user's Cloudflare account, as described in "Cloudflare Account".
8. Create a new Cloudflare D1 database dedicated to this app:
   ```bash
   pnpm wrangler d1 create <app-slug> --binding DB --update-config --config wrangler.jsonc
   ```
   If Wrangler reports multiple available Cloudflare accounts, fetch and present
   the account choices, then use the selected account for D1 creation, remote
   migrations, and deployment. Do not guess the account.
9. Verify `wrangler.jsonc` contains the D1 binding:
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
10. Generate or refresh Better Auth and Drizzle migrations:
   ```bash
   pnpm dlx auth@latest generate --config app/lib/auth-server.ts --output app/db/auth.schema.ts --yes
   pnpm drizzle-kit generate
   ```
11. Apply local and remote D1 migrations:
   ```bash
   pnpm wrangler d1 migrations apply DB --local --config wrangler.jsonc
   pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   ```
12. Configure secrets with Wrangler:
   ```bash
   pnpm wrangler secret put BETTER_AUTH_SECRET
   pnpm wrangler secret put SUPER_ADMIN_SIGNUP_PASSWORD
   ```
   Generate a new random value for `BETTER_AUTH_SECRET`. Never reuse the example value from `.dev.vars`.
13. Run the bootstrap verifier:
   ```bash
   pnpm run doctor
   ```
14. Confirm the scaffold runs locally.
15. Seed or verify the local development account:
   ```bash
   pnpm seed:dev
   ```
16. Deploy the scaffold to Cloudflare right away by following the repository's documented deployment flow.
17. Once deployed, immediately give the user:
   - the deployed Cloudflare app URL
   - the Cloudflare D1 database name and id
   - the temporary `SUPER_ADMIN_SIGNUP_PASSWORD`
18. Ask the user whether to create a new remote GitHub repository, after fetching the available GitHub user and organization owner choices.
19. Interview the user about what to build, as described in "Understand What To Build".
20. Propose the application structure, get the user's approval, and save it in `APP_BRIEF.md`.
21. Implement the approved application on top of the template.

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

## Understand What To Build

After the scaffold is deployed and the GitHub decision is handled, learn enough about the user's activity to design the app yourself. You need a broad picture of their business, not a detailed specification.

Interview the user with the `AskUserQuestion` tool over several rounds, usually two to four. Use plain words, offer concrete options based on what they have already told you, and include a "Not sure, you decide" option when they may not know. Cover:

- their activity and the problem the app should solve
- who will use it (only them, their team, or their customers) and who can see or change what
- the main things the app keeps track of, such as clients, orders, products, appointments, or documents
- the main screens they picture and what they do on each one
- external services or APIs to connect, such as email, payments, calendars, spreadsheets, or tools they already use
- existing data to bring in, such as a spreadsheet or an export from another tool
- anything that should happen automatically, such as reminders, scheduled reports, or notifications

Do not ask about technical choices such as tables, frameworks, or libraries. Decide those yourself.

Then propose the application structure in plain language: the main sections and pages, what each one shows, the main things tracked and how they relate, who can do what, and which services are connected. Ask the user to confirm or adjust it with `AskUserQuestion` before writing code.

Save the agreed overview in `APP_BRIEF.md` at the project root. Future sessions read it to understand the business, so keep it up to date as the app grows.

## How To Work

Once the user has approved the application structure, build it on top of the template.

While implementing the requested application:

- build the smallest useful version first, deploy it, share the link, and ask for feedback before adding more
- connect external services through the shells in `app/integrations/`, following `INTEGRATIONS.md`; test each one with `pnpm integration` before showing it to the user; store their keys in `.dev.vars` and as Worker secrets with `pnpm wrangler secret put`, explain where to find each key, and never put keys in code
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

Before asking the user what to build, verify:

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

Then tell the user in plain language. Lead with what they need: the app's web address and the temporary `SUPER_ADMIN_SIGNUP_PASSWORD` to sign up with, which must be changed before real use. Put the technical details above in a short list after that.

Then ask the user whether to create a new remote repository. Fetch and present the available GitHub user and organization owner choices before asking the user to choose an owner.

After the remote repository decision is handled, start the interview described in "Understand What To Build".

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

---
paths:
  - "app/lib/orpc/**"
  - "app/lib/api.ts"
  - "app/lib/mcp*.ts"
---

# oRPC, OpenAPI And MCP

- Copy `profile.get` and `profile.update` in `contract.ts` and `router.ts`. Each handler starts with `const actor = requireAuthenticatedActor(context.auth)` and passes `actor.userId` to an `app/db/` repository.
- By default the input is the JSON body (POST, PUT, PATCH) or the query string (GET). Use `inputStructure: "detailed"` with `{ params, query, body }` only when a route mixes path params, query, and body, like `examples.workflow`.
- Path and query values arrive as strings: use `z.coerce.number()` and similar. Keep GET inputs flat, without nested objects.
- Errors the caller should see are `ORPCError`s with a code: `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`. Any other thrown error becomes a 500 "Internal server error".
- `summary`, `description`, `tags`, and each field's `.describe()` are what AI agents read through MCP `search-routes`. Say what the route does, what it returns, and its limits, for a reader who cannot see the code.
- Pages call the API through the route context: `context.getOrpc()` in loaders, `Route.useRouteContext().getOrpc()` in components.
- If you remove the demo `examples.workflow` route, update the example in the `execute` tool description in `app/lib/mcp.ts`.
- Check a new route at `/api/docs`, and through MCP with an API key (see "API And MCP Smoke Tests" in `AI_AGENT_GUIDE.md`).

# Cloudflare Examples

This file documents Cloudflare-specific reference patterns included in this template.

These are examples, not active app features.

Primary repo skill:

- `.agents/skills/cloudflare/SKILL.md`

Primary documentation rule:

- use the skill for Cloudflare service selection and repo conventions
- use current Cloudflare docs for API shapes, bindings, limits, and config
- do not fill in Cloudflare APIs from model memory when promoting an example into real code

## Location

Worker reference files live in:

- `app/worker/examples/`

Core Worker files already in the repo:

- `app/worker/scheduled.ts`
- `app/worker/rate-limiter.ts`

## Example categories

### Sandbox / isolated execution

Suggested file:

- `app/worker/examples/sandbox-runner.ts`

Skill and docs:

- skill: `.agents/skills/cloudflare/SKILL.md`
- docs: `https://developers.cloudflare.com/sandbox/index.md`
- docs: `https://developers.cloudflare.com/sandbox/api/index.md`
- docs index for LLMs: `https://developers.cloudflare.com/sandbox/llms.txt`

Purpose:

- show how to structure a Worker endpoint that delegates isolated execution to a Cloudflare sandbox-style runtime
- document required bindings, secrets, and expected request shape
- keep the example small and focused on boundary design

Document:

- required Wrangler bindings
- expected input payload
- timeout / resource constraints
- where to move logic if promoted to production

LLM use:

- useful as a stub when an LLM needs the right file location, documentation pointers, and a checklist
- not safe as an implementation source because sandbox APIs and options change quickly

### Browser rendering

Suggested file:

- `app/worker/examples/browser-render.ts`

Skill and docs:

- skill: `.agents/skills/cloudflare/SKILL.md`
- docs: `https://developers.cloudflare.com/browser-rendering/index.md`
- docs index for LLMs: `https://developers.cloudflare.com/browser-rendering/llms.txt`

Purpose:

- show how to expose a Worker endpoint that triggers a browser-rendering job
- useful for screenshots, PDF generation, scraping, or remote page rendering flows

Document:

- required Browser Rendering bindings
- auth expectations
- output format
- limits and failure modes

LLM use:

- useful as a starting point for endpoint shape and operational questions
- not safe as a drop-in implementation without current docs because bindings and integration modes can differ

### Durable Objects

Suggested file:

- `app/worker/examples/durable-object-room.ts`

Skill and docs:

- skill: `.agents/skills/cloudflare/SKILL.md`
- docs: `https://developers.cloudflare.com/durable-objects/index.md`
- docs: `https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/index.md`
- docs index for LLMs: `https://developers.cloudflare.com/durable-objects/llms.txt`

Purpose:

- show a simple stateful coordination example
- useful for rooms, sessions, queues, or collaborative state

Document:

- required `wrangler.jsonc` bindings
- migration requirements
- what state is stored and why

LLM use:

- useful for deciding whether state belongs in a Durable Object and what to document around migrations
- not safe for exact class APIs or storage details without checking current docs

### Workflows

Suggested file:

- `app/worker/examples/workflow-runner.ts`

Skill and docs:

- skill: `.agents/skills/cloudflare/SKILL.md`
- docs: `https://developers.cloudflare.com/workflows/index.md`
- docs: `https://developers.cloudflare.com/workflows/build/trigger-workflows/index.md`
- docs index for LLMs: `https://developers.cloudflare.com/workflows/llms.txt`

Purpose:

- show a durable multi-step job pattern that can be triggered from a Worker
- useful for retries, long-running orchestration, and pause / resume flows

Document:

- required Workflow bindings
- trigger path and auth model
- step boundaries and retry expectations
- where workflow state lives versus app state

LLM use:

- useful for identifying when a task should move from a single request into durable execution
- not safe for writing real workflow entrypoints from memory because bindings and lifecycle APIs must be verified

## Rules

- keep examples isolated from the application unless actually used
- keep examples documented
- do not leave secret values in example files
- if an example becomes a real feature, move it into the app deliberately and update docs

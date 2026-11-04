---
name: release
description: Prepare local deployment configuration for Cloudflare (Workers or Pages), Render, Vercel, Netlify, or another host, and verify build, start, output, environment, and health-check readiness without deploying. Use for /release, deploy readiness, wrangler.jsonc, render.yaml, vercel.json, or netlify.toml.
disable-model-invocation: true
---

# release - deployment readiness for any host

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /complete  ->  [release]  ->  deploy with explicit approval
    (feature       (config,       (human confirms
     finished)      checks)        external action)

`/release` is an optional deployment prep step. It gets the app ready to ship,
but it is not a deploy button. It can inspect, recommend, create local config
files, and run local checks. It must stop before any external provider action
unless the user gives an explicit yes in the current chat.

## Targets

| Target | Typical fit | Local config |
| --- | --- | --- |
| **Cloudflare** | static sites and frontends, full-stack Workers, existing Pages projects | `wrangler.jsonc` (or `wrangler.toml`), `_headers`, `_redirects` |
| **Render** | static sites, web services, background workers, cron jobs | `render.yaml` |
| **Vercel** | frontend and full-stack framework apps, serverless functions | `vercel.json`, only when defaults are not enough |
| **Netlify** | static and Jamstack sites, framework apps, functions | `netlify.toml` |
| **Other** | any other host (Fly.io, Railway, GitHub Pages, a VPS, Docker) | whatever that host documents |

Provider details live in `reference/providers.md`. Read only the section for
the chosen target; do not copy its contents into this skill or the report.

## Input

Optional scope:

- no argument: choose the provider by evidence (Step 2); ask if the evidence is
  missing or conflicting
- `cloudflare`, `render`, `vercel`, `netlify`: prepare readiness and config for
  that provider
- `<name>`: any other host, for example `/release flyio`
- `check`: read-only deployment readiness report. Skip Step 4 entirely.
- `config`: focus on creating or updating local provider config files; Step 4 is the only step that changes behavior for this scope.

Scopes combine, for example `/release cloudflare config`.

If the user asks to deploy, connect a provider, create a remote service, set
remote env vars, attach a domain, push, publish, or run provider commands that
affect a remote, pause and ask for explicit confirmation before doing it.

## Step 1 - read the project

Read:

- `AGENTS.md`
- `CONTEXT.md` (Deployment section, `## Features` checklist, and the active spec in `.pawang/specs/` when a work item is active; found as described in `.agents/README.md`, Specs)
- package or build files such as `package.json`, lockfiles, framework config,
  Dockerfile, `.env.example`, and README files
- existing provider config: `wrangler.jsonc`, `wrangler.toml`, `render.yaml`,
  `vercel.json`, `netlify.toml`, `_headers`, `_redirects`
- git branch and working tree status
- auth and data setup, when present: wrangler bindings (`d1_databases`,
  `r2_buckets`, `kv_namespaces`), the migrations folder, and Better Auth or
  Cloudflare Access env names (`/auth` and `/data` own the details)

Never open files that hold secret values (`.env`, `.dev.vars`, `.npmrc` with
tokens). Read `.env.example` only.

Identify:

- app type: static frontend, SSR app, API service, worker, CLI, monorepo, or
  hybrid
- build command, start command, dev command, test command, output directory, and
  package manager
- runtime needs: Node version, Python version, Docker, database, cache, object
  storage, queues, background jobs, cron, migrations, or file uploads
- env vars by name only; never print or write secret values
- health path or smoke test path

## Step 2 - choose the provider and shape

Pick the provider from evidence, in this order:

1. the user's argument or explicit statement
2. the Deployment section of `CONTEXT.md`
3. provider config files that already exist in the repo
4. the app's shape, as a recommendation only

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

If steps 1-3 disagree or all are empty, ask which provider. Do not default to
the first provider in the table. If the repo already has one provider's config,
prepare that provider; do not migrate to another provider or product (for
example Cloudflare Pages to Workers) unless the user asks.

Then decide the shape using the provider's section in `reference/providers.md`
(static site, web service, worker, cron, framework deployment, and so on).

If the provider is a poor fit, say that plainly and recommend the better target.
Examples: long-running workers usually fit Render or Fly.io better than a
frontend host; a mostly static or frontend site fits Cloudflare, Vercel, or
Netlify well.

## Step 3 - verify local readiness

Run only local, non-destructive checks that match `AGENTS.md`:

- install check only if dependencies are already present or the user approves an
  install
- build command
- test command when declared
- preview or start command if safe, then smoke test the health path
- lint or typecheck only when listed in project commands or package scripts
- a provider CLI only for local dry-run or version checks that need no login and
  change no remote state (see the provider's section)

If a command is missing, report the gap instead of inventing certainty. If a
command needs secrets, list the env var names needed and skip that check.

## Step 4 - prepare local config

Only create or update local config files when the target is clear or the user
asked for config, and never for the `check` scope.

Provider config formats, recommended products, and CLI commands change over
time. When web search or provider docs are available, confirm file names, field
names, and commands before writing config. When they are not, say which parts
come from memory and need checking.

For every provider:

- create config only when platform defaults are not enough
- keep it to what the app needs: build command, output or publish path, start
  command for services, health path when known, rewrites or headers only when
  required
- update `.env.example` with required names when useful
- add a short deployment note to README only if the project already has a
  deployment section or the user asks
- never write secret values

## Step 5 - report the release packet

Finish with a concise packet:

- **Target** - provider and product (for example Cloudflare Workers static
  assets), and why
- **Shape** - static site, web service, framework app, worker, or hybrid
- **Config changed** - files created or edited, or "none"
- **Checks run** - commands and result
- **Verified against docs** - yes, no, or partly (name what was from memory)
- **Env needed** - names only
- **Smoke test** - exact path or command to verify after deploy
- **Blockers** - anything that must be fixed before shipping, including a
  binding whose remote resource is not created yet, migrations not yet applied
  remotely, or a missing Access audience or auth secret name
- **Next action** - exact command or provider step, stopping before external
  action unless approved. To automate deploys or pull-request previews from
  GitHub, point to `/ci-deploy deploy workers` or `/ci-deploy preview workers` (or the
  `pages` scopes for a Pages project)

## Rules

- Optional only. Do not add `/release` to the mandatory build loop.
- Do not deploy, create remote services, set remote env vars, attach domains,
  push, publish, or transmit externally without explicit approval in the
  current chat.
- Do not write secret values to files or chat.
- Do not hide failing builds, missing env vars, or unknown output paths.
- Do not add provider config if the platform defaults are better.
- Do not switch provider or product for an existing setup unless asked.
- Do not invent a provider's config format. For an unknown host, report the
  generic packet and mark its config as not prepared.
- Keep the change small. Deployment setup should not become a full DevOps
  framework.

## Formatting

Format the output to match the project's conventions in
`AGENTS.md#communication` (Output formatting): concise, scannable markdown, with
lists for enumerations and tables for matrices rather than dense paragraphs.

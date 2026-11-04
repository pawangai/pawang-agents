# Provider notes for /release

## Daftar isi

- [Cloudflare](#cloudflare)
- [Render](#render)
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Other hosts](#other-hosts)
- [Common gotchas](#common-gotchas)

Read only the section for the chosen provider. Everything here is a starting
point: confirm file names, fields, and commands against the provider's current
docs when you can, because they change.

Remote actions (deploy, set remote env vars or secrets, attach a domain, create
a service, connect a Git repo, log in) always need explicit approval in the
current chat.

## Cloudflare

**Products.** Cloudflare now recommends Workers with static assets for new
projects, static or full-stack. Pages is still supported and existing Pages
projects keep working. Choose:

- new project, no existing Cloudflare config: Workers with static assets
- repo already uses Pages (`pages_build_output_dir` in config, or a Pages Git
  integration): stay on Pages unless the user asks to migrate

**Config.**

- `wrangler.jsonc` is preferred for new projects; `wrangler.toml` still works.
  Keep whichever the repo already has.
- Static site on Workers: `name`, `compatibility_date`, and
  `assets.directory` pointing at the build output. Add `main` only when there
  is Worker code (SSR, API routes, request-time logic).
- Pages: `pages_build_output_dir` and the build output directory.
- `_headers` and `_redirects` placed in the assets directory work on Workers
  static assets and on Pages.
- Static output from a framework needs no adapter. SSR needs that framework's
  Cloudflare adapter.

**Env.** Non-secret values go in the config `vars`. Secrets are set with
`wrangler secret put` or the dashboard (remote, approval needed). Local secrets
live in `.dev.vars`, which must be git-ignored and never read.

**Local checks.** Build command, then `bunx wrangler deploy --dry-run` (the project's package runner) when it
works without login. A dry run bundles but does not upload.

**Smoke test.** `GET /` returns 200, one inner route returns 200, an unknown
path returns the 404 page. After deploy, check the `workers.dev` or `pages.dev`
URL the deploy prints.

**Next action (needs approval).** `bunx wrangler deploy` for Workers, or connect
the Git repo in the dashboard (Workers Builds or Pages). Attaching a custom
domain creates DNS records: remote, approval needed.

**Previews block (Workers).** Worker Previews need a `previews` block in the
Wrangler config; `/ci-deploy preview workers` stops and points here when it is
missing. Checked against the Cloudflare Previews docs in October 2026; re-check
them, because the feature is new *(confirm)*.

- Top level is production. The `previews` block holds the settings every Preview
  uses. A Preview does not inherit production settings, and the block may be
  empty.
- Top level only: `assets`, `compatibility_date`, `compatibility_flags`.
- Needs its own entry in `previews`: `vars`, the data bindings (KV, D1, R2,
  Hyperdrive, Vectorize, Analytics Engine, Pipelines, Secrets Store), Queue
  producers, Workflows, `define`, `tail_consumers`.
- Never in `previews`: Queue consumers, Cron Triggers, routes. They target
  production only.
- A binding the code reads but `previews` lacks does not exist in the Preview
  (error 1101). A binding that points at the production resource writes to
  production. Both are blockers to report.
- Durable Objects and Containers get their own namespace or app per Preview;
  declare them in `previews` too when the code reads them from `env`.
- Edit JSONC by hand and keep its comments. Use placeholders for resource ids
  until the user has created the preview resources.

```jsonc
{
  "name": "my-api",
  "d1_databases": [{ "binding": "DB", "database_name": "my-api", "database_id": "<production id>" }],
  "kv_namespaces": [{ "binding": "CACHE", "id": "<production id>" }],
  "previews": {
    "vars": { "ENVIRONMENT": "preview" },
    "d1_databases": [{ "binding": "DB", "database_name": "my-api-preview", "database_id": "<preview id>" }],
    "kv_namespaces": [{ "binding": "CACHE", "id": "<preview id>" }]
  }
}
```

Creating a preview resource (`wrangler d1 create`, `kv namespace create`, `r2
bucket create`, `hyperdrive create`) is a remote action: hand it to `/data`,
which needs approval, and put the returned id into the block. Do not create it
here. A Preview limit applies per Worker (100 on Free, 500 on paid, and 100
deployments per Preview) *(confirm)*. To check the result, point to
`/ci-deploy audit workers`.

## Render

**Shapes.** Static site, web service, background worker, cron job, plus a
database paired with a service.

**Config.** Prefer `render.yaml` (Blueprint) when setup must be repeatable or
there is more than one service. Include:

- service type and runtime (a static site is a web service with the static
  runtime)
- `buildCommand`
- `startCommand` for web services and workers
- `staticPublishPath` for static sites
- `healthCheckPath` when known
- env var names without values; mark secrets as not synced so Render prompts
  for them
- region or plan only if the user specified it

Confirm field names against Render's current Blueprint spec before writing.

**Local checks.** Build command; preview or start command with a smoke test on
the health path.

**Smoke test.** The health path for services; `GET /` for static sites.

**Next action (needs approval).** Connect the repo and apply the Blueprint in
the Render dashboard.

## Vercel

**Shapes.** Framework deployment with auto-detected settings, static output,
serverless or edge functions, monorepo with a root directory.

**Config.** Many projects need no `vercel.json`. Create it only for:

- a build command, output directory, or install command that differs from the
  detected defaults
- rewrites, redirects, or headers the app requires

The monorepo root directory is a project setting, not a `vercel.json` field.

**Env.** Names only in `.env.example`. Setting them is remote (dashboard or
`vercel env add`): approval needed.

**Local checks.** The project's build command. Skip provider CLI commands that
need `vercel login` or pull remote project state.

**Smoke test.** `GET /`, one inner route, and one function route if any.

**Next action (needs approval).** Connect the Git repo, or run `vercel` for a
preview and `vercel --prod` for production.

## Netlify

**Shapes.** Static site, framework app, site with functions.

**Config.** `netlify.toml` only when defaults are not enough:

- `[build]` with `command` and `publish` (the output directory)
- `[functions]` with `directory` when the repo has functions
- `[[redirects]]` and `[[headers]]` when needed; `_redirects` and `_headers`
  files in the publish directory also work
- `[build.environment]` for non-secret build settings such as the Node version

**Env.** Secrets are set in the Netlify UI or CLI (remote, approval needed).
Names only in `.env.example`.

**Local checks.** Build command; confirm the `publish` directory exists after
the build.

**Smoke test.** `GET /`, one inner route, unknown path returns the 404 page.

**Next action (needs approval).** Connect the Git repo, or `netlify deploy`
(draft) and `netlify deploy --prod`.

## Other hosts

Examples: Fly.io (`fly.toml`, usually a Dockerfile), Railway, GitHub Pages
(static only, deployed from a GitHub Actions workflow), a VPS or Docker host.

1. Ask which host if it is not already known.
2. Find the host's config file name and format in its current docs. If docs are
   not reachable, do not guess field names.
3. If the format is unknown, report the generic packet (build command, output or
   start command, env names, health path) and mark provider config as "not
   prepared".
4. Apply the same remote-action rules as above.

## Common gotchas

- **SPA fallback.** A client-routed single-page app needs a rewrite of unknown
  paths to `index.html` (a `_redirects` line, `vercel.json` rewrite, or
  `netlify.toml` redirect). A static site with real HTML per page does not.
- **Output directory.** Confirm it exists after a real build; do not assume
  `dist/` or `build/`.
- **Node version.** Pin it in the provider's setting or `.nvmrc`, matching
  `package.json` engines.
- **Env at build time vs runtime.** Static sites read env at build time only.
- **Trailing slashes and 404.** Check one unknown path after deploy.

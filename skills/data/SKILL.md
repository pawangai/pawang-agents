---
name: data
description: Choose and prepare the database, ORM, object storage, and key-value store (Drizzle ORM, Cloudflare D1, R2, KV, Supabase, Neon, or another) and verify schema, migration, binding, and connection readiness locally without touching remote data. Use for /data, database setup, Drizzle migrations, D1, R2, KV, Supabase, Neon, file storage, or caching.
disable-model-invocation: true
---

# data - database, storage, and cache readiness for any provider

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /context      ->  [data]  ->  /feature, /implement  ->  /release
    (stack known)  (choose,    (build features on          (deploy prep)
                    prepare)    the schema)

`/data` is an optional setup step. It picks where data lives, prepares local
schema and config, and runs local checks. It is not a provisioning button: it
stops before creating remote resources, running remote migrations, or touching
remote data unless the user gives an explicit yes in the current chat.

## Targets

| Target | Role | Typical fit | Local config |
| --- | --- | --- | --- |
| **Drizzle ORM** | query and schema layer, not a store | any SQL store below; dialect `sqlite` for D1, `postgresql` for Neon or Supabase | `drizzle.config.ts`, schema files, `drizzle/` migrations |
| **Cloudflare D1** | relational (SQLite) | apps already on Workers; small to medium relational data | `d1_databases` binding in wrangler config, migrations folder |
| **Cloudflare R2** | object storage | user uploads, images, exports, backups | `r2_buckets` binding |
| **Cloudflare KV** | key-value | read-heavy config, flags, cached lookups | `kv_namespaces` binding |
| **Cloudflare Hyperdrive** | pooled connection from a Worker to an external Postgres or MySQL, not a store | Workers reaching Supabase, Neon, or self-hosted Postgres | `hyperdrive` binding |
| **Neon** | relational (serverless Postgres) | Postgres without bundled extras; branching for previews | connection strings in env |
| **Supabase** | relational (Postgres) plus bundled auth, storage, realtime | projects that want those extras or row-level security | connection strings and project keys in env |
| **Other** | Turso, PlanetScale, self-hosted Postgres, S3, Redis | whatever that service documents | per its docs |

Provider details live in `reference/providers.md`. Read only the sections for
the chosen targets; do not copy their contents into this skill or the report.

## Input

Optional scope:

- no argument: choose by evidence (Step 2); ask if evidence is missing or
  conflicting
- `drizzle`, `d1`, `r2`, `kv`, `neon`, `supabase`: prepare those targets
- `<name>`: any other service, for example `/data turso`
- `check`: read-only data readiness report
- `config`: focus on creating or updating local schema and config files

Scopes combine, for example `/data drizzle d1 r2`.

If the user asks to create a database, bucket, namespace, or project, run a
remote migration, seed or delete remote data, rotate or set remote secrets, or
run any provider command that affects a remote, pause and ask for explicit
confirmation first.

## Step 1 - read the project

Read:

- `AGENTS.md`
- `CONTEXT.md` (Data, Stack, Deployment, and Usage model sections, plus the active spec in `.pawang/specs/` when a work item is active; found as described in `.agents/README.md`, Specs)
- `.pawang/conventions/database.md` (when present)
- `package.json`, lockfile, `.env.example`
- existing ORM and schema files, `drizzle.config.ts`, migration folders
- deploy config: `wrangler.jsonc`, `wrangler.toml`, `render.yaml`,
  `vercel.json`, `netlify.toml`
- existing upload, cache, or storage code
- git branch and working tree status

Never open files that hold secret values (`.env`, `.dev.vars`). Read
`.env.example` only, and never print connection strings.

Identify:

- what is stored: relational records, files, cached or config values
- relationships, ownership, and which tables hold user data
- where the app runs, which decides how the database is reached (Worker binding
  or network connection)
- expected size and write rate, only if stated; do not assume scale
- env vars and bindings by name only

## Step 2 - choose the stores and shape

Pick from evidence, in this order:

1. the user's argument or explicit statement
2. the Stack or Deployment section of `CONTEXT.md`
3. config, bindings, or dependencies already in the repo
4. the data's shape, as a recommendation only

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

If steps 1-3 disagree or are all empty, ask. Do not default to the first row.
Never migrate existing data or stores to another provider unless asked.

Match data to store, and say plainly when something is a poor fit:

- Relational data with relationships and transactions: D1, Neon, or Supabase,
  through Drizzle. Not KV.
- Files and blobs: R2 (or Supabase Storage if the project already uses Supabase).
  Not a database column.
- Small read-mostly values, flags, cached lookups: KV. KV is eventually
  consistent, so it is a poor fit for counters, locks, inventory, or anything
  that must read its own write immediately.
- App on Cloudflare Workers with modest relational needs: D1 is the lowest-friction
  fit. Neon and Supabase also work over the network.
- App needs bundled auth, storage, realtime, or row-level security: Supabase.
  Plain serverless Postgres with branches: Neon.
- Do not use two relational stores for the same data.

## Step 3 - verify local readiness

Run only local, non-destructive checks that match `AGENTS.md`:

- typecheck, build, and tests when configured
- generate a migration from the schema and confirm it is committed and the schema
  and migration folder agree (`drizzle-kit generate`; never `push` for anything
  but a throwaway local database)
- apply migrations to a local database only (local D1, a local SQLite file, or a
  local or branch Postgres the user named), then run a read and write smoke
  through the app's data layer
- for R2 and KV, confirm the binding names in code match the config and test
  against the local or emulated binding
- a provider CLI only for local, login-free steps (for example a local D1 apply)

If a check needs secrets or a remote service, list the env names needed and skip
it. Never point a check at a remote database to "see if it works".

## Step 4 - prepare local config

Create or update local files only when the target is clear or the user asked for
config.

Provider config and CLI details change. When web search or provider docs are
available, confirm package names, config fields, and commands before writing.
When they are not, say which parts come from memory.

For every store:

- schema changes go through migrations only; no manual edits to a live database
- keep one data-access layer; routes and UI do not build queries inline
- eager-load relations to avoid N+1; wrap multi-table writes in a transaction
- parameterized queries only
- put non-secret binding names in config and secrets in env; update
  `.env.example` with names only
- for uploads: sanitize filenames (UUID or slug), validate type by magic bytes and
  enforce a size limit, stream large files, and clean up aborted uploads
- no new dependency or service without explicit approval (see `AGENTS.md`)
- keep time in UTC

## Step 5 - report the data packet

- **Stores** - provider per kind of data, and why
- **Shape** - tables or entities, buckets, key patterns
- **Config changed** - files created or edited, or "none"
- **Migrations** - generated, applied locally, and pending remotely
- **Checks run** - commands and result
- **Verified against docs** - yes, no, or partly (name what came from memory)
- **Env and bindings needed** - names only
- **Remote steps (need approval)** - create resources, remote migrations, secrets,
  seeds
- **Smoke test** - exact read/write path or command to verify after deploy
- **Blockers** - anything to fix before shipping
- **Next action** - exact step, stopping before external action unless approved

## Rules

- Optional only. Do not add `/data` to the mandatory build loop.
- Never create remote databases, buckets, namespaces, or projects, run remote
  migrations, seed, or delete remote data without explicit approval in the
  current chat. Before any approved remote migration, show the SQL it will run.
- Never write or print secret values or connection strings.
- Never use `drizzle-kit push` against a shared or production database.
- Do not hide failing migrations, missing bindings, or unknown env vars.
- Do not switch stores for existing data unless asked.
- Keep the change small. Data setup should not become a platform.

## Formatting

Format the output to match the project's conventions in
`AGENTS.md#communication` (Output formatting): concise, scannable markdown, with
lists for enumerations and tables for matrices rather than dense paragraphs.

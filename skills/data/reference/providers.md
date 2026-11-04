# Provider notes for /data

## Daftar isi

- [Drizzle ORM](#drizzle-orm)
- [Cloudflare D1](#cloudflare-d1)
- [Cloudflare R2](#cloudflare-r2)
- [Cloudflare KV](#cloudflare-kv)
- [Cloudflare Hyperdrive](#cloudflare-hyperdrive)
- [Neon](#neon)
- [Supabase](#supabase)
- [Other stores](#other-stores)
- [Common gotchas](#common-gotchas)

Read only the sections for the chosen targets. Everything here is a starting
point: confirm package names, fields, and commands against current docs when you
can, because they change. Items marked *(confirm)* come from memory.

Remote actions (create a database, bucket, namespace, or project; remote
migrations; remote secrets; seeds; deletes) always need explicit approval in the
current chat.

## Drizzle ORM

**Role.** Schema and query layer over D1, Neon, Supabase Postgres, or another SQL
store. Pick the dialect and driver to match the store.

**Config.** `drizzle.config.ts` with `schema`, `out` (migrations folder),
`dialect`, and credentials for the store.

| Store | `dialect` | Runtime driver import |
| --- | --- | --- |
| D1 | `sqlite` | `drizzle-orm/d1` with the Worker binding |
| Neon (HTTP) | `postgresql` | `drizzle-orm/neon-http` with `@neondatabase/serverless` |
| Neon (WebSocket, long-lived server) | `postgresql` | `drizzle-orm/neon-serverless` |
| Supabase or any Postgres | `postgresql` | `drizzle-orm/postgres-js` or `drizzle-orm/node-postgres` |

**Workflow.** Edit schema, `drizzle-kit generate`, review the SQL, apply with the
store's migration path, commit the migration. Use `generate` plus `migrate` (or
wrangler for D1), not `push`, outside a throwaway local database.

**Local checks.** Generate produces no diff after the schema is committed; local
apply succeeds from an empty database; one insert and one select through the data
layer.

## Cloudflare D1

**Fit.** Relational data for Workers apps. SQLite semantics, reached through a
Worker binding, not a network connection. Check current size and throughput
limits for the plan before promising scale.

**Config.** In wrangler config, a `d1_databases` entry with `binding`,
`database_name`, `database_id`, and `migrations_dir`. Point `migrations_dir` at
the Drizzle `out` folder so both tools share one set of migrations *(confirm)*.
Creating the database (`wrangler d1 create`) is remote: approval needed, and the
returned id goes into config.

**Migrations.** Local: `wrangler d1 migrations apply <DB_NAME> --local`. Remote:
the same with `--remote`: approval needed, show the SQL first.

**Access from outside the Worker.** D1 has no public connection string. Tools
like `drizzle-kit` reach it only via the HTTP API with account credentials
(`d1-http` driver) *(confirm)*, which are secrets; prefer wrangler for applying
migrations.

**Env and bindings (names only).** The binding name (for example `DB`). Only if
the HTTP API is used: account id, database id, and an API token, all secret.

**Smoke test.** A read-write round trip route or script against the local
database; after deploy, the same against the deployed Worker with a throwaway row
the user approves.

**Gotchas.**

- Binding names in code must match config exactly.
- Local and remote databases are separate; a local apply says nothing about
  remote.
- Batch statements for multi-row atomic writes *(confirm Drizzle's D1 batch and
  transaction support)*.

## Cloudflare R2

**Fit.** Object storage for uploads, images, exports. S3-compatible API plus a
Worker binding.

**Config.** `r2_buckets` entry with `binding` and `bucket_name`. Creating the
bucket is remote: approval needed.

**Env and bindings (names only).** The binding name. S3-API access from outside
Workers needs an access key id and secret, both secret.

**Rules for uploads.**

- Store under server-generated keys (UUID or slug), never the client filename.
- Validate type by magic bytes, not the extension or client content type; enforce
  a size limit; stream large bodies.
- Keep the object key and metadata (owner, content type, size) in the database;
  check ownership before serving or deleting.
- Private by default. Serve through the app or short-lived signed URLs; do not
  make the bucket public unless the files are meant to be public.
- Clean up objects from aborted uploads and when their owning record is deleted.

**Smoke test.** Upload a small test object, read it back, delete it, locally and
(with approval) after deploy.

## Cloudflare KV

**Fit.** Read-heavy, small values: flags, config, cached lookups. Eventually
consistent: a write may take time to appear everywhere, so it is not for counters,
locks, inventory, or read-your-write flows *(confirm current propagation
behavior)*.

**Config.** `kv_namespaces` entry with `binding` and `id`. Creating the namespace
is remote: approval needed.

**Practice.** Always set a TTL on cache entries; namespace keys with a prefix per
purpose; keep values small; treat KV as rebuildable from the source of truth.

**Smoke test.** Put, get, and delete a test key through the app locally.

## Cloudflare Hyperdrive

**Fit.** Connection pooling and caching between a Worker and an existing Postgres
or MySQL database (Supabase, Neon, self-hosted). It is a binding, not a database:
the data stays in the external store. Not needed for D1.

**Config.** A `hyperdrive` entry with `binding` and `id`. Creating the config
(`wrangler hyperdrive create <name> --connection-string ...`) is remote: approval
needed. The connection string is a secret: the user runs the command so the value
never enters the chat, a file, or a command you run. The returned id goes into
config. For local development use a local connection string from config or an
environment variable, never the production one *(confirm the current local-dev
option in the Hyperdrive docs)*.

**Previews.** A Preview needs its own Hyperdrive config that points at a separate
database or schema, for example a separate Supabase project, declared under
`previews.hyperdrive`. A Preview bound to the production config writes to
production. Preview migrations use the preview connection string only: in the
Preview command, never the build command, with the URL held by the Preview
trigger and never the production trigger. With Supabase CLI migrations the
preview script is `supabase db push --db-url "$<preview URL variable>"`
*(confirm the flag against the current Supabase CLI)*. `/ci-deploy audit workers`
reports a preview binding that matches production.

**Env (names only).** The binding name; the preview and production migration URL
variables (secret, set per Workers Builds trigger); the string used to create each
config (secret).

**Smoke test.** A read-write round trip through the binding using a throwaway row
the user approves; confirm a row written from a Preview is absent from production.

**Gotchas.**

- Two Hyperdrive configs on one database are not isolation; isolation comes from
  the database or schema they point at.
- Follow the pooler note under Supabase for prepared statements *(confirm)*.

## Neon

**Fit.** Serverless Postgres with branching (handy for previews and tests).

**Connection strings.** Two, by purpose:

- `DATABASE_URL`: the pooled string (host contains `-pooler`) for the running
  app.
- `DATABASE_URL_UNPOOLED`: the direct string for Drizzle Kit migrations, since
  pooled connections can break migrations.

Names follow Neon's Drizzle guide; keep whatever the repo already uses.

**Driver.** `neon-http` for serverless and edge runtimes; the WebSocket or
`node-postgres` driver for long-lived servers and transactions that need a
session *(confirm that the HTTP driver's transaction support meets the need)*.

**Migrations.** `drizzle-kit migrate` with the unpooled string, run before the
new app version serves traffic. Against a branch for testing; against the
production branch only with approval.

**Local checks.** A local Postgres or a dev branch the user named; never the
production string.

**Smoke test.** A read and a write through the data layer after deploy.

## Supabase

**Fit.** Postgres plus bundled auth, storage, realtime, and row-level security
(RLS). If the project only needs a database, Neon or D1 is lighter.

**Connection.** Direct connection for migrations; the pooler for app runtime.
With the transaction-mode pooler, disable prepared statements in the driver
(`prepare: false` with postgres.js) *(confirm against current Supabase and Drizzle
docs)*.

**Keys.** The anon (publishable) key may reach the client; the service-role key
bypasses RLS and must stay on the server, never in client code or the repo.

**RLS.** Every table exposed through Supabase's API needs RLS enabled and
policies written. A table without RLS is open to anyone holding the anon key. If
the app reaches Postgres only through server-side Drizzle, say so, and still
enable RLS as defense in depth when the API is exposed.

**Migrations.** Keep one source: Drizzle migrations or Supabase CLI migrations,
not both for the same schema. Remote application needs approval.

**Env (names only).** Database URL (direct and pooled), project URL, anon key,
service-role key (secret).

**Smoke test.** Read and write through the data layer; confirm an anonymous
client request to a protected table is denied.

**Previews.** A Preview needs a separate Supabase project, reached through its own
Hyperdrive config (see Cloudflare Hyperdrive); never point a Preview at the
production project or a production schema.

## Other stores

Examples: Turso, PlanetScale, self-hosted Postgres, S3, Redis.

1. Ask which store if not already known.
2. Find its current driver, config, and migration steps in its docs. If docs are
   not reachable, do not guess field names.
3. If the format is unknown, report the generic packet (entities, env names,
   migration path, smoke test) and mark provider config as "not prepared".
4. Apply the same remote-action rules as above.

## Common gotchas

- **Local vs remote drift.** A migration applied locally is not applied remotely.
  Track both, and run remote migrations before the new code serves traffic.
- **Migration ordering.** Make migrations backward compatible with the currently
  deployed code, or deploy in two steps.
- **Secrets in config.** Connection strings, API tokens, and service keys never go
  in source or `wrangler` config; ids and binding names are fine.
- **Time.** Store timestamps in UTC.
- **N+1.** Load relations in one query.
- **Backups.** Say who owns backups and restore for the chosen store before
  production; do not assume the free tier keeps them.

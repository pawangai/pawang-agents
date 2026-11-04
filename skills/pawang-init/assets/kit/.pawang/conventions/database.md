# Database and storage conventions

Read before changing schema, queries, R2, or KV. Index: [README.md](README.md).

## Database (Drizzle ORM)

- Use Drizzle ORM for all database operations; no raw SQL unless Drizzle cannot express the query
- The store comes from `/data`: D1 (dialect `sqlite`) by default on Workers; Neon or Supabase use dialect `postgresql`
- On D1 the database is a Worker binding, so build the Drizzle client per request from `c.env`, not at module load
- Schema is the source of truth in `src/db/schema/`; derive row types with `$inferSelect` / `$inferInsert`
- Schema changes go through migrations only: `drizzle-kit generate`, review the SQL, commit it; never `drizzle-kit push` outside a throwaway local database; never edit an applied migration
- Apply migrations locally first; applying to a remote database needs explicit approval and happens before the new code serves traffic
- Eager-load relations (no N+1); filter, join, and aggregate in the query, not in application memory
- Wrap multi-table writes in a transaction (or a D1 batch where transactions are unavailable)
- Parameterized queries only; store and process time in UTC

## Storage and Cache (R2, KV)

- Binding names live in `Bindings` and match `wrangler.jsonc` exactly
- R2 uploads: server-generated keys (UUID or slug), never the client filename; validate type by magic bytes and enforce a size limit; stream large bodies; clean up aborted uploads; keep object metadata and owner in the database and check ownership before serving or deleting
- KV is for small, read-mostly, rebuildable values with a TTL; never for counters, locks, or anything that must read its own write

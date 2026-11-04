# Auth conventions

Read before touching auth, sessions, or access policy. Index: [README.md](README.md).

## Auth (Better Auth or Cloudflare Access)

- Use one primary mechanism, chosen with `/auth`; no hand-rolled sessions, password handling, or JWT verification
- Deny by default: protected routes sit behind an auth middleware, and public routes are the explicit exception
- Resolve the current user in one place (middleware) and pass it through `c.var`; handlers never read identity from client-supplied ids or headers
- Scope every user-owned query by the current user id and verify resource ownership on reads, updates, and deletes (no IDOR)
- 401 means not signed in; 403 means signed in but not allowed
- Better Auth: server config in `src/lib/auth.ts` with the Drizzle adapter, created per request from `c.env` on Workers; regenerate the auth schema with its CLI after plugin changes, then create a Drizzle migration; do not hand-edit generated auth tables
- Cloudflare Access: validate `Cf-Access-Jwt-Assertion` on every protected request (signature from the team certs endpoint matched by `kid`, plus `iss`, `aud`, and expiry), fail closed, and never trust the header unvalidated
- Secrets (`BETTER_AUTH_SECRET`, OAuth keys, API tokens) come from env or Worker secrets; never commit them

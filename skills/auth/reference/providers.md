# Provider notes for /auth

## Daftar isi

- [Better Auth](#better-auth)
- [Cloudflare Access](#cloudflare-access)
- [Other providers](#other-providers)
- [Common gotchas](#common-gotchas)

Read only the section for the chosen provider. Everything here is a starting
point: confirm package names, commands, and fields against current docs when you
can, because they change. Items marked *(confirm)* come from memory.

Remote actions (create accounts, Access applications or policies, OAuth clients,
remote secrets, real users) always need explicit approval in the current chat.

## Better Auth

**Fit.** Public or multi-user apps that need their own user records, sessions,
email/password, or social login, stored in the project's database.

**Local files.**

- Server config in `src/lib/auth.ts`, client in `src/lib/auth-client.ts` (match
  the layout already in the repo).
- One server route mounts the Better Auth handler.
- Use the Drizzle adapter with the project's database: provider `sqlite` for D1,
  `pg` for Neon or Supabase Postgres *(confirm exact option names)*.
- Set `baseURL` and trusted origins from env so production and preview origins
  are explicit, not wildcards.

**Schema.** Run `bunx auth@latest generate`. With Drizzle it writes a schema file
that Drizzle owns from then on; `bunx auth@latest migrate` is for the built-in
Kysely adapter only. Then create a Drizzle migration (see `/data`). Regenerate
after adding or removing plugins. Do not hand-edit generated auth tables. Check
with `bunx auth@latest check schema` when available.

**Cloudflare Workers + D1.** D1 is reachable only through the Worker binding, so
the auth instance is built from the request's `env` (a factory such as
`createAuth(env)`), not at module load. Expect the `nodejs_compat`
compatibility flag to be needed *(confirm)*. The CLI cannot reach D1 directly;
generate the schema locally and migrate with Drizzle and wrangler.

**Env (names only).** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, plus each OAuth
provider's client id and secret. Secrets live in `.dev.vars` or `.env` locally
(git-ignored, never read) and in the host's secret store remotely (approval
needed).

**Local checks.** Typecheck, build, tests. Sign-up and sign-in round trip against
a local database. Signed-out session lookup returns no user. A protected route
returns 401 or redirects when anonymous.

**Smoke test after deploy.** Signed-out `GET` of the session endpoint returns no
session; protected route rejects anonymous; one sign-in round trip with a test
account the user created; cookies are `Secure` and `HttpOnly`.

**Gotchas.**

- Session reads happen on the server inside every function that touches user
  data. Client hooks are for UI state only.
- Email verification and password reset need an email sender; list it as a
  blocker if none is configured.
- Changing the domain changes the cookie scope and OAuth redirect URLs.

## Cloudflare Access

**Fit.** Internal tools, admin areas, staging. Access sits in front of the app at
Cloudflare's edge and forwards only authenticated requests, with a signed JWT.
It gives you identity, not a sign-up flow or user table.

**Where the work is.**

- The Access *application* and its *policies* (who may enter) are created in the
  Cloudflare Zero Trust dashboard or API: remote, approval needed.
- Local work is the app-side check: validate the JWT on every protected request.

**Token.** Cloudflare sends the JWT in the `Cf-Access-Jwt-Assertion` header (the
`CF_Authorization` cookie also carries it, but the header is the one to validate).

**Validate on every protected request.**

- Signature, using keys fetched from
  `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/certs`, matched by the
  token's `kid`. Never hard-code a key; cache keys and refetch on an unknown
  `kid`. Signing keys rotate (every 6 weeks by default, old keys stay valid
  briefly).
- `iss` equals `https://<team-name>.cloudflareaccess.com`.
- `aud` equals the application's Audience (AUD) tag.
- Expiry.
- Reject the request on any failure (fail closed).
- Use the validated `email` claim as identity. Authorization (roles, ownership)
  is still the app's job.

**Env (names only).** `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`. Neither is a
secret, but keep them in config or env, not in source.

**Close the side doors.** Access only protects the hostname it is attached to. A
`*.workers.dev` URL, a `*.pages.dev` preview URL, or the origin server reachable
directly can bypass it. Disable or also protect them *(confirm current
wrangler options for workers.dev and preview URLs)*, and for a non-Cloudflare
origin, accept traffic only through the Access-protected hostname.

**Local development.** Access headers are absent locally. If a dev stand-in is
needed, gate it behind an explicit env flag that defaults to off and refuses to
run when the environment is production. Never ship a code path that skips
validation based on a header the client can set.

**Local checks.** Tests for the validator: valid token accepted; wrong `aud`,
wrong `iss`, expired, bad signature, missing header all rejected. Typecheck and
build.

**Smoke test after deploy.** An unauthenticated request to the protected hostname
is redirected to the Access login; a request that bypasses Access (direct
`workers.dev` or origin URL) returns 401 or 403 from the app; a signed-in user
reaches the app and the app sees the expected email.

**Next action (needs approval).** Create the Access application and policy in the
dashboard, then copy the team domain and AUD tag into env.

## Other providers

Examples: Clerk, Supabase Auth, Auth.js, a custom OIDC provider.

1. Ask which provider if not already known.
2. Find its current setup steps and package names in its docs. If docs are not
   reachable, do not guess field names.
3. If the format is unknown, report the generic packet (what is protected, env
   names, session check location, smoke test) and mark provider config as "not
   prepared".
4. Apply the same remote-action rules as above.

Supabase Auth is the natural pick when the project already uses Supabase and
wants row-level security tied to the signed-in user; Better Auth on a Supabase
Postgres database is also valid. Ask which, and do not mix both for the same
users.

## Common gotchas

- **Client-only checks.** Hiding a button is not authorization. Enforce on the
  server.
- **IDOR.** Every read or write of user-owned data checks that the resource
  belongs to the current user.
- **401 vs 403.** 401 means not signed in; 403 means signed in but not allowed.
- **Secrets in the client bundle.** Only public values use the framework's public
  env prefix.
- **Preview environments.** Each preview origin needs to be trusted and, for
  OAuth, registered; do not widen to a wildcard to make it work.

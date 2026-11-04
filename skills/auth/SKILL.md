---
name: auth
description: Choose and prepare authentication for Better Auth, Cloudflare Access, or another provider, and verify local readiness (config, env names, session or JWT validation, protected-route checks) without touching remote accounts. Use for /auth, login, sessions, Better Auth setup, Cloudflare Access, Zero Trust, or protecting admin routes.
disable-model-invocation: true
---

# auth - authentication readiness for any provider

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /context      ->  [auth]  ->  /feature, /implement  ->  /release
    (stack known)  (choose,     (build login-gated        (deploy prep)
                    prepare)     features)

`/auth` is an optional setup step. It picks the auth approach, prepares local
config, and runs local checks. It is not an account-creation button: it stops
before any external provider action unless the user gives an explicit yes in the
current chat.

## Targets

| Target | Typical fit | What lives locally |
| --- | --- | --- |
| **Better Auth** | public apps with their own users, email/password, OAuth, sessions in your database | `src/lib/auth.ts`, auth client, generated auth schema, handler route, env names |
| **Cloudflare Access** | internal tools, admin areas, staging sites, apps whose users already sign in through a company or Google/GitHub identity provider | JWT validation in the app, env names; the Access application and policies live in the Cloudflare dashboard (remote) |
| **Other** | Clerk, Supabase Auth, Auth.js, a custom OIDC provider | whatever that provider documents |

Provider details live in `reference/providers.md`. Read only the section for the
chosen target; do not copy its contents into this skill or the report.

## Input

Optional scope:

- no argument: choose by evidence (Step 2); ask if the evidence is missing or
  conflicting
- `better-auth`, `cloudflare-access`: prepare that provider
- `<name>`: any other provider, for example `/auth clerk`
- `check`: read-only auth readiness report
- `config`: focus on creating or updating local auth files

Scopes combine, for example `/auth better-auth config`.

If the user asks to create a provider account, an Access application or policy,
an OAuth client, set remote secrets, create real users, or run provider commands
that affect a remote, pause and ask for explicit confirmation first.

## Step 1 - read the project

Read:

- `AGENTS.md`
- `CONTEXT.md` (Features, Data, Stack, Deployment, and Usage model sections, plus the active spec in `.pawang/specs/` when a work item is active; found as described in `.agents/README.md`, Specs)
- `.pawang/conventions/auth.md` (when present)
- `package.json` and lockfile, framework config, `.env.example`
- existing auth code: `auth.ts`, `auth-client.ts`, middleware, session helpers,
  login routes, any JWT or header validation
- existing deploy config: `wrangler.jsonc`, `wrangler.toml`, `render.yaml`,
  `vercel.json`, `netlify.toml`
- the database setup (ORM, dialect, driver), because Better Auth stores users and
  sessions there

Never open files that hold secret values (`.env`, `.dev.vars`). Read
`.env.example` only.

Identify:

- who the users are: the public, a known team, or only the owner
- what must be protected: whole site, an admin area, API routes, or nothing yet
- whether the app needs its own user records (profiles, ownership, roles)
- where it runs, since that decides how the database binding is reached
- env vars by name only

## Step 2 - choose the provider and shape

Pick from evidence, in this order:

1. the user's argument or explicit statement
2. the Stack or Deployment section of `CONTEXT.md`
3. auth code or dependencies already in the repo
4. the app's shape, as a recommendation only

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

If steps 1-3 disagree or are all empty, ask which provider. Do not default to the
first row of the table. Never migrate an existing setup to another provider
unless the user asks.

Say plainly when the provider is a poor fit:

- Cloudflare Access for a public consumer sign-up flow: poor fit. Access gates who
  may reach the app; it does not give the public a sign-up experience or user
  records.
- Better Auth for a small internal tool where everyone already has a company
  identity: heavier than needed; Access may be enough.
- Both together are valid only when there is a real need, for example Access as
  the outer gate for `/admin` and Better Auth for customer accounts.

## Step 3 - verify local readiness

Run only local, non-destructive checks that match `AGENTS.md`:

- typecheck and build, plus tests when configured
- the provider's schema generation step when Better Auth is chosen (see the
  provider section), then confirm the database migration exists
- confirm each protected route rejects an anonymous request: 401 for APIs,
  redirect for pages, and 403 for an authenticated user without permission
- confirm authorization is checked on the server for every route that touches
  user data, not only hidden in the UI
- a provider CLI only for local, login-free steps

If a check needs secrets or a remote service, list the env var names needed and
skip it.

## Step 4 - prepare local config

Create or update local files only when the target is clear or the user asked for
config.

Provider config details change. When web search or provider docs are available,
confirm package names, CLI commands, header names, and field names before
writing. When they are not, say which parts come from memory.

For every provider:

- reuse the project's existing ORM, dialect, and route layout
- keep one server-side place that resolves "who is the current user"
- fail closed: a missing or invalid credential means no access
- add required env names to `.env.example`; never write secret values
- do not add a role system, multi-tenancy, or extra plugins without a current
  requirement
- add no new dependency without explicit approval (see `AGENTS.md`)

## Step 5 - report the auth packet

- **Provider** - and why
- **Protects** - what is gated and how anonymous requests are handled
- **Config changed** - files created or edited, or "none"
- **Checks run** - commands and result
- **Verified against docs** - yes, no, or partly (name what came from memory)
- **Env needed** - names only
- **Remote steps (need approval)** - accounts, policies, OAuth clients, secrets
- **Smoke test** - exact path or command to verify after deploy
- **Blockers** - anything to fix before shipping
- **Next action** - exact step, stopping before external action unless approved

## Rules

- Optional only. Do not add `/auth` to the mandatory build loop.
- Never create provider accounts, Access applications or policies, OAuth
  clients, remote secrets, or real user accounts without explicit approval in the
  current chat.
- Never write or print secret values.
- Never hand-roll sessions, password hashing, or JWT verification when the chosen
  provider supplies them. For Cloudflare Access, validate the token with a
  maintained library or the platform's documented method.
- Never trust a client-sent identity header without validating its signature.
- Do not weaken a failing check or hide a missing env var.
- Keep the change small. Auth setup should not become an identity platform.

## Formatting

Format the output to match the project's conventions in
`AGENTS.md#communication` (Output formatting): concise, scannable markdown, with
lists for enumerations and tables for matrices rather than dense paragraphs.

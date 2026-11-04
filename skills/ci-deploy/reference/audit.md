# Audit for `/ci-deploy audit workers`

A read-only check of a Cloudflare Workers repo against the Worker Previews model.
It reports; it never fixes. A fix is a separate scope (`preview workers`,
`deploy workers`), a `/release` config edit, or a `/data` remote action, each with
its own approval.

## Run the scanner

```
node <skill-dir>/scripts/audit.mjs "<project-path>"
```

Needs Node 18 or newer, no packages. Add `--json` for machine-readable output.
Add `--remote` only after asking the user: it runs read-only `gh` and `wrangler`
commands (repo settings, rulesets, Actions secret names, resource lists). It
prints no secret values and never prints account details. If `gh` or `wrangler`
is missing or logged out, the finding is `UNKNOWN`: report it as "could not
check", never guess.

In a monorepo the script lists every Worker config it finds. Run it from the
repo root for the whole picture and say which Worker each finding belongs to.
`wrangler.toml` is not parsed (no TOML parser); the script marks it `UNKNOWN`,
so read its `[previews]` tables by hand.

## What the script checks

| Area | Finding |
| --- | --- |
| wrangler | not a dependency; installed version (or spec lower bound) older than 4.136.3 |
| `previews` block | missing while resource bindings exist; each KV, D1, R2, Hyperdrive, Vectorize, Analytics Engine, Pipelines, Secrets Store binding missing from `previews` or pointing at the same resource as production |
| queues | producer missing in `previews` or on the production queue; consumers cannot target a Preview |
| other bindings | Containers not in `previews.containers`; service bindings and Workflows (shared with production); Durable Objects and Cron notes |
| D1 | no `wrangler.preview-migrations.*` beside the config |
| workflows | `pull_request_target`; `wrangler versions upload` or `--preview-alias`; Cloudflare credentials without a fork guard; unpinned actions; no `wrangler preview delete` cleanup when Previews are in use |
| migrations | a migration in the `build` script; migration SQL with DROP, RENAME, a type change, or NOT NULL added without a default |
| Verify | no `Verify` command documented in `AGENTS.md` (run `/ci` first) |
| remote (`--remote`) | head-branch auto-delete; no ruleset, or none requiring status checks; missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` secret when a workflow uses it; preview resource IDs absent from the account |

Levels: `FAIL` must fix, `WARN` should fix, `UNKNOWN` could not check, `INFO`
context. The script's `UNSAFE` verdict means a preview binding equals the
production resource. A binding missing from `previews` is a `FAIL`; call it
unsafe in the report only when the code reads that binding at runtime.

## What the script cannot see

Ask the user to confirm these (dashboard or CLI) and mark anything unconfirmed
`UNKNOWN`:

| Check | Expected |
| --- | --- |
| Git connection | repository connected, production branch is the default branch |
| Preview Builds | enabled under branch control |
| Worker created before Worker Previews | the one-time Worker Previews setup was completed *(confirm whether it can be undone)* |
| Preview command | `npx wrangler preview`, or `<pm> run db:migrate:preview && npx wrangler preview`; the older default `npx wrangler versions upload` is a blocker |
| Deploy command | `npx wrangler deploy`, or `<pm> run db:migrate:prod && npx wrangler deploy` |
| Build command | only the build; no migrations (it runs on every branch) |
| Build variables | set per trigger; the preview trigger never holds the production database URL |
| Build token | edit rights for Workers Scripts and for resources the migrations touch |
| Root directory | in a monorepo, one connection per Worker pointing at its folder |
| Preview naming | read the URL from one real pull request comment; the E2E and cleanup names must match it. Branch names with `/` may be transformed, so verify rather than assume |
| Cloudflare Access | for each Worker the user marked internal, Previews are protected; `curl -sI <preview-url>` without credentials is refused or redirected, not the app |
| Supabase and Hyperdrive | the Preview Hyperdrive config points at a separate project, never the production one |
| Containers | after a Preview is deleted, `bunx wrangler containers list` shows no leftover app named `<worker>_<preview>_...` |
| Rollback | migrations are backward compatible, and the user knows `bunx wrangler rollback` |

## Report

```
## CI/CD audit: <repo or worker name>
Verdict: READY / NEEDS WORK / UNSAFE   (UNSAFE = a preview can reach production data)

### Must fix (FAIL)
- <finding>: why it matters, in one sentence. Fix.
### Should fix (WARN)
### Could not check (UNKNOWN): what is needed to check it
### Looks good
```

Group by severity, one sentence of why per finding, and the fix with the scope
that owns it. Offer the matching scope; do not run it. State which checks came
from the script and which were confirmed by the user.

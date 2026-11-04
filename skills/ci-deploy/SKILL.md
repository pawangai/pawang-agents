---
name: ci-deploy
description: Write GitHub Actions workflows that deploy to production or create per-pull-request previews on Cloudflare (Workers or Pages), gated on Verify, add E2E on a Worker Preview, or audit a Workers repo's preview and CI/CD setup read-only. Use for /ci-deploy, deploy otomatis, preview per PR, audit CI/CD, or wrangler in GitHub Actions. Not for Verify or PR checks (/ci) or provider config (/release).
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# ci-deploy - deploy and preview workflows

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /release  ->  /ci  ->  [ci-deploy]  ->  user pushes and sets secrets
    (provider     (Verify   (workflow files)  (remote, separate approvals)
     config)       recipe)

This skill writes workflow files only. It never changes the remote ruleset, sets
GitHub secrets or environments, pushes, publishes, or deploys. A workflow written
here runs only after the user pushes it and sets its secrets, each a separate
approval.

## Input

A scope is always explicit. Deploy and preview are different workflows, and
Workers and Pages are different Cloudflare products with different commands,
config, tokens, and cleanup. Each scope names exactly one of each:

- `deploy workers`: production deploy of a Worker with `wrangler deploy`
- `preview workers`: per-pull-request Worker Previews with `wrangler preview`,
  and their cleanup on close
- `deploy pages`: production deploy of a Pages project with
  `wrangler pages deploy`
- `preview pages`: per-pull-request Pages preview deployments
- `deploy <host>` or `preview <host>`: any other host; see `reference/deploy.md`
- `e2e workers`: runs the project's documented end-to-end command against a Worker
  Preview, as one more pull-request check. It belongs to the preview scope: it adds
  a job to `preview.yml` or its own `e2e-preview.yml`, and never touches a deploy
  workflow
- `audit workers`: read-only audit of a Workers repo's preview isolation and CI/CD.
  It writes nothing; see "Scope: audit workers" below
- bare `deploy` or `preview`: pick Workers or Pages by evidence (Step 2), never
  both

Several scopes may be requested together, for example
`/ci-deploy deploy workers preview workers`. Each one is handled separately, with
its own workflow file and its own entry in the report. Never merge a deploy and a
preview, or Workers and Pages, into one workflow. With no scope, ask which one.

## Scope: audit workers

This scope skips Steps 1 to 4. It reports and never fixes.

1. Read `reference/audit.md`.
2. Run `node <skill-dir>/scripts/audit.mjs "<project-path>"`. Ask first
   (through `interview`) before adding `--remote`, which runs read-only `gh` and
   `wrangler` commands.
3. Do the checks the script cannot do, using the table in `reference/audit.md`, and
   mark anything unconfirmed `UNKNOWN`.
4. Report in the template from `reference/audit.md`, and name the scope that owns
   each fix (`preview workers`, `deploy workers`, `/release`, `/data`). Do not run it.

If Node is not available, say the script cannot run and do the config checks by
hand from `reference/deploy.md` ("Isolation: what a Preview shares").

## Step 1 - require a working Verify command

Read the `Verify` line under Commands in `AGENTS.md` and `.github/workflows/`.
If no Verify command is documented, stop and point to `/ci`; do not set it up
here. If one exists, run it once so the deploy gate is known to pass.

## Step 2 - find the product by evidence

In this order: the user's argument; the Deployment section of
`CONTEXT.md`; existing config. Workers evidence is `wrangler.jsonc` or
`wrangler.toml` with `main` or `assets`. Pages evidence is
`pages_build_output_dir`, a `functions/` folder, or a Pages Git integration. Also
check existing deploy workflows and `render.yaml`, `vercel.json`, `netlify.toml`.
If they conflict or are empty, ask. Never migrate Pages to Workers, or the
reverse, and never mix the two in one workflow.

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

## Step 3 - write the workflows

Read `reference/deploy.md`, only the sections for the chosen scopes. Then:

1. **Find the action by the scope**, not by the product: `deploy` ships
   production; `preview` makes a per-pull-request environment. They use different
   commands (`wrangler deploy` and `wrangler preview` for Workers;
   `wrangler pages deploy` with the production branch or another branch for
   Pages) and different workflow files.
2. **Require the config.** A Workers scope needs an existing Wrangler config. A
   `preview workers` scope also needs a `previews` block and Wrangler 4.136.3 or
   newer. A Pages scope needs an existing Pages project and its production
   branch. If anything is missing, stop and point to `/release`; do not create it
   here, and do not raise the Wrangler version without approval.
3. **Choose the mechanism** (Cloudflare Git integration, GitHub Actions, or
   provider-native) using the table in `reference/deploy.md`. Do not add a
   workflow when a dashboard integration already deploys the same target without
   asking. For Workers Builds, check the dashboard items listed in
   `reference/deploy.md` (Preview command is `wrangler preview`, one-time Worker
   Previews setup on older Workers, migrations placement) and list them as user
   steps.
4. **Write the smallest set of workflows the user asked for**, one file per scope
   (`deploy.yml`, `preview.yml`, `pages-deploy.yml`, `pages-preview.yml`). Never
   overwrite an existing workflow; show the diff and ask.
5. **Gate on Verify** where a workflow runs the deploy or preview. A dashboard Git
   integration cannot be gated by Verify; say so and point to the ruleset. Apply
   the shared rules in the reference: fork guard, minimal permissions, pinned
   actions, locked Wrangler, concurrency, untrusted values through `env:`, and no
   delete of production resources.
6. **Surface unsafe previews.** A Workers `previews` binding that points at a
   production KV, D1, R2, queue, or index, a binding the code needs that
   `previews` lacks, or a Pages preview that binds production data is reported as
   a blocker, not silently wired up.
7. **For `e2e workers`,** read `reference/e2e.md` and follow its preconditions
   before writing anything. It decides the mechanism, the check name, and the
   remote steps. Never write a test or change the test harness.
8. **List the remote steps for the user** without doing them: create the API
   token with the right permission for the product (Edit Cloudflare Workers, or
   Cloudflare Pages Edit), add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
   as GitHub secrets, optionally create a protected `production` environment,
   create the Pages project if it does not exist, apply any remote migration for
   a preview database, set Preview runtime secrets
   (`wrangler preview base-config secret put`), set Workers Builds commands and
   per-trigger variables, and push. Offer the optional ruleset file (see
   `reference/ruleset.md`) when the mechanism is a Git integration, because only a
   ruleset can stop a red check from deploying. Write it only if the user says yes.

## Step 4 - prove locally

Run only the local proofs listed per scope in `reference/deploy.md`.
`wrangler preview` and `wrangler pages deploy` have no documented dry run, so
those scopes are "prepared locally" and the first GitHub run is the real proof.
Never run a command that deploys, creates a preview, or deletes anything. Do not
push the workflow. `e2e workers` has no local proof against a Preview: report it as
"prepared, not proven".

## Step 5 - report

For each scope:

- product (Workers or Pages), action (deploy or preview), mechanism, command
  used, workflow file, and what triggers it
- installed Wrangler version against the minimum
- token permission and secret names needed (names only)
- remote steps left for the user
- preview isolation status and limitations
- what was verified against docs and what came from memory, and the smoke test
- for `e2e workers`: mechanism, workflow file, the command and base-URL variable
  read from the harness, the check name to require, and the remote steps left
  (URL template variable, Access secrets)
- for `audit workers`: the report from `reference/audit.md`, with the checks the
  script made separated from the ones the user confirmed
- for Workers deploy: where migrations run and whether they are backward
  compatible, whether the mechanism can be gated by Verify, and the rollback
  command (`wrangler rollback`, code only, run by the user)

## Interaction with other skills

- `/ci` owns the Verify command and `verify.yml` that these workflows gate on, and
  explains the ruleset as the lock.
- `/tests browser` owns the `Browser tests` command and the harness that
  `e2e workers` runs; this skill never edits either.
- `/release` owns the provider config (`wrangler.jsonc` and similar) that a deploy
  workflow depends on. `/auth` and `/data` own Access and binding or migration
  details that previews and deploys must respect.

## Rules

- Never set GitHub secrets or environments, run a deploy, a rollback, create a
  preview, set a Preview secret, run a delete command, push, or change a remote
  ruleset; never put secret values in a workflow.
- Never overwrite an existing workflow silently.
- `audit workers` never writes and never runs a command that writes; `--remote` runs
  only read-only `gh` and `wrangler` commands, and only after the user agrees.
- Never apply a ruleset; at most write the local file and print the command.
- Never write a test for `e2e workers`, and never run it against a Preview whose
  bindings reach production data.
- Deploy and preview are separate workflows, and Workers and Pages are separate
  products. Never use a Pages command for a Worker or the reverse, and never put a
  deploy job and a preview job in one file.
- Never use `wrangler versions upload --preview-alias` as a pull-request preview.
  Workers pull-request previews use `wrangler preview`.
- A Pages preview workflow never passes the production branch to `--branch`.
- Never deploy production from a pull request, expose secrets to forked pull
  requests, or use `pull_request_target` to build pull-request code.
- Never delete the production Worker, Pages project, or production deployment
  from automation. A Preview may be deleted only by its own name or id.

## Formatting

Format the output to match the project's conventions in
`AGENTS.md#communication` (Output formatting): concise, scannable markdown, with
lists for enumerations and tables for matrices rather than dense paragraphs.

# Deploy and preview workflows for /ci-deploy

## Daftar isi

- [Four separate scopes](#four-separate-scopes)
- [Choose the mechanism first](#choose-the-mechanism-first)
- [Shared rules for every Cloudflare workflow](#shared-rules-for-every-cloudflare-workflow)
- [Workers: deploy](#workers-deploy)
- [Workers: migrations and rollback](#workers-migrations-and-rollback)
- [Workers: preview](#workers-preview)
- [Pages: deploy](#pages-deploy)
- [Pages: preview](#pages-preview)
- [Other hosts](#other-hosts)
- [Proof without deploying](#proof-without-deploying)
- [Smoke test after deploy](#smoke-test-after-deploy)

Read only the sections for the chosen scope. Everything here was checked against
the Cloudflare docs and the `cloudflare/wrangler-action` README in October 2026.
Items marked *(confirm)* were not verified: check them against current docs or
real command output before relying on them. Wrangler flags and output shapes
below were also checked against `wrangler --help` and the bundled source of
Wrangler 4.151.1; re-check them against the project's pinned version. The YAML is explanatory only. Never
copy it without detecting the project: real branch, package manager, runtime
version, Verify command, build output directory, Worker or project name, and
installed Wrangler version.

Commands use Bun (`bunx wrangler`, so the locked Wrangler version runs, not a
fresh download). With another package manager use its equivalent.

Writing a workflow file deploys nothing. It runs only after the user pushes it,
and it can authenticate only after the user sets the secrets in GitHub. Both are
remote actions that need explicit approval in the current chat.

## Four separate scopes

Deploy and preview are different workflows. Workers and Pages are different
Cloudflare products. Never merge them into one workflow, one job, or one set of
assumptions.

| Scope | Cloudflare product | Command | What it creates |
| --- | --- | --- | --- |
| `deploy workers` | Workers | `wrangler deploy` | The production Worker |
| `preview workers` | Workers | `wrangler preview --name <n>` | A Preview under the same Worker, with its own `previews` settings |
| `deploy pages` | Pages | `wrangler pages deploy <dir> --project-name <p> --branch <production branch>` | The production deployment of a Pages project |
| `preview pages` | Pages | `wrangler pages deploy <dir> --project-name <p> --branch <other branch>` | A Pages preview deployment with a branch alias URL |

What differs between Workers and Pages:

| | Workers | Pages |
| --- | --- | --- |
| Config | `wrangler.jsonc` with `main` or `assets`, optional `previews` block | `pages_build_output_dir`, or a project made in the dashboard |
| Deploy unit | Worker code and assets | a directory of prebuilt static assets (plus Functions) |
| Preview model | named Previews under the same Worker, per-Preview settings | one deployment per branch, alias URL per branch |
| API token template | Edit Cloudflare Workers | Account, Cloudflare Pages, Edit |
| Secrets command | `wrangler secret put` | `wrangler pages secret put` |
| Delete a preview | `wrangler preview delete --name <n>` | `wrangler pages deployment delete <id> --project-name <p>` |

Rules that follow from this:

- One workflow file per scope: `deploy.yml` and `preview.yml` for Workers,
  `pages-deploy.yml` and `pages-preview.yml` for Pages.
- Never use a Pages command for a Worker or the reverse.
- Never add a Pages workflow to a repo on Workers, or the reverse, unless the
  user asks. Never migrate between them from `/ci-deploy`.

## Choose the mechanism first

| Mechanism | Where it lives | Pick when |
| --- | --- | --- |
| **Cloudflare Git integration** (Workers Builds, or Pages Git integration) | Cloudflare dashboard, no workflow | the user wants the simplest setup and does not need Verify to gate the deploy |
| **GitHub Actions + Wrangler** | `.github/workflows/` | the deploy or preview must wait for Verify, or the user wants control over triggers |
| **Provider-native Git deploys** (Render, Vercel, Netlify) | that provider's dashboard | usually no workflow is needed; do not add one unless asked |

Notes:

- Workers Builds can also create Previews: enable Preview Builds and confirm the
  Preview command is `npx wrangler preview`. For GitHub and GitLab repositories
  it comments the Preview URL on the pull request.
- Workers Builds checks, all dashboard steps for the user: (a) the command run
  for non-production branches must be `wrangler preview`. The older default for
  that slot is `npx wrangler versions upload`, which makes a Version URL that
  reaches production resources; report it as a blocker. (b) A Worker that already
  used Workers Builds before Worker Previews needs the one-time Worker Previews
  setup (new Workers have it by default); configure the `previews` block first,
  because Previews do not use production settings. Whether that setup can be
  undone is *(confirm)*. (c) Workers Builds uses the Wrangler version in
  `package.json`.
- A dashboard Git integration cannot be gated by Verify. It builds on every push,
  independent of GitHub Actions, so a production deploy on the default branch can
  start while Verify is red. The real gate is a GitHub ruleset that requires the
  Verify check before merge (the user's remote choice); a failure after merge is
  handled with a rollback (see "Workers: migrations and rollback"). Say this in
  the report whenever the chosen mechanism is the Git integration.
- If the repo already deploys through one mechanism, keep it.
- Running both mechanisms for the same Worker or project double-deploys. If the
  dashboard integration is connected, ask before adding a workflow.
- A Workers workflow needs a Wrangler config. If none exists, stop and point to
  `/release cloudflare config`; do not invent one here.

## Shared rules for every Cloudflare workflow

- **Gate on Verify.** The deploy or preview job runs only after the exact
  `Verify` command passes (a separate job with `needs`, or the same job running
  Verify first).
- **Triggers.** Deploy: push to the detected default branch. Preview:
  `pull_request` with types `opened`, `synchronize`, `reopened`, and `closed`
  where the scope has cleanup. Never deploy production from a pull request.
- **Fork safety.** Repository secrets are not available to forked pull requests
  by default. Guard every job that uses Cloudflare credentials with
  `github.event.pull_request.head.repo.full_name == github.repository`. Never use
  `pull_request_target` to check out and build pull-request code.
- **Permissions.** Workflow-level `permissions: contents: read`. Add
  `pull-requests: write` only for jobs that comment, and `deployments: write`
  only when GitHub Deployments are used (`gitHubToken` on `wrangler-action`).
- **Secrets, names only.** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Never
  write values. Scope the token to the one account with the least permission that
  works: Edit Cloudflare Workers for Workers scopes (a Preview also needs access
  to the resources it binds), Cloudflare Pages Edit for Pages scopes. Creating the
  token and storing it in GitHub are remote steps for the user.
- **Pin versions.** Pin each action to an exact release tag or full commit SHA
  looked up when writing. Pin Wrangler through the locked devDependency; when
  `wranglerVersion` is omitted and Wrangler is already installed, the action uses
  the installed one. Never `latest`.
- **Concurrency.** Production deploys: one group, `cancel-in-progress: false`, so
  a deploy is never cut off halfway. Previews: group per pull request number,
  `cancel-in-progress: true`.
- **Untrusted values.** Pass pull-request values (number, branch name) through
  `env:` and quote them in shell. Never interpolate `github.head_ref` straight
  into a `run:` or `command:` string.
- **Production approval.** Recommend a GitHub environment (for example
  `production`) with required reviewers as the human gate. Creating it is a
  remote repository setting: offer it, do not change it.
- **No production deletes** from automation: no `wrangler delete`, no
  `wrangler pages project delete`, no deletion of the production deployment.

## Workers: deploy

`wrangler deploy` ships the current code and static assets to the production
Worker. Token template: Edit Cloudflare Workers.

```yaml
name: Deploy
on:
  push:
    branches: [main]          # detected default branch
concurrency:
  group: deploy-production
  cancel-in-progress: false
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: production   # optional human gate
    steps:
      - uses: actions/checkout@v6        # pin to an exact tag or SHA
      - uses: oven-sh/setup-bun@v2       # pin to an exact tag or SHA
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - run: bun run verify              # the exact Verify command
      - uses: cloudflare/wrangler-action@v4   # pin to an exact tag or SHA
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          packageManager: bun
          command: deploy
```

Notes:

- With no `command`, the action runs `deploy`. Write `command: deploy` anyway so
  the workflow states what it does.
- Dashboard-edited variables are overwritten by a deploy unless `--keep-vars` is
  used (config key `keep_vars`). It keeps `plain_text` and `json` bindings only.
  Secrets are never deleted by a deploy (stated in `wrangler deploy --help`).
- Run migrations before the new code serves traffic. Remote migrations are a
  separate step that needs a deliberate decision; see `/data`. Do not hide a
  remote migration inside the deploy job unless the user asked for it and the
  migration is backward compatible.
- Wrangler environments (`wrangler deploy --env <name>`) are persistent, separately
  named Workers such as `my-worker-staging`. They are not previews. Add one only
  when the user asks for a staging or dev Worker.

## Workers: migrations and rollback

Migrations with Workers Builds (Git integration):

- Workers Builds runs the build command on every push, then the deploy command on
  the production branch or the Preview command on other branches. A migration in
  the build command would therefore run for Previews too. Put migrations only in
  the deploy command and the Preview command, joined with `&&` so a failed
  migration stops the deploy and production keeps the previous code:

  | Where | Command (`<pm>` = detected package manager) |
  | --- | --- |
  | Deploy command | `<pm> run db:migrate:prod && npx wrangler deploy` |
  | Preview command | `<pm> run db:migrate:preview && npx wrangler preview` |

  A custom Preview command must still invoke `npx wrangler preview`.
- Build variables and secrets are set per trigger in the dashboard. The
  production trigger holds the production database URL and the Preview trigger
  holds the Preview one, never the production URL *(confirm per-trigger scoping
  in the current dashboard)*. These are dashboard steps for the user; `/ci-deploy` never
  reads or writes the values. Remote migration commands are decided with `/data`.
- With the GitHub Actions mechanism, a remote migration is still a separate,
  deliberate step (see the Workers deploy notes), never hidden in the deploy job.

Migrations must be backward compatible (expand, deploy, contract):

- Expand: add columns or tables as nullable or with defaults; do not rename or
  drop in the same release. Contract (drop the old shape) in a later release.
- Report, do not edit, any migration with DROP, RENAME, NOT NULL without a
  default, or a type change, and suggest splitting it.
- All Previews share the Preview database when the `previews` block points at one
  resource. Two open pull requests that both add migrations can conflict; warn
  when you see that.

Rollback:

- `bunx wrangler rollback` returns production to a previous Worker version. It
  reverts code only: connected resources and their data (D1, KV, R2, a database
  schema) are not rolled back. This is why migrations must be backward
  compatible.
- `/ci-deploy` never runs a rollback and no workflow here rolls back automatically.
  State the command in the report so the user knows it, and recommend fixing
  forward on a new branch through the normal pull request flow afterwards.
- Pages: the Pages API has a deployment rollback endpoint; `/ci-deploy` does not call it.

## Workers: preview

`wrangler preview` creates or updates a Preview under the same Worker. It is not
`wrangler deploy`: a Preview does not replace production, and it uses the
`previews` block of the Wrangler config, not the top-level settings.

Requirements, checked before writing the workflow:

- Wrangler 4.136.3 or newer. The Previews docs state 4.135.0; the
  `wrangler-action` README states 4.136.3. Use the higher. Read the installed
  version from the lockfile or `bunx wrangler --version`. If it is older, report a
  blocker: raising the version is a dependency change that needs approval.
- A `previews` block in the Wrangler config. It may be empty when the Preview
  needs no separate settings. Config ownership stays with `/release`; if the block
  is missing, stop and point there.
- Settings added in the dashboard must also exist in the config file.

### Workflow

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  preview:
    if: >-
      github.event.action != 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6        # pin
      - uses: oven-sh/setup-bun@v2       # pin
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - run: bun run verify              # the exact Verify command
      - id: preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          set -o pipefail
          output="$(bunx wrangler preview --name "pr-$PR_NUMBER" --json)"
          printf '%s\n' "$output"
          preview_url="$(printf '%s' "$output" | jq -er '.preview_urls[0] // .preview.urls[0]')"
          echo "preview_url=$preview_url" >> "$GITHUB_OUTPUT"
      - name: Probe Preview
        env:
          PREVIEW_URL: ${{ steps.preview.outputs.preview_url }}
        run: curl --fail --show-error --silent "$PREVIEW_URL/<health path>"
      - name: Comment Preview URL
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PREVIEW_URL: ${{ steps.preview.outputs.preview_url }}
        run: gh pr comment "$PR_NUMBER" --body "Preview: $PREVIEW_URL" --edit-last --create-if-none
  cleanup:
    if: >-
      github.event.action == 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6        # pin
      - uses: oven-sh/setup-bun@v2       # pin
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: bunx wrangler preview delete --name "pr-$PR_NUMBER" --skip-confirmation
```

Notes:

- `--json` output carries the URL at `.preview_urls[0]` or `.preview.urls[0]`;
  the Previews examples page reads both, so the workflow does too. If neither
  exists the step fails: a Preview has no URL until Preview URLs are enabled on
  workers.dev or a custom domain, and Wrangler prints how to enable them.
- `wrangler preview` also applies the dashboard "Previews Base" settings unless
  `--ignore-base-config` is passed. A setting that exists only in the dashboard
  is a gap to report; settings must also live in the `previews` block.
- In GitHub Actions, `wrangler preview` attaches the pull request number, URL, and
  title to the Preview as annotations on its own.
- The Preview name defaults to the current Git branch. Naming it `pr-<number>`
  keeps the name stable per pull request and safe to pass to `delete`.
- Preview names are scoped to a Worker. In a monorepo each Worker can have a
  Preview with the same name; run the command from each Worker's directory.
- Under a Wrangler environment, put the settings in `env.<name>.previews` and pass
  the same `--env <name>` to every create, update, and delete command. Omitting it
  targets the top-level Worker.
- Each Preview has a Preview URL (always the latest deployment) and a Unique
  Deployment URL per deployment. Preview URLs are public by default; custom domain
  Preview URLs can be restricted with Cloudflare Access (see `/auth`).
- Limits: 100 deployments per Preview; at the Preview limit the least recently
  deployed Preview is deleted. Deleting on pull request close is housekeeping, not
  the only cleanup.

### Alternative: wrangler-action

`cloudflare/wrangler-action@v4` with `command: preview --name pr-<number>`
exposes the outputs `preview-url`, `preview-deployment-url`, `preview-name`,
`preview-id`, and `preview-deployment-id`, sets `deployment-url` to the stable
Preview URL, and can create a GitHub Deployment and job summary. That needs
`deployments: write` and `gitHubToken: ${{ secrets.GITHUB_TOKEN }}`. Use it when
the user wants GitHub Deployments; otherwise the direct command above is simpler.

### Runtime secrets for a Preview

Preview runtime secrets live in Cloudflare, not in the workflow:

- `bunx wrangler preview base-config secret put <NAME>` sets a secret that
  Previews created afterwards receive.
- `bunx wrangler preview secret put <NAME> --name <preview>` sets it for one
  Preview.
- Values must be Preview-safe (test keys, the Preview database), never production
  values. `wrangler secret put` is a production deployment and is not used for
  Previews.
- These are remote steps for the user. Never pass a secret value on a command
  line, in a workflow, or through `--secrets-file`; Wrangler prompts for it.

### Isolation: what a Preview shares

Top-level settings define production; the `previews` block defines Preview
settings. A binding the code uses but the `previews` block does not declare does
not exist in the Preview, and the Worker can fail with error 1101. Report that as
a gap.

| Resource | Behavior in a Preview |
| --- | --- |
| Durable Objects, Containers | A new namespace or app per Preview, automatic |
| KV, D1, R2, Queue producers, Vectorize, Hyperdrive, Analytics Engine, Pipelines, Secrets Store | Bound by id or name. Two Previews with the same id share data, and a Preview bound to the production id writes to production |
| Workflows | Bind an existing Workflow; no Preview-specific Workflow is created |

Blockers to report, never wire silently:

- A `previews` binding that points at the same KV id, D1 `database_id`, R2
  `bucket_name`, queue name, or index as production.
- A binding the code needs that the `previews` block lacks.

A shared non-production staging resource across Previews is acceptable only when
the user decides it.

Limitations to state in the report:

- Service bindings from a Preview call the bound Worker's production deployment.
- Queue consumers cannot target a Preview. A Preview can produce messages, and a
  production consumer can receive them.
- Cron Triggers and routes target production. Previews do not take over zone
  routes or production custom domains.
- Containers: Preview support is partial. A leftover container app can remain
  after a Preview is deleted. Check with `bunx wrangler containers list`, and
  delete only apps whose name starts with `<worker>_<preview>_`; never match by
  Worker name alone.

D1 and Drizzle: a Preview bound to a separate D1 database needs migrations applied
to that database, which is a remote action (`wrangler d1 migrations apply <binding>
--remote --config <preview migrations config>`). The docs use a separate
`wrangler.preview-migrations.jsonc` that declares the same physical database.
Do not put this in the workflow unless the user asks; see `/data`.

### Not for pull requests: Version URLs

`wrangler versions upload` creates a Version URL: one uploaded version that runs
with production resources. It belongs to the `versions upload` and
`versions deploy` workflow (inspecting one version before production or a gradual
deployment). It does not create branch-isolated resources, and
`--preview-alias` is not a pull-request preview. Use `wrangler preview` for
branches and pull requests. Write a `versions upload` workflow only when the user
explicitly asks for gradual deployments.

## Pages: deploy

`wrangler pages deploy` uploads a directory of prebuilt assets to a Pages
project. Use it only for repos already on Pages (see the release skill's provider
notes); a new project uses Workers with static assets. Token permission: Account,
Cloudflare Pages, Edit.

The deployment is production only when `--branch` equals the production branch
configured on the Pages project. The project is created in the dashboard or with
`wrangler pages project create <name> --production-branch <branch>`, which is a
remote step for the user. If the production branch is unknown, ask.

```yaml
name: Pages deploy
on:
  push:
    branches: [main]          # detected default branch, same as the Pages production branch
concurrency:
  group: pages-deploy-production
  cancel-in-progress: false
permissions:
  contents: read
  deployments: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6        # pin
      - uses: oven-sh/setup-bun@v2       # pin
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - run: bun run verify              # the exact Verify command
      - run: bun run build               # the real build; confirm the output dir exists after it
      - uses: cloudflare/wrangler-action@v4   # pin
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          packageManager: bun
          command: pages deploy <build output dir> --project-name=<project> --branch=<production branch>
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

Notes:

- `gitHubToken` lets the action create a GitHub Deployment on your behalf. The
  automatic token carries `contents: read` and `deployments: write` here.
- The action sets `deployment-url`, and `pages-deployment-alias-url` for the
  branch alias.
- The output directory must exist after the real build; do not assume `dist/`.
- `cloudflare/pages-action` is deprecated. Use `wrangler-action`.
- Pages secrets and variables use `wrangler pages secret put` (remote, for the
  user), not `wrangler secret put`.

## Pages: preview

A Pages preview is a deployment to any branch that is not the production branch.
It gets its own URL and a branch alias URL. There is no Worker `previews` block
and no `wrangler preview`.

```yaml
name: Pages preview
on:
  pull_request:
    types: [opened, synchronize, reopened]
concurrency:
  group: pages-preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
permissions:
  contents: read
  deployments: write
  pull-requests: write
jobs:
  preview:
    if: >-
      github.event.pull_request.head.repo.full_name == github.repository &&
      github.head_ref != '<production branch>'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6        # pin
      - uses: oven-sh/setup-bun@v2       # pin
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - run: bun run verify              # the exact Verify command
      - run: bun run build               # the real build
      - id: branch
        env:
          HEAD_REF: ${{ github.head_ref }}
        run: |
          printf '%s' "$HEAD_REF" | grep -Eq '^[A-Za-z0-9._/-]+$' || { echo "unsafe branch name"; exit 1; }
          echo "name=$HEAD_REF" >> "$GITHUB_OUTPUT"
      - id: deploy
        uses: cloudflare/wrangler-action@v4   # pin
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          packageManager: bun
          command: pages deploy <build output dir> --project-name=<project> --branch=${{ steps.branch.outputs.name }}
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
      - name: Comment Preview URL
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PREVIEW_URL: ${{ steps.deploy.outputs.pages-deployment-alias-url }}
        run: gh pr comment "$PR_NUMBER" --body "Preview: $PREVIEW_URL" --edit-last --create-if-none
```

Notes:

- The `head_ref != <production branch>` guard and the explicit `--branch` stop a
  pull-request workflow from ever deploying to production. Pass `--branch`
  explicitly: without it Wrangler runs `git rev-parse --abbrev-ref HEAD`, and a
  `pull_request` event checks out the merge commit detached, so that prints
  `HEAD`, not the branch.
- Preview deployments are public by default and send `X-Robots-Tag: noindex`.
  Cloudflare Access can protect them (see `/auth`).
- A Pages project keeps separate preview and production configuration
  (variables and bindings). A preview that binds the production D1, KV, or R2
  resource writes to production data. Report that as a blocker. Preview bindings
  are set per environment in the project's dashboard Settings > Bindings, or in
  the Wrangler config under `[env.preview]`. Menu labels differ between docs
  versions, so name the section, not a click path.
- With `pages_build_output_dir` in the Wrangler config, `wrangler pages deploy`
  applies that file's configuration to the deployment. The top level covers local
  and production; `env.preview` overrides it for preview deployments. Do not add
  `pages_build_output_dir` to a project whose dashboard settings are the source
  of truth without the user's decision.
- Preview deployments are not deleted when the pull request closes, and they do
  not need to be for correctness. Cleanup is optional. Offer it only after
  checking the real output of `bunx wrangler pages deployment list --project-name
  <p> --environment preview --json`. Each row has `Id`, `Environment`, `Branch`,
  `Source` (short SHA), `Deployment`, `Status`, `Build`; filter on `Branch`.
  Wrangler requests only one page of the API (which supports `page` and
  `per_page`), so older deployments can be missing from the list. Then
  `bunx wrangler pages deployment delete <id> --project-name <p>`; `--force` is
  needed when a deployment has an active alias, and the latest deployment of a
  branch cannot be deleted. Never delete the production
  deployment or the project from automation.

## Other hosts

Render, Vercel, and Netlify normally deploy and preview from their own Git
integration, including preview cleanup on pull request close, so no workflow is
needed. Offer a workflow only when the user wants Verify to gate it or the
provider's integration cannot be used, and then follow that provider's documented
CLI. If the format is unknown, report the generic packet (trigger, Verify gate,
secret names, deploy command, smoke test) and mark the workflow as "not prepared".

## Proof without deploying

Only local checks:

| Scope | Local proof |
| --- | --- |
| all | parse each new workflow as YAML; run `actionlint` only if already installed; the exact Verify command |
| `deploy workers` | the project's own build check (`wrangler deploy --dry-run` in the default stack, already part of Verify) |
| `preview workers` | installed Wrangler is 4.136.3 or newer; the `previews` block exists; `wrangler preview` has no dry-run flag (checked in `--help`); report the Preview as prepared, not proven. The first GitHub run is the proof |
| `deploy pages`, `preview pages` | the real build runs and the output directory exists. `wrangler pages deploy` has no dry-run flag (docs and `--help`), so the first GitHub run is the proof |

Never run `wrangler deploy`, `wrangler preview`, `wrangler pages deploy`,
`wrangler versions upload` without `--dry-run`, `wrangler rollback`,
`wrangler preview secret put`, or any delete command during setup. Those change
a remote.

## Smoke test after deploy

- **Workers deploy:** `GET /` returns 200; one inner route returns 200; an unknown
  path returns the 404 page.
- **Workers preview:** the URL from the pull request comment loads and shows the
  pull request's change; the probe step passed. After the pull request closes, the
  cleanup job logs success and the Preview URL stops serving after deletion
  propagates.
- **Pages deploy:** the `pages.dev` URL and any custom domain load the new build.
- **Pages preview:** the branch alias URL in the comment loads and shows the
  pull request's change; the production URL is unchanged.

# E2E on a Preview for `/ci-deploy e2e workers`

## Daftar isi

- [Preconditions](#preconditions)
- [Pick the mechanism](#pick-the-mechanism)
- [Mechanism A: Preview made by GitHub Actions](#mechanism-a-preview-made-by-github-actions)
- [Mechanism B: Preview made by Workers Builds](#mechanism-b-preview-made-by-workers-builds)
- [Cloudflare Access](#cloudflare-access)
- [Proof and report](#proof-and-report)

Runs the project's own end-to-end command against a Preview URL, as one more
check on the pull request. It writes a workflow file only. It never writes a
test, never changes the test harness, and never sets secrets or variables.

## Preconditions

All must hold. If one fails, stop and say which.

1. **The user asked for this scope.** Browser tests are not part of Verify or any
   workflow by default (`/tests browser` owns that rule); naming `e2e workers`
   is the explicit request.
2. **A documented command.** `AGENTS.md` declares `Browser tests: <command>`. If
   it does not, point to `/tests browser`. If the project is API-only and has no
   browser surface, say so: the Preview probe step in `preview workers` is the
   only check this skill can add.
3. **The command can target an external URL.** Read the harness config for how it
   takes a base URL (for Playwright, `use.baseURL`, usually read from an
   environment variable) and use the project's own variable name. If the harness
   always starts its own local server and has no override, stop and point to
   `/tests browser` to normalize it. Do not edit the harness here.
4. **A working Preview.** `preview workers` already exists or is requested in the
   same run, and the `previews` block isolates every binding (run the audit scope
   if unsure). E2E against a Preview that reaches production data is a blocker.

## Pick the mechanism

| Who creates the Preview | Use |
| --- | --- |
| a `preview.yml` workflow from `preview workers` (GitHub Actions) | Mechanism A: add an `e2e` job to that file |
| Workers Builds (Preview Builds in the dashboard) | Mechanism B: a separate `e2e-preview.yml` that waits for the Workers Builds check |

If both exist for the same Worker, Previews are created twice: ask which one to
keep before adding anything.

## Mechanism A: Preview made by GitHub Actions

The URL is already known inside the workflow, so no waiting and no URL template.
Edit the existing `preview.yml` (show the diff, never overwrite silently):
expose the URL as a job output and add a job that needs it.

```yaml
jobs:
  preview:
    outputs:
      preview_url: ${{ steps.preview.outputs.preview_url }}
    # ...existing steps unchanged...
  e2e:
    needs: preview
    if: >-
      github.event.action != 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v6        # pin to an exact tag or SHA
      - uses: oven-sh/setup-bun@v2       # pin to an exact tag or SHA
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - name: Run E2E against the Preview
        env:
          <PROJECT_BASE_URL_VARIABLE>: ${{ needs.preview.outputs.preview_url }}
        run: <the exact Browser tests command>
```

The job name (`e2e`, or its `name:`) is the status check name the ruleset
requires. Keep it stable.

## Mechanism B: Preview made by Workers Builds

Workers Builds does not wait for GitHub Actions and Actions does not wait for
Workers Builds, so the E2E workflow waits for the check run Workers Builds posts
(`Workers Builds: <worker>` *(confirm the exact name on a real pull request)*)
and then tests the Preview URL.

The Preview name defaults to the Git branch, and the workers.dev URL has the
shape `<preview-name>-<worker>.<subdomain>.workers.dev`. The subdomain is not in
the repo, so the user supplies a URL template as a repository variable after
reading the Preview URL in the first Workers Builds pull request comment
(remote step for the user, never run here):

```bash
gh variable set PREVIEW_URL_TEMPLATE_<WORKER> --body "https://{branch}-<worker>.<subdomain>.workers.dev"
```

`<WORKER>` is the Worker name in upper case with `-` replaced by `_`. Branch
names with `/` may be transformed in the URL *(confirm)*: if the first run shows
a mismatch, adjust the template or use simple branch names.

```yaml
name: E2E Preview <worker>
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  checks: read
concurrency:
  group: e2e-<worker>-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  e2e:
    name: "E2E (Preview: <worker>)"
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      REPO: ${{ github.repository }}
      HEAD_SHA: ${{ github.event.pull_request.head.sha }}
      BRANCH: ${{ github.event.pull_request.head.ref }}
      URL_TEMPLATE: ${{ vars.PREVIEW_URL_TEMPLATE_<WORKER> }}
    steps:
      - uses: actions/checkout@v6        # pin to an exact tag or SHA
      - name: Wait for Workers Builds
        run: |
          set -euo pipefail
          check="Workers Builds: <worker>"
          for i in $(seq 1 80); do
            state="$(gh api "repos/$REPO/commits/$HEAD_SHA/check-runs" \
              --jq ".check_runs[] | select(.name==\"$check\") | \"\(.status):\(.conclusion // \"\")\"" | head -n1)"
            echo "[$i] $check -> ${state:-not started}"
            case "$state" in
              completed:success) exit 0 ;;
              completed:*) echo "Workers Builds did not succeed: $state"; exit 1 ;;
            esac
            sleep 15
          done
          echo "Timed out waiting for $check"; exit 1
      - name: Resolve Preview URL
        id: url
        run: |
          set -euo pipefail
          [ -n "${URL_TEMPLATE:-}" ] || { echo "Set repository variable PREVIEW_URL_TEMPLATE_<WORKER>"; exit 1; }
          case "$BRANCH" in *[!A-Za-z0-9._-]*) echo "Unsupported branch name for a Preview URL"; exit 1 ;; esac
          echo "url=${URL_TEMPLATE//\{branch\}/$BRANCH}" >> "$GITHUB_OUTPUT"
      - name: Wait until the Preview answers
        env:
          PREVIEW_URL: ${{ steps.url.outputs.url }}
        run: |
          for i in $(seq 1 20); do
            code="$(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/<health path>" || true)"
            echo "[$i] HTTP $code"
            [ "$code" = "200" ] && exit 0
            sleep 6
          done
          exit 1
      - uses: oven-sh/setup-bun@v2       # pin to an exact tag or SHA
        with:
          bun-version: "<exact version>"
      - run: bun install --frozen-lockfile
      - name: Run E2E against the Preview
        env:
          <PROJECT_BASE_URL_VARIABLE>: ${{ steps.url.outputs.url }}
        run: <the exact Browser tests command>
```

Rules this file follows (the shared rules for every Cloudflare workflow apply too): the branch name
and URL reach shell only through `env:`; a branch name outside `A-Za-z0-9._-`
fails instead of being interpolated; the fork guard keeps secrets away from
forked pull requests; the job name is the required status check name.

## Cloudflare Access

Only for a Worker the user marked internal. Preview URLs are public by default;
if Access protects them, the E2E run needs a service token.

- The user creates the Access service token and stores `CF_ACCESS_CLIENT_ID` and
  `CF_ACCESS_CLIENT_SECRET` as GitHub secrets (remote steps; the user types the
  values, never the chat).
- Pass them to the test step through `env:` and send them as the request headers
  `CF-Access-Client-Id` and `CF-Access-Client-Secret`.
- The harness must send the same headers (for Playwright, `extraHTTPHeaders`).
  That is a harness change: point to `/tests browser`, do not edit it here.
- E2E test credentials are GitHub secrets holding Preview-safe values only, never
  production ones.

## Proof and report

There is no local proof for E2E against a Preview: parse the YAML, run the exact
Browser tests command's own local smoke if the project already has one, and
report the workflow as "prepared, not proven". The first real pull request is
the proof: the check waits correctly, the URL matches the Preview comment, and a
deliberately failing E2E blocks the merge when the ruleset requires it.

Report: mechanism (A or B), workflow file, the command and base-URL variable
read from the harness, the check name to require, remote steps left for the user
(URL template variable, Access secrets), and anything marked *(confirm)*.

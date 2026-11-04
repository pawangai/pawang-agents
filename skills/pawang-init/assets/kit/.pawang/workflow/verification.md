# Automatic verification

Automatic GitHub checks are a separate explicit setup. `/adopt` only reports
existing checks and points to `/ci` when none exist. Running `/ci` inspects the
real project and defines one `Verify` command from checks that already exist.
Use this order when available: typecheck, tests, then build. Never invent a test
runner or another check just to fill the command.

For JavaScript and TypeScript projects, prefer a package script such as `verify`
and use the detected package manager. For other stacks, use the native task
runner or exact combined command. Record the exact command under Commands in
`AGENTS.md`.

The optional `.github/workflows/verify.yml` must run that same command for pull
requests and pushes to the default branch. Preserve existing workflows, use the
project's real runtime and install command, and grant only `contents: read` by
default. This setup does not add coverage, browser tests, security scans, or
version matrices; those remain later project choices. A local pre-push hook that
runs the same `Verify` command is offered as an opt-in at the end of `/ci`, and
`git push --no-verify` still bypasses it, so the remote ruleset stays the lock.

GitHub branch protection or a ruleset can require the check after the repository
is pushed, but that is a separate remote setting. Missing automatic GitHub
checks do not make Pawang unusable.

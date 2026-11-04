---
name: sync
description: Detect and repair drift between AGENTS.md, CONTEXT.md, DESIGN.md, .pawang/conventions/, and the real code. Read-only detection first, then repairs AGENTS.md with approval and hands other files to their owner skill. Use for /sync, after dependency or tooling changes, or when a standard file feels stale.
disable-model-invocation: true
---

# sync - keep the standard files honest

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    any time  ->  [sync]  ->  drift report  ->  AGENTS.md fixed here,
                                                 other files handed to their owner

Agent-facing files go stale quietly: a script gets renamed, a dependency swapped, a token changed, and the file keeps telling agents the old story. This skill compares the files with each other and with the code.

**Reads:** `AGENTS.md`, `CONTEXT.md`, `.pawang/specs/*.md`, `DESIGN.md`, `.pawang/conventions/`, `git log`, manifests and lockfiles, tooling configs, style and theme files, `openapi.json`.

**Writes:** `AGENTS.md` only, and only after approval. Every other file belongs to its owner (see the `AGENTS.md` table); `sync` proposes the exact edit and names the skill to run. It never edits code, never commits, and never runs build, test, or deploy commands.

## Step 1 - detect (read-only)

Skip a check when its files do not exist and say so. Each finding records both sides and where each was read.

| # | Check | Side A | Side B |
|---|---|---|---|
| 1 | Commands | `AGENTS.md` Commands (dev, typecheck, build, lint, test, Verify, openapi) | scripts in `package.json`, `Makefile`, `pyproject.toml`, or equivalent |
| 2 | File index | `AGENTS.md` Project files table (it must list `.pawang/specs/`) | root files that exist; standard-named files not registered (for example `GAME-DESIGN.md`); registered files or folders that are missing |
| 3 | Stack | `CONTEXT.md` section 4 | dependencies, lockfile, framework and host config (`wrangler.jsonc`, ORM config, auth library) |
| 4 | Tokens | `DESIGN.md` front matter (colors, typography, rounded, spacing) | CSS variables, Tailwind or theme config; also run `npx -y @google/design.md lint DESIGN.md` when the network allows |
| 5 | Conventions | `.pawang/conventions/` claims (strict TS, linter, formatter, test runner, folder layout, naming) | `tsconfig`, lint and format configs, test setup, real directory layout |
| 6 | Features | `CONTEXT.md` `## Features` checkboxes | `Feature:` and `Rolled-back:` trailers in `git log --first-parent`: checked with no `Feature:` commit (except features already checked in the first commit that added `CONTEXT.md`, `git log --diff-filter=A --format=%H -- CONTEXT.md`: those shipped before Pawang, as `/adopt` records them), landed but unchecked (a feature whose latest trailer in the log is `Rolled-back:` is intentionally unchecked) |
| 7 | Spec state | `.pawang/specs/*.md` `**Status:**` and `**Branch:**` | current branch and merge state: a not-done spec whose branch is already merged into the default branch; a `done` spec whose feature is still unchecked in `CONTEXT.md` (unless its latest trailer in the log is `Rolled-back:`); a spec file for a feature that is unchecked after a rollback, which should have been deleted; a feature checked in `CONTEXT.md` whose spec is not `done`; more than one not-done spec in the checkout |
| 8 | AGENTS.md hygiene | `AGENTS.md` | length over 200 lines, references to paths that do not exist, rules duplicated in `.pawang/conventions/` |
| 9 | API contract | `CONTEXT.md` stack and `AGENTS.md` openapi command | `openapi.json` present, its script exists |
| 10 | Spec files | every `.pawang/specs/*.md` and every `Spec:` trailer in `git log --first-parent` | each spec file has `**Type:**`, `**Status:**`, and `**Branch:**` lines; each `Spec:` trailer names a file that exists; file names follow the naming in `.agents/README.md`, section "Specs" |

Do not guess which side is right. A mismatch between two product decisions (for example `CONTEXT.md` says Postgres, the code uses D1) is `needs-decision`, not a fix.

## Step 2 - report

Present one table, most important first, and nothing else until it is shown:

| ID | Severity | A says | B says | Owner | Proposed fix |
|---|---|---|---|---|---|

Severities: `contradiction` (the files disagree and an agent would act wrongly), `stale` (one side outdated), `missing` (a needed fact is absent), `hygiene`. Mark `needs-decision` where either side could be right. State the count by owner and, when there is no drift, say so in one line.

## Step 3 - repair

**`AGENTS.md` (owned here).** For findings where the code or file system is the clear truth (a script name, a missing or unregistered file row, a stale path), show the exact diff and ask for approval before writing. Apply only what was approved. If `AGENTS.md` is past 200 lines after the edit, point to the `agents-md` skill for a split instead of trimming rules yourself.

**Every other file.** Print the exact proposed edit and the owner to run:

| File | Hand off to |
|---|---|
| `CONTEXT.md` sections and `## Features` | `/context` |
| `DESIGN.md` | `/design` |
| `.pawang/conventions/` | the user (edit directly), or `/adopt` to regenerate from the code |
| Stale or inconsistent spec state | `/complete` for finished work, otherwise ask the user |
| Spec file missing its header lines, or a `Spec:` trailer pointing nowhere | the user (the spec is a finished record); `/fix` only if code is affected |
| Code (tokens not in code, missing script) | `/feature` or `/fix` |

For `needs-decision` items, ask through the `interview` skill, then route the answer to the owner. An interview "yes" is never approval to commit or change anything outside this skill's writes.

## Rules

- **Detect before touching.** No edit happens before the report is shown.
- **Code and file system are facts; prose is a claim.** But a product decision is never overwritten by what the code happens to do.
- **One owner per file.** Propose, never write, outside `AGENTS.md`.
- **Read-only on commands.** Detect by reading scripts, not by running them, except the `DESIGN.md` lint.
- **No new scope.** Fix drift; do not add rules or sections that were not already there.

## Formatting

Format the output to match the project's conventions in `AGENTS.md#communication`: concise, scannable markdown, with lists for enumerations and tables for matrices rather than dense paragraphs.

---
name: status
description: Show read-only feature-checklist progress, active steps, git state, drift warnings, and the next action. Use for /status, what is in progress, what comes next, or resuming after a break or context clear.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# status - where the project stands right now

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    any time  ->  [status]  ->  reads CONTEXT.md + .pawang/specs + git
                  (read-only)   prints a short "you are here"

This skill answers one question: _where am I?_ It reads the files that already
track progress and prints a short orientation. It is the fast way back in after a
break, a context clear, or a day away. It never changes anything: no edits, no
commits, no installs, no builds, no branch changes.

Progress in this workflow lives in files, not the chat, so everything this skill
reports comes from disk and git. That is the point: a fresh session can run
`/status` and know exactly as much as the last one did.

## Input

None. `/status` takes no argument.

## What it reads

Gather these, then summarize. Don't dump file contents; report the distilled
state.

1. **Project configuration** - read `.agents/pawang.json` when present. Report
   `project settings`, `built-in defaults`, or `invalid, using defaults`. Run
   `node <skill-dir>/scripts/permissions.mjs` when it exists and include
   its `Permissions:`, `Git:`, and `Client:` lines. A non-zero exit means a
   declared value contradicts the client gate or a fixed rule was loosened: add a
   `Watch:` line with the drift and point to `.pawang/workflow/config.md`. A
   missing file is healthy and means defaults. Invalid JSON, schema versions,
   keys, values, non-file paths, or symbolic links are a warning; tell the user to fix the file before any mutating workflow
   command. Report the effective audit, check, try-guide, and independent-review
   policies, plus the `git.commit`, `git.merge`, `git.push`, and
   `git.branchCleanup` values (each defaults to `ask`; `branchCleanup` also
   accepts `keep`). Audit and independent review default to `when-sensitive`,
   check defaults to `manual`, and try guide defaults to `when-testable`.
2. **Standard files** - presence and state of `CONTEXT.md`, `DESIGN.md`,
   and `.pawang/conventions/`. `CONTEXT.md` missing or still holding the
   template placeholders (`Feature one`, `description`, unchanged guidance text)
   means `/context` has not run. `DESIGN.md` missing while `CONTEXT.md` section 5
   describes a UI means `/design` is pending. Report each as `ready`, `template`,
   `missing`, or `not needed`.
3. **Feature checklist** - `CONTEXT.md` `## Features`. Count checked vs unchecked
   leaf items. Name the next unchecked leaf, the same target `/feature` would
   pick, and note if a parent item was split into sub-items (`4a`, `4b`, ...).
4. **Current work** - the active spec in `.pawang/specs/` (the one whose `**Status:**`
   is not `done`; see `.agents/README.md`, section "Specs"). Is something in
   progress, or is there no active spec? If a feature, fix, or rollback spec is
   present, report its file, type, name, Status, which build steps are checked, and
   the first unchecked step where `/implement` resumes. More than one not-done
   spec in the checkout is drift: list them and say which one matches the branch.
5. **Findings** - the active spec's `## Findings`. Count findings by
   status and report open and fixed counts next to checklist progress. Call out
   any P0 or P1 still `open` or `fixed` by ID, since those block `/complete`. No
   `## Findings` section means no findings. Also list unresolved findings left in
   finished specs (`grep -E '^### F-[0-9]+ \[P[0-3]\] (open|fixed|unverified)' .pawang/specs/*.md`)
   by `<spec-stem>#F-NN`, with severity. Also report the active spec's `## Review`
   block when present: verdict, mode, and whether it is stale (recompute the
   reviewed tree hash with the command in `/audit`'s independent-review section);
   a `changes-requested` or stale verdict blocks `/complete` when the gate applies.
6. **Git** - current branch, whether the working tree is clean or has uncommitted
   changes, roughly how many files changed, last commit subject, and whether the
   branch is ahead of its remote. If the directory is not a git repo, say so and
   skip this part rather than failing.
7. **Progress drift** - resolve the default branch as in item 6 (`git symbolic-ref refs/remotes/origin/HEAD`, or the branch the remote tracks) instead of assuming `main`, then flag an active spec on that branch, a spec in progress but no
   branch matching the configured feature, fix, or rollback prefix, all spec steps checked but
   not completed, a checked feature in `## Features` that has no
   `Feature:` trailer commit in `git log` (unless it was already checked in the first commit that added `CONTEXT.md`: it shipped before Pawang), a not-done spec for a feature that is already checked, or
   a `Feature:` work commit on the default branch whose feature is still unchecked (unless the latest trailer for that feature is `Rolled-back:`). With
   `git.landing: "pull-request"`, an active feature may differ from the next
   unchecked item because parallel branches can be active.

8. **Run log** - when `.agents/runlog/` exists, read only the newest
   `YYYY-MM-DD.jsonl`. Report the number of tool calls, the span from the first
   to the last timestamp, the three tools with the largest summed duration, and
   the number of `bash` calls. The log stores no arguments and no prompts, so the
   `bash` count is a proxy for commands run, not for approval prompts. A missing
   folder means no run has been recorded; never create it from Status.

When the working tree or branch looks like an interrupted `/complete` (work
commit present but `## Features` unchecked, or the feature checked but its
spec file not marked `done`), route to `/complete` to resume from git evidence;
do not write anything from Status.

## Output

A short, scannable summary, not a wall of text. Aim for something like:

    Status: Building feature 4 - PDF export
    Config: Project settings.
    Gates: audit when-sensitive, check manual, try guide when-testable.
    Permissions: edit allow; secrets deny (fixed); network ask; install ask; deploy ask.
    Git: commit ask, merge ask, push ask, cleanup auto.
    Client: opencode push ask; build bash ask; explorer and reviewer deny.
    Files: CONTEXT.md ready, DESIGN.md ready, .pawang/conventions/ ready.
    Plan: 3 of 9 features complete.
    Current work: Step 2 of 3 done. Next step: Download PDF button.
    Findings: 1 open P2 (F-04), 1 fixed P1 awaiting re-review (F-02).
    Git: branch feature/pdf-export, 3 uncommitted files, last commit "feat: widen export helper".
    Run log: 42 tool calls, 18m span, slowest bash 4m12s, 6 bash calls.
    Watch: F-02 is fixed but not re-reviewed; it blocks /complete until /audit closes it.

    Next action: run /implement for Step 3.

End with a single suggested next action, chosen in this order:

- The project configuration is invalid -> fix `.agents/pawang.json`.
- An interrupted completion (see above) -> `/complete` to resume from git evidence.
- `CONTEXT.md` is missing or still the template and no feature is in progress ->
  `/context` (or `/adopt` when the codebase already exists).
- `CONTEXT.md` describes a UI and `DESIGN.md` is missing or still the template, and
  no feature is in progress -> `/design`.
- A spec is in progress with unchecked steps -> `/implement` and name the step.
- A spec is in progress and all implementation steps are checked -> `/check` if
  proof is not recorded, `/check guide` if the user wants a manual review path,
  `/implement` when a P0 or P1 finding is still `open` (the repair is an extra
  reviewed step), `/audit` when one is `fixed` and awaiting re-review (both
  block `/complete`), otherwise `/complete`.
- There is no active spec and a P0 or P1 finding is `open` in a finished spec ->
  `/fix <spec-stem>#F-NN`; when one is `fixed`, `/audit` to re-review and close it.
- There is no active spec and unchecked features remain ->
  `/feature` and name the next feature.
- All features are checked -> say the current milestone is complete; suggest
  hardening, release, or docs when appropriate, `/sync` to refresh the standard
  files, or `/feature "new capability"` to propose an addition to the feature
  list. Do not suggest creating a second feature list.

If something is off, include a `Watch:` line before the next action. Catching
drift is half the value of the command.

## Rules

- **Read-only, always.** This skill never writes a file, never commits, never runs
  installs, never runs builds or tests, and never switches branches. If the user
  wants to act on what it reports, they run the relevant skill next.
- **Prefer exact next actions.** Do not end with vague advice like "continue the
  workflow". Name the command and, when useful, the file or step.
- **Distill, don't dump.** Report the state in a few lines. Do not paste file
  contents back unless the user asks for them.
- **Be honest about gaps.** If a file is missing or the repo is not initialized,
  say that plainly instead of guessing.

## Formatting

Format the output to match the project's conventions in
`AGENTS.md#communication`: concise, scannable markdown, with lists for
enumerations and tables for matrices rather than dense paragraphs.

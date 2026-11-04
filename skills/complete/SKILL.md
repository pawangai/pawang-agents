---
name: complete
description: Complete a finished feature, fix, or rollback by running final gates, checking it off in CONTEXT.md, creating the work commit with a spec summary and trailer, and requesting approval to land it locally or by pull request. Use for /complete or requests to finish, wrap up, merge, or close the current work item.
disable-model-invocation: true
---

# complete - log the finished work, make the work commit, and land it

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /feature or /fix  ->  /implement  ->  [complete]  ->  next
    (the spec)             (build it)      (commit + land + log)

`/implement` built the feature or fix on its branch, with optional per-step commit
checkpoints. This skill closes it out: it logs the work, makes the single
work-level commit, then follows `git.landing`. The default `local-merge` path
squash-merges locally. The optional `pull-request` path pushes the work branch
and opens a pull request for a later squash merge. Run it only when the work is
done, reviewed, and the documented `Verify` command, or the fallback build and
tests, passes.

## Before you start

Read `.agents/pawang.json`. A missing file means the built-in defaults apply.
If the file exists but is invalid, stop and ask the user to fix it.
Configuration can strengthen or shape the completion gates, but it never grants
permission to commit, merge, push, deploy, publish, or take destructive action.
Record `git.landing` (default `local-merge`), `git.commit`, `git.merge`,
`git.push` (each default `ask`), and `git.branchCleanup` (default `ask`; `auto`
deletes a merged branch, `keep` never does). `auto` means run the command without the extra
chat question; the client permission prompt and the deny rules still apply.

Find the active spec in `.pawang/specs/` (`.agents/README.md` Specs). If there is
one, continue below. If there is none, check for interrupted completion before
stopping (see [Resuming](#resuming)); a finished spec never authorizes selecting
new work.

Confirm the work is actually finished: the active spec exists, its steps are
built on a branch, and `Verify`, or the
fallback build and tests, passes. Apply the configured regular quality gates
below before logging or committing. Uncommitted step work is expected because
per-step checkpoints are optional; this skill commits it. Don't require the steps
to be pre-committed.

## Configured regular quality gates

Use `qualityGates.regular` for this work item:

- **Audit:** `manual` runs only when the user explicitly requests `/audit`;
  `when-sensitive` runs for authentication, authorization, payments, secrets,
  personal or user data, migrations, destructive operations, external side
  effects, security boundaries, or unusually broad changes; `always` runs for
  every work item.
- **Independent review (`qualityGates.regular.independentReview`):** `manual` runs
  only when the user explicitly requests `/audit independent`; `when-sensitive`
  requires it for the same sensitive categories as Audit; `always` requires it for
  every work item. It includes a full current audit, so it satisfies a selected
  Audit gate instead of repeating it in the builder session.
- **Check:** `manual` runs only when explicitly requested; `when-behavioral` runs
  when a done-when needs observed runtime behavior such as a click, request, CLI
  command, download, background job, or multi-screen flow; `always` runs for
  every work item.
- **Try guide (`qualityGates.regular.tryGuide`):** use `/check guide`.
  `manual` runs only when explicitly requested;
  `when-user-facing` generates a guide when the change affects UI, navigation,
  copy, a public API or CLI, output, or another workflow a person directly uses;
  `when-testable` generates `## Try it now` when guide mode finds a safe,
  meaningful direct observation for UI, CLI, library, API, file-generation,
  configuration, or data behavior, and skips without fabricating one otherwise;
  `always` generates one for every work item.

Apply automatic gates in this order: `/check`, `/audit independent` when selected
(otherwise `/audit current` when Audit is selected), then `/check guide`. Reuse adequate evidence produced during the current work item
instead of repeating it. A required gate that cannot run is a blocker.
`/check guide` only generates instructions for human review; never claim the user
performed them. P0 and P1 finding blockers remain enforced regardless of these
settings.

## Step 0 - final safety pass

Before logging or committing, run a short safety pass and report blockers only:

- active spec exists and the work is not being completed from `main` or `master`
- the branch name uses the configured feature, fix, or rollback prefix
- changed files are tied to the active spec, with no unrelated dirty work mixed
  in (edits to the active spec file are expected)
- the exact `Verify` command from `AGENTS.md` passed in this session, when one is
  declared; otherwise the build passed, and tests passed when the project has a
  declared test command and the change touched logic
- any check required by `qualityGates.regular` has evidence, and testable work
  has a clear manual try path while non-testable work has a recorded skip reason
- with `verification.logicTests: always` (the kit default; the other accepted
  value is `when-configured`), logic changes have a configured runner and
  passing focused tests; otherwise completion is blocked and `/tests` is the
  next setup step
- with `verification.uiEvidence: always`, UI done-whens have direct browser
  evidence, including screenshots and relevant console and network checks
- UI work that changed tokens or visual rules has a matching, linted `DESIGN.md`
  (`/design`); this skill never edits `DESIGN.md` itself
- any audit or try guide required by `qualityGates.regular` ran before completion
- a selected or previously started independent review has a `## Review` block in
  the active spec with verdict `passed` that is still fresh: recompute
  `Reviewed tree` with the command in `/audit`'s independent-review section and
  require it to equal the recorded value. A `changes-requested`, stale, or
  malformed block blocks completion, even when the configured policy is `manual`,
  because the user already started that gate. Never reset or waive it on the
  user's behalf.
- no P0 or P1 finding in the active spec's `## Findings` is `open` or `fixed`.
  `fixed` still blocks on purpose: the repair exists but no review has looked at
  it - run `/audit` to close it. While the current spec is active, append the
  repair as a new checklist step and run `/implement`; do not start a separate
  `/fix`. After the repair passes its focused check and the finding is marked
  `fixed`, run `/audit current` to re-review the updated code, close the finding,
  and then retry `/complete`. The only waivers are `accepted` (the user's
  explicit decision in the current chat, reason recorded; never set it for
  them) or `invalid` (an `/audit` re-examination verdict with recorded
  evidence, or the user's explicit call). An empty `## Findings`
  section means no findings.

Do not claim "passed", "verified", or "working" without naming the command,
route, screenshot, or output that proves it. Stop before Step 1 if required
evidence is missing.

After this safety pass succeeds, set the active spec's `**Status:**` to
`verified`. Rerun the required final checks because `/complete` owns the final
safety pass.

## Step 1 - log the work

Check whether the spec is a feature, a fix, or a rollback. A fix is marked
`**Type:** Fix` and has no feature number. A rollback is marked `**Type:** Rollback`
and names its target feature, commit, and parent. A feature carries the number from
`**From features:**`.

Make all of these edits in the working tree; nothing is committed yet:

- **Feature** - check the feature off in `CONTEXT.md` `## Features` (and its parent
  item once all sub-items are checked).
- **Fix** - a fix is not a feature, so there is nothing to check off.
- **Rollback** - the feature no longer exists, so remove what described it:
  uncheck the exact target feature in `CONTEXT.md` `## Features` (and its parent
  item when applicable), without adding a note to the line, and delete the target
  feature's spec with `git rm .pawang/specs/<target>.md` (the `**Target spec:**`
  path). Its text stays in git at the build commit, which the rollback spec
  records. Keep the rollback spec itself: it is the record of why and what was
  removed. Keep the feature number stable; whether the feature is permanently
  abandoned is a separate decision for `/context`. If the spec lists "Review
  separately" hunks for `DESIGN.md` or `.pawang/conventions/`, tell the user which skill
  or person must update them; this skill never edits those files.

**Findings stay in the spec.** Resolved findings (`closed`, `accepted`, `invalid`)
keep their final status and reason in `## Findings`; nothing is removed or copied
into the commit. Entries that are `open`, `fixed`, or `unverified` also stay, with
their IDs, so they are never silently dropped; a fixed P2/P3 finding does not
block completion but must remain verbatim for a later `/audit` re-review. They
stay listable across all specs (`.agents/README.md` Specs).

**Close the spec.** In the active spec file set `**Status:** done` and add
`**Completed:** <UTC date>`. From here the file is the permanent record of the
work and is immutable, except for the status of its findings. For a feature, name
the file `<id>-<kebab-title>.md` as `/feature` did; never rename a spec that
already landed.

History is `git log` plus these files: the work commit in Step 2 is short and
carries the trailers that `/rollback`, `/sync`, and `/context` use to find landed
work and its spec.

Before committing, read `CONTEXT.md` and the spec file back and confirm that the
checkbox, the status, and the completion date match what you intended. Do not
touch any other part of `CONTEXT.md`.

## Step 2 - make the work commit

Show the complete product and logging diff with the proposed commit message.
With `git.commit: "ask"`, wait for approval. With `git.commit: "auto"`, state
that you are committing and continue. Then stage the reviewed branch work (any
uncommitted step work plus the Step 1 logging changes) and make one conventional
work commit (for example `feat: <feature>`, `fix: <name>`, or `revert: roll back <feature>`).
`Verify`, or the fallback build and tests, must pass first.

The full record is the spec file, so the message stays short: the subject, a
`Goal:` line, then the trailers. Wrap at 72 characters, in the project's language:

    <type>(<scope>): <subject>

    Goal: <one line>

    Feature: <id>
    Spec: .pawang/specs/<file>.md

Trailers, one per line, nothing after them: `Feature: <id>` for a feature (the
number from `**From features:**`, letter included), `Fix: <kebab-slug>` for a fix
(the spec file name without `fix-` and `.md`), or `Rolled-back: <id>` plus
`Reverts: <target commit SHA>` for a rollback; always `Spec:` with the spec path.
With `git.landing: "pull-request"`, put the same `Goal:` line and trailers in the
pull request description so the squash merge keeps them, and confirm the
default-branch commit contains them after the merge.

## Step 3 - land the work

Follow only the configured path.

### Local merge

With `git.landing: "local-merge"`:

1. Confirm the local default branch has not advanced and the final work commit is
   unchanged. With `git.merge: "ask"`, show the exact `git merge --squash`
   command and wait for the go-ahead. With `git.merge: "auto"`, run it after the
   checks. Either way, squash-merge so the work lands as one clean commit
   regardless of how many checkpoints the branch carried.
2. Verify the resulting default-branch commit, its parent, and that the merged
   tree contains the `CONTEXT.md` and spec file edits and the trailers. Then apply
   `git.branchCleanup`: with `auto`, delete the local work branch after
   `git diff --quiet <default> <branch>` confirms the trees match; with `ask`,
   ask first; with `keep`, leave it and say so. Never use `-D` on a branch with
   unmerged work, never delete the default branch, and never delete a remote
   branch.
3. With `git.push: "ask"`, ask whether to push the local default branch to its
   upstream; the merge approval does not count as push approval. With
   `git.push: "auto"`, state that you are pushing and continue.
4. Push only when the configured value or a fresh yes allows it. If the repo has
   no remote or upstream, say so instead of guessing.

### Pull request

With `git.landing: "pull-request"`:

1. Require a selected configured remote, a known remote default branch, and an
   available authenticated hosting CLI or API. Prefer the work branch's configured
   upstream remote; otherwise use the only unambiguous remote or ask the user to
   choose. Confirm the exact work commit and branch are unchanged. Do not fall
   back to a local merge or direct default-branch push when any prerequisite is
   missing.
2. Show the target remote and base branch, exact branch to push, proposed pull
   request title, and concise body. The body is the work commit's body: the
   `Goal:` line, then the trailers as the last lines, nothing after them. State
   that the pull request must use squash merge to keep one work item per
   default-branch commit, and that the squash message must keep that body:
   GitHub keeps it only when the repository setting "Default commit message" for
   squash merges is "Pull request title and description"; with any other setting
   the trailers are dropped and `/rollback` cannot find the commit. Tell the
   user to check that setting or to paste the body into the squash message.
3. The feature-branch push follows `git.push`: with `ask`, get a yes; with
   `auto`, state that you are pushing and continue. Pull request creation always
   needs its own explicit approval, because no configuration key approves it.
   After both, push that branch with upstream tracking and open the pull request
   against the confirmed default branch.
4. Verify that the pull request head is the exact final work commit and report its
   URL plus check status. Never merge the pull request, enable auto-merge, delete
   the remote branch, or push the default branch from this approval.
5. Stop with the work ready for provider review and squash merge. If `/complete`
   is resumed after the provider reports it merged, follow [Resuming](#resuming);
   verify the exact pull request and squash commit before reporting completion or
   applying `git.branchCleanup` to the local work branch. Verify the trailers on the default-branch
   commit with `git log --first-parent -1 --format=%B <squash sha>`. If any is
   missing, say so plainly: history is never rewritten here, so report the squash
   SHA and tell the user that `/rollback` will ask for it, and that `/sync`
   reports the gap. Offer to record nothing else.

Then point the user at `/feature`, `/fix`, or `/rollback` for the next thing.

Finish with the generated `## Try it now` section when one exists. For a rollback,
explain how to confirm the removed behavior is gone and name one unaffected
regression path. If there is no safe direct observation, omit the section and say
so plainly. For an optional
deeper walkthrough, point to `/check guide latest`.

## Resuming

Progress lives in git, so an interrupted completion is recovered from git state,
not from a saved record. Work out the phase before doing anything:

| Evidence                                                                                              | Phase                | Next                                                  |
| ----------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| Active spec is not `done`, no work commit on the branch                                               | Step 0 or 1 not done | Continue from Step 0                                  |
| Feature checked (rollback: unchecked and target spec deleted), spec `Status: done`, edits uncommitted | Step 1 done          | Go to Step 2                                          |
| Work commit exists on the branch, not merged                                                          | Step 2 done          | Go to Step 3 (local merge, or the open pull request)  |
| Work commit reachable from the default branch, feature checked, spec `Status: done`                   | Landed               | Apply `git.branchCleanup`, then the separate push question |

When the evidence is missing, contradictory, or ambiguous (for example the
feature is checked but the squash commit lacks its trailers or the spec file), stop and give concrete recovery steps instead of
guessing. Never duplicate a trailer or re-check an item. A finished spec
never authorizes picking new work.

## Rules

- The work item is the unit of history: one squashed feature, fix, or rollback commit on the
  default branch, even if the branch carried several checkpoint commits.
- Don't merge unfinished or failing work. The documented `Verify` command, or
  the fallback build and tests, must pass first.
- Never merge while a P0 or P1 finding is `open` or `fixed` in the ledger. The
  recorded ways past the gate without code are `accepted` (only by the user's
  explicit decision, with their reason) or `invalid` (only from re-examination
  evidence or the user's explicit call); both stay recorded in the spec's
  `## Findings`, never a silent drop.
- Merging and pushing are the user's calls. Local landing needs explicit merge
  approval, then separate default-branch push approval. Pull-request landing needs
  explicit branch-push and pull-request approval, and never includes merge approval.
- Never treat `/complete`, configuration, or "looks good" as permission to push,
  open a pull request, enable auto-merge, or merge.
- One item per completion. If a parent feature still has unchecked sub-features,
  leave the parent unchecked.
- Edit only the checkbox in `CONTEXT.md` and the active spec file for logging; a
  rollback also deletes the target feature's spec, and no other spec. `DESIGN.md`, `.pawang/conventions/`, and `AGENTS.md` have
  their own owners.

## Formatting

Format the output to match the project's conventions in `AGENTS.md`
(`#output-formatting`): concise, scannable markdown, with lists for
enumerations and tables for matrices rather than dense paragraphs.

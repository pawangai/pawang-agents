---
name: context
description: Create or normalize CONTEXT.md, the single source of truth for what to build. Fill placeholder sections through an interview, validate the numbered feature checklist, surface contradictions, and offer the initial baseline commit. Use for /context, a new project's spec, cleanup, or after material changes. Not for one feature (/feature), a bug (/fix), or prototype files (/plan).
disable-model-invocation: true
---

# context - make CONTEXT.md real, trackable, and consistent

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    idea / notes  ->  [context]  ->  CONTEXT.md  ->  /design (if UI)  ->  /feature  ->  build
    (yours)           (interview    (what to build,                 (one spec
                       + validate)   features checklist)             at a time)

`CONTEXT.md` is the one file that says what to build. You own its content; this skill never invents it. It fills what is empty by asking you, fixes tracking syntax in the feature checklist, and reports where the sections disagree with each other.

**Reads:** `CONTEXT.md`, `AGENTS.md` (Commands, proportional engineering), `.pawang/conventions/` and `DESIGN.md` only to spot contradictions, `git log` (`Feature:` trailers) for used feature IDs, `package.json` and the lockfile for stack facts (the kit calls no file "repo manifest").

**Writes:** `CONTEXT.md` sections 1-8, `## Features`, and `## Open questions` only. Never `DESIGN.md`, code, the spec files in `.pawang/specs/`, or any other file. The baseline commit in Step 5 is a git action, not an edit.

## Step 1 - read and classify

Read `CONTEXT.md` in full. Placeholder text means the template's own scaffolding: unchanged starter prompts, `Feature one` / `Feature two`, a trailing `- description`, `TODO`, `TBD`, or the example bullets left in place. Starter instructions are not content.

- **Create:** sections 1-8 are mostly placeholder. Fill them in Step 2.
- **Normalize:** real content exists. Keep every decision; go to Step 3.
- **Mixed:** fill only the placeholder sections, normalize the rest.

If `CONTEXT.md` is missing, create it from the shipped template shape (sections 1-8 and `## Features`; there is no `## Active work` section, workflow state lives in `.pawang/specs/`), then proceed as Create.

If the user supplies prototype files (`01-PRD.md` to `04-edge-cases.md`), stop and point to `/plan`, which maps them. If the code already exists and `CONTEXT.md` is empty, point to `/adopt`.

## Step 2 - fill placeholder sections (interview)

Every question goes through the `interview` skill: numbered, each with a recommended answer, in rounds. Skip what the user already said, and look up facts in the repo (stack, commands, host config) instead of asking. Never skip the interview because the idea "seems clear"; the decisions live in the user's head.

Branches to cover, only for empty sections: problem and success measure; users and roles; MVP cut (in and explicitly out: the in-scope part becomes `## Features`, the out-of-scope part goes to `## Open questions` or section 7 as an explicit non-requirement); data model (the stored models with fields, types, and relationships, derived from the features that use them; propose it from what the user said and let them correct it, never invent fields) and who owns it; stack with one line on what each technology is for, auth approach, each data store and its ORM (`/auth` and `/data` use these); UI/UX feel (one paragraph plus the main routes or screens, tokens go to `/design`); deployment target; usage model and constraints (only what the user states); monetization; the first real slice of features in build order, and which one is the headline feature.

A branch the user defers becomes `TBD: <what is unknown>`. Never turn a missing usage fact into an enterprise, hostile, multi-tenant, or single-user requirement. Write section bodies in the user's language, headings in English.

## Step 3 - validate shape

**Format a clear feature list automatically.** Invoking `/context` authorizes syntax-only formatting without an extra approval pause. Convert plain bullets, ordinary numbered lists, or clearly separated feature lines into tracked checkboxes: `- [ ] 1. **Name** - description`. A valid tracked checklist stays byte-for-byte unchanged.

Preserve wording, order, feature count, notes, headings, nesting, existing IDs, and completion markers (`[x]`, `[X]`). Add only missing tracking syntax:

- Preserve explicit identities, including lettered child IDs (`12a`).
- Give unnumbered features unused IDs. Check the checklist, the file names in `.pawang/specs/` (`<id>-<title>.md`), and `git log --first-parent --grep='^Feature: '` first; never renumber or reuse an ID.
- Keep child relationships and attached notes intact. Do not turn notes into features or flatten the hierarchy.
- Remove unchanged shipped starter guidance only. Preserve user notes.

Ask (via `interview`) before editing when structure, identities, scope, or build order are unclear, including duplicate IDs or ambiguous feature boundaries. Adding, removing, splitting, combining, reordering, or changing a feature's meaning needs a user decision; none is syntax-only formatting.

**Stub or missing feature list.** If `## Features` is empty or still the starter pair while other sections describe real work, propose a checklist derived from them and wait for approval before writing. If nothing supplies real features, ask for the list; never invent one. Do not report `CONTEXT.md` ready while the list is a stub, because `/feature` reads this list.

**Shape checks to report, not silently fix:**

- section 3 lists models without fields, types, or relationships, or a feature uses data that no model holds
- vague items, oversized bundles ("habits, streaks, summary, and deploy"), pre-build chores (scaffolding, prototyping) listed as features
- a feature that no section explains, or data in section 3 that no feature uses
- stack in section 4 that contradicts the repo manifest, `AGENTS.md` Commands, or `.pawang/conventions/`
- section 5 says "No UI" while a feature is a screen, or says UI while no `DESIGN.md` exists (suggest `/design`)
- a deployment-named host with no deployment-readiness feature, or sections 6 and 4 disagreeing on host
- `CONTEXT.md` over roughly 20 KB: name which section to split into a focused standard file registered in the `AGENTS.md` table, instead of letting it bloat

## Step 4 - save and report

Save the filled sections, the syntax-only formatting, and any approved reconciliation. Write every contradiction and every `TBD:` found into an `## Open questions` section at the end of `CONTEXT.md` (create it when needed, remove it when empty), so the next session sees them. Leave every file in `.pawang/specs/` unchanged. Report what you wrote or formatted, every `TBD:`, and every contradiction found, so the user can decide and re-run. Formatting authority does not change any Git or other approval gate.

## Step 5 - offer the initial baseline commit

Offer once, before Feature 1, to commit the approved setup so it stays out of the first feature commit. Never create it silently. It applies only when all of these hold:

- the project is a Git repository with an existing `HEAD` (never create a root commit; ask the user to make one first)
- the current branch is the default branch, or a dedicated setup branch whose start equals the default-branch tip
- `git log --grep='^chore: establish project baseline'` finds nothing on `HEAD`
- there is no active spec (no file in `.pawang/specs/` whose `**Status:**` is not `done`; see `.agents/README.md`, section "Specs") and no feature in `## Features` is checked
- the workflow files are meant to be committed: `git check-ignore` shows none of `.agents/`, `.opencode/` ignored by a local-only setup (an ignored `.agents/` skips the offer)

Before asking, record the default branch and its tip, then read `git status`, the staged and unstaged diffs, and untracked paths. The candidate is only workflow and plan setup: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`, `.pawang/rules.md`, `.pawang/README.md`, `.pawang/workflow.md`, `.pawang/workflow/`, `.pawang/decisions/README.md`, `opencode.json`, `.opencode/`, `.agents/`, plus `.gitignore` when every hunk is a setup entry. Kit files under `.pawang/` are usually untracked on a fresh install, so include untracked paths in the candidate, not only staged and dirty ones. Files in `.pawang/specs/` are never part of the baseline: a project that already has one is past setup, so skip the offer. If any staged or dirty path falls outside it, or an allowed file holds an unrelated hunk, stop and tell the user exactly what to commit, move, or restore; leave the repo unchanged. An empty candidate skips the offer.

Show the exact paths and diff, then ask `Finalize the project baseline locally? (Recommended)`. State that accepting makes one local commit (and on a setup branch, fast-forwards the unchanged default branch, switches to it, and deletes the setup branch), and that it never pushes. On acceptance, stage only the reviewed candidate, verify nothing else is staged, and commit with exactly:

    chore: establish project baseline

On a setup branch, re-verify the default tip is unchanged first; after the commit require a clean tree, then `git merge --ff-only <setup-branch>` and delete the branch locally. If the default moved or any check fails, stop without merging or deleting. If the user declines, leave the repo untouched. Then recommend `/design` when the project has a UI, otherwise `/feature`.

## Rules

- **Plans are user-owned.** Formatting changes tracking syntax only. Content changes and reconciliation need approval.
- **No new scope.** Every section traces to the user's answers or existing text. Invented scope is the main failure mode.
- **One checklist, one place.** The real feature list lives only under `## Features`; no other file duplicates it.
- **Surface conflicts.** Always end by reporting disagreements; silent reconciliation hides decisions.
- **One baseline.** Offer the commit once, after showing its exact scope; a rerun is never permission to commit.
- Follow the proportional-engineering contract in `AGENTS.md`.

## Formatting

Format the output to match the project's conventions in `AGENTS.md#communication`: concise, scannable markdown, with lists for enumerations and tables for matrices rather than dense paragraphs.

---
name: fix
description: Write an ad-hoc bug fix or small unplanned change as a spec file in .pawang/specs/, or for a finding ID from a spec's ledger, then stop before implementation. Use for /fix, a reported bug that is not a CONTEXT.md feature, or repairing a ledger finding between work items. Not for planned features (/feature) or diagnosis only (/debug).
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# fix - document an ad-hoc fix, then build it like anything else

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    /fix  ->  /implement  ->  /complete  ->  back to your features
    (spec     (build it,      (commit with
     the fix)  reviewed)       Fix: trailer + merge)

A fix is a bug or small change that isn't a planned `CONTEXT.md` feature. It runs
through the same loop as a feature (build with review gates, iterate, then merge);
it just starts here instead of `/feature`, and lands as one commit with a `Fix: <slug>` trailer.

## Input

A description of the bug or change, for example `/fix "password reset email never
sends"`. If the user just reported the problem in chat, use that. An `/incident`
route or a confirmed `/debug` verdict supplies the problem statement and cause.

The input may also be a finding reference from a spec's `## Findings` ledger,
alone or with a description, for example `/fix 04-export-csv#F-03` (spec stem,
`#`, finding ID). Pull the problem statement from that ledger entry. Use this form
only when there is no active spec: this skill writes a new spec, so while a spec is
active, repair its own findings through `/implement` instead. Never replace
another worker's active spec. Parallel work uses one clone or Git worktree per
work item, with a separate branch in each checkout.

## Step 1 - write the fix spec

Confirm there is no active spec (`.agents/README.md` Specs). Pull context from
the relevant `CONTEXT.md` sections and `.pawang/conventions/`, then write a short spec as a
new file `.pawang/specs/fix-<kebab-title>.md`, left uncommitted for `/implement` to
carry onto its branch. Its first heading must be exactly `# Fix: <title>`, and it
must retain the `**Type:** Fix` contract below. Use `##` for the section headings
and end with the empty `## Findings` and `## Review` stub sections from
`<skill-dir>/../feature/reference/feature-spec-template.md`. Keep it lighter than a
feature spec:

- **Title** - the bug or change in a few words.
- **Type:** Fix  (so `/complete` adds a `Fix: <slug>` trailer to the work commit and
  checks nothing off in `## Features`).
- **Status:** not started - `/implement` updates this durable workflow state as
  work and verification progress.
- **Branch:** the full fix branch from the configured prefix plus the fix title
  in lowercase kebab-case.
- **Fixes:** `<spec-stem>#<finding id>` - only when the fix targets a ledger
  finding. The stamp makes the repair traceable: `/implement` marks that finding
  `fixed` in its own spec
  when the repairing step lands, and `/audit` re-reviews it before it closes.
- **The problem** - what's wrong or what needs to change, and where.
- **The fix** - the root-cause repair, and anything it must not break. Do not add
  an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism unless the defect is in that layer or an
  established repository requirement needs it now. Adding a missing
  authorization, ownership, validation, escaping, or redaction check is a
  root-cause repair, not new machinery. Find every caller of the changed
  function or path and confirm the repair holds for each.
- **Build steps** - usually one small step; split only if the diff would be too
  big to read. Each ends with an observable "done when".
- **Verify** - how to confirm it's fixed (what to click or test).

Then stop. Tell the user to review the fix spec, then run `/implement` to build it.

## Rules

- A fix is not a `CONTEXT.md` feature; don't add it to `## Features`.
- Write only the new spec file in `.pawang/specs/`. Don't change `CONTEXT.md` or `DESIGN.md`;
  a fix that needs a design token change hands off to `/design`.
- Keep it small. If it's really a new feature, use `/feature` and `CONTEXT.md`
  instead.
- Removing a whole completed feature is `/rollback`, not a fix. A bug inside a
  live feature is a fix.
- Same conventions as everything else (`.pawang/conventions/`).

## Formatting

Format the output to match the project's conventions in `AGENTS.md`
(`#output-formatting`): concise, scannable markdown, with lists for
enumerations and tables for matrices rather than dense paragraphs.

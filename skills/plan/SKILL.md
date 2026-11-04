---
name: plan
description: Draft or revise the product sections and feature list of CONTEXT.md from an interview or from prototype files (01-PRD.md to 04-edge-cases.md), shown in full for approval before writing. Use for /plan, planning a new project, turning an idea or prototype/PRD files into a roadmap, or revising build order. Not for one feature (/feature), a bug (/fix), or validating an existing CONTEXT.md (/context).
disable-model-invocation: true
---

# plan - write the product plan into CONTEXT.md

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent or changed.

Where this sits in the workflow:

    idea / prototype files  ->  [this skill]  ->  CONTEXT.md  ->  /context (validate)  ->  /feature  ->  build

Reads: `CONTEXT.md`, `.pawang/assessments/<slug>.md` (when one exists), prototype files. Writes: `CONTEXT.md` sections 1-8 and `## Features` only. It never touches the spec files in `.pawang/specs/`.

`CONTEXT.md` is the single source of truth: problem, users, data, stack, UI/UX, deployment, constraints, and the numbered feature checklist. A vague line here becomes a wrong assumption later. The user owns the decisions; capture them faithfully and sharply, never invent them. This skill only writes the plan. It does not scaffold the app, write code, or commit.

## Where the content comes from

Two sources, which can be combined. Choose without asking when the situation is clear:

| Situation | Path |
| --- | --- |
| Nothing but an idea or a rough brief | **A. Interview** |
| prototype files attached, mentioned with a path, or found in the project (`01-PRD.md` ... `04-edge-cases.md`, often in a `prototype/` folder) | **B. prototype files**, then interview only the open decisions |
| A `pawang-capture-*` folder or zip, and no `01-PRD.md` to `04-edge-cases.md` | **C. Capture first**: the capture is evidence, not a plan. Point to the `plans-prototype` skill, which turns it into the four files, then continue with Path B |
| Both, or prototype files that leave big decisions open | **B**, with the interview filling gaps and settling conflicts |
| `.pawang/assessments/<slug>.md` with verdict `go` exists for this idea | **A**, seeded with its `Handoff ke /plan` section: confirm those answers in one interview round instead of asking them again |

If the user mentions prototype files that are not available, ask for them instead of guessing their content.

Capture output (`capture-report.md`, `kandidat-dokumen.md`, `design-tokens.md` or
`.json`, `pages.json`, screenshots) is raw evidence from a running product. It has
no requirement IDs and it mixes observed values with `[ASUMSI]`. Never map it
straight into `CONTEXT.md`. If only capture exists, do not guess the four files:
say what is missing and send the user to `plans-prototype` first.

If the app already has shipped features and no spec, use `/adopt` instead. If it is still unclear whether the idea is worth building, suggest `/assess` first. If the user only wants one new feature on a project that already has a spec, that is `/feature`, which proposes a reviewed addition to `## Features` itself.

## Workflow

1. **Check what exists.** Read `CONTEXT.md`. Unchanged starter text (the template's instructions, `Feature one` / `Feature two`, example bullets) counts as empty. Anything else means this is an update: follow "Updating an existing spec".
2. **Gather decisions** with the chosen path below. Every question goes through the `interview` skill: numbered, each with a recommended answer, in rounds.
3. **Draft the sections** and show them in full. Wait for an explicit approval of the draft. A "yes" in an interview round is not that approval, because this file steers all later work.
4. **Write to `CONTEXT.md`** after approval. Overwrite only the sections the user approved.
5. **Report and point to the next step:** `/context` validates the shape and offers the baseline commit, `/design` creates `DESIGN.md` when there is a UI, then `/feature` for the first unchecked item. Do not commit.

### Path A: interview

Run the `interview` skill. Do not skip it because the idea "seems clear": the plan depends on decisions that exist only in the user's head (who it is for, what is out of scope, what ships first), and guessing them produces a tidy plan that points the wrong way.

Branches the interview must cover:

- problem, who feels it, how success is measured
- users and roles
- MVP cut: features in, features explicitly out
- data: what is stored, who owns it
- tech: stack and constraints on it, auth approach, each data store and its ORM (`/auth` and `/data` use these choices)
- monetization
- UI/UX feel and platform, and where the design lives if one exists (prototype folder, prototype files, screenshots); the detail goes to `DESIGN.md` via `/design`
- downloads and exports: what the user can download, in which format, and whether the data may reach the browser (default: built in the browser, no backend)
- deployment target (host, bindings, env var names, cron or workers, health path, domain notes, whether Cloudflare Access gates a hostname)
- usage model and constraints: scale, local vs internet-facing, trusted vs adversarial users, tenancy, security or compliance requirements (only what the user states)
- build order: the first real slice and what depends on what

Look up facts yourself (existing repo, installed stack, files) so the user is only asked for decisions. Continue to drafting only after the user confirms the shared understanding. A branch the user defers becomes `TBD: <what is unknown>` in the spec.

### Path B: prototype files

Read `reference/from-prototype-files.md` first. It holds the section-by-section mapping, how to turn requirements into feature lines, and the rule that matters most: prototype files mix evidence with proposals, so facts carry over and proposals (`[ASUMSI]`, `[KEPUTUSAN DIBUTUHKAN]`, edge cases with basis `U`) are confirmed with the user before they become spec content. Confirm them through `interview`, with each open decision as a question and the prototype recommendation as the recommended answer. Skip what the files already settle. If nothing material is open, skip the interview and say so.

If the user's answer contradicts a prototype file, the user wins; mention the contradiction once. Downloads and exports follow the Path A default (built in the browser, no backend) unless the user chose otherwise.

## Sections 1-8

Use as much detail as the project needs. Keep rationale, constraints, examples, edge cases, tradeoffs, and explicit exclusions, since later feature work should not have to rediscover them. Keep the headings of `CONTEXT.md` exactly as the template has them, in this order (`/context` and other skills read them):

```
## 1. Problem
## 2. Users
## 3. Data model
## 4. Stack
## 5. UI/UX
## 6. Deployment
## 7. Usage model and constraints (optional)
## 8. Monetization (optional)
## Features
```

Section 7 records only established facts: expected scale, local vs internet-facing, trusted vs adversarial users, tenancy, required security or compliance constraints, and explicit non-requirements. If the user has not said, leave it empty. An unknown must never become an enterprise, hostile, multi-tenant, or single-user requirement, because that silently changes the architecture (see Proportional engineering in `AGENTS.md`).

Write section bodies in the user's language; keep headings in English.

## Features

One feature-sized outcome per line, in build order, in the tracked format:

```
## Features

- [ ] 1. **Habit list** - create, rename, and delete habits
- [ ] 2. **Daily check-in** - mark a habit done for today
```

Rules for good items:

- **Feature-sized.** A user-visible slice that can be specced and built on its own. Good: "Daily check-in - mark a habit done for today". Too small or technical: "Database", "Make it look nice". Too big: "Habits, streaks, summary, and deploy".
- **No pre-build steps.** Scaffolding the app and prototyping its look are not features. Start with the first real slice. Shared UI foundation (tokens, shell, base components) is not a pre-build step either: the first feature that needs it builds it, sized to that feature, unless users see it as a deliverable of its own (a navigation shell, a shared sign-in), which is a normal feature.
- **Deployment readiness** is the last item when section 6 names a deployment target.
- **Order by dependency and value.** Earlier items unblock later ones.
- **Traceable.** Every item maps to something in sections 1-6. Do not add features the spec does not motivate; if one is needed, say so and propose updating the relevant section too.
- When the source is prototype files, end the line with the IDs that point to the detail, for example `(FR-4, flow F3, EC-BK-01..04)`, so `/feature` can find it.

Do not pre-split large items into `4a`, `4b`; splitting happens when the item is specced.

## Updating an existing spec

- **Never replace `## Features`** once features have shipped. Keep completed items checked (`[x]`), keep their numbers (`Feature:` trailers in `git log` refer to them), and append new unchecked items at the end. Use milestone headings (`### MVP`, `### Post-MVP`) when the list grows; headings do not affect how the next unchecked item is found.
- Preserve existing wording, order, IDs, completion state, and attached notes unless the user asks to change them. Ask before changing the meaning or order of an item, merging or splitting items, or resolving duplicate IDs. Never reuse an ID from a `Feature:` trailer in `git log` or from the active spec.
- Edit sections 1-8 only when the change affects product direction, users, data, stack, UI/UX, deployment, or monetization. A new feature alone is just a new line in `## Features`.
- Bugs and small unplanned changes are not roadmap items; they belong to `/fix`.
- When the change affects the look and feel, tell the user to re-run `/design`; `/sync` flags the drift until they do.

## Final check before presenting the draft

- Headings present, in order; section 7 empty rather than guessed.
- Every feature line is feature-sized and numbered; new lines unchecked, existing lines unchanged.
- No contradiction between sections (stack, scope, deployment), and numbers match the source files.
- Every decision traces to an interview answer, a confirmed proposal, or a fact in the source files. Nothing marked as an assumption or proposal appears as a requirement.
- Gaps are marked `TBD:` instead of filled with plausible-sounding guesses.

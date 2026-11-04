---
name: feature
description: Turn the next, named, or numbered CONTEXT.md feature into a buildable spec file in .pawang/specs/, with small steps and done-when criteria. Use for /feature, planning a feature, or starting planned work.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# feature - create the active implementation spec

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

This skill plans one feature and stops before implementation. Its output is the
spec file `.pawang/specs/<id>-<kebab-title>.md` (see `.agents/README.md` Specs).

## Start

Read `.agents/pawang.json` only for settings that affect the spec. Invalid
configuration stops mutating work until the user fixes it.

Confirm there is no active spec (`.agents/README.md` Specs: no spec in
`.pawang/specs/` with a Status other than `done`). If there is one, stop and direct
the user to resume or complete it. Never
replace another worker's active spec. Parallel work uses one clone or Git
worktree per work item, with a separate branch in each checkout.

Resolve the target from the `## Features` checklist in `CONTEXT.md`:

- Use the requested number or name when it matches a checklist item.
- With no argument, use the first unchecked leaf item.
- Read only the matching checklist line, its parent, and nearby text needed to
  understand the hierarchy.
- If a plain list has no checkboxes, treat its first item as unchecked and offer
  to convert the plan after the spec review.

State the selected feature in one sentence.

## Build one authoritative feature packet

Gather the smallest packet that can answer what must be built:

1. Search `CONTEXT.md` for the feature number, title, and distinctive nouns from
   the target line. Read the matching feature line plus only the usage-model,
   data, stack, UI/UX, security, or deployment sections it directly depends on.
   Do not read the whole file by default. When the feature has screens, also
   read the relevant parts of `DESIGN.md`.
2. Inspect the repository once, starting from paths named by those passages.
   Follow only relevant imports, callers, tests, schemas, and configuration.
   Batch related searches and reads when supported.
3. Use the Commands section already loaded from `AGENTS.md`. Read it from disk
   only when it is absent or changed. Read only applicable sections of
   `.pawang/conventions/`.
4. Run the declared Verify command once when it exists. Record only observed
   results. Do not start a dev server.

Finish context gathering in at most four tool rounds after this skill starts:
target and `CONTEXT.md` matches, one batched repository inspection, applicable
standards only if needed, and Verify. Combine or skip rounds when possible. Do
not inspect other skill directories, the findings ledger, or templates beyond
the ones this skill names during normal planned-feature work. Do not create
scratch code or run implementation probes while writing a spec. Put a check in the
relevant build step when a repository detail cannot be confirmed from existing
evidence.

**Trace and design.** When the target line ends with prototype trace IDs, for example
`(FR-4, flow F3, EC-BK-01..04)`, read only those items from the prototype files
(`01-PRD.md` to `04-edge-cases.md`) at the path the plans name, else in `prototype/`:
search for the IDs instead of reading whole files. Take the FR row, the flow section,
the EC rows, and for UI the frames that flow maps to. Proposals (`[ASUMSI]`,
`[KEPUTUSAN DIBUTUHKAN]`, EC rows with basis `U`) are confirmed through `interview` in
one round, related proposals grouped so that "yes" accepts the recommendation, before
they become spec requirements; the unresolved ones go under `Open questions`.
If the files are gone, say so and ask. When the feature has user-visible screens, also
read `reference/ui-foundation.md` and follow it. Read it in the same batch as the
target lookup and the spec template, so it adds no tool round.

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

`CONTEXT.md` defines product intent. The repository defines current
reality. Do not invent presets, defaults, limits, permissions, money rules,
destructive behavior, stored fields, or API contracts. A familiar label is not a
complete contract when it has multiple reasonable meanings. Put unresolved
material choices under an `Open questions` heading and in the review handoff.
Stop without writing the spec when implementation cannot begin safely until one
is answered. Do not block on a reversible internal implementation detail with no
user-visible, security, persisted-data, or interoperability consequence. Choose
the simplest repository-native option, record it in the spec, and require a test
seam when the value is nondeterministic. Planned future persistence alone does
not make a current in-memory representation a product decision when no stored
data or external compatibility exists yet.

Apply proportional engineering before drafting: add an abstraction, dependency,
service, configuration surface, compatibility layer, or security mechanism only
when an established requirement needs it now. Prefer existing code, the standard
library, native platform features, and installed dependencies. Unknown scale or
future extensibility defaults to the smaller reversible design. Treat a trust or
data-integrity boundary as established when the repository exposes network or
untrusted input, auth/session/ownership, shared persisted data, destructive
operations, secrets, or sensitive data, even when `CONTEXT.md` does not name it.

If the target is too large for one reviewable branch, propose sub-features and
wait for approval before editing the user-owned `## Features` list. After
approval, add lettered checklist items under the parent and spec only the first
one.

## New feature not in `CONTEXT.md`

Do not silently add scope. Search for a duplicate, then propose one checkbox line
and its placement in `## Features`. Include an edit to sections 1-8 of `CONTEXT.md`
only when the request changes the product direction, users, data, stack,
monetization, UI/UX, or deployment. Wait for approval, update `CONTEXT.md` (use the
`context` skill when the list shape needs normalizing), and then resume this skill.
A UI/UX change that alters tokens or visual rules goes to `/design`. Bugs and
small unplanned changes belong in `/fix`.

## Write the final spec once

Draft and critique in context, then write the spec once as a new file
`.pawang/specs/<id>-<kebab-title>.md` (id zero-padded to two digits, letter kept). If a
spec for this id already exists, stop: the feature is built or in progress, and a
rolled-back feature's spec was deleted. Leave the new spec
uncommitted; `/implement` creates the branch that carries it. Touch nothing else
in `CONTEXT.md`. A later write is only
for a mechanical correction or user-requested revision. Record `**Branch:**`
with the full configured feature branch. The first heading and feature identity
must use this canonical form (the title is a `#` heading and its sections are `##`):

```markdown
# Feature: <title>

**Type:** Feature
**From features:** <id>
```

Then use these section headings (as `##`), shaped as in
`reference/feature-spec-template.md` (read it before writing):

- Goal
- Design reference, only for visual or replication work
- In scope
- Out of scope
- Build loop
- Build steps
- Files / areas
- Data / contracts
- Testing
- Notes for the AI
- Open questions, only when a product decision remains unresolved
- Findings and Review, kept as the empty stub sections from the template (`/audit` fills them)

Build steps are ordered checklist items. Each step must leave the project
working, stay small enough to review, and end with a concrete `Done when` that
names observable behavior and the relevant check. Follow `workflow.stepReview`
and `workflow.checkpointCommits` from config in the Build loop. `/complete`
creates the final feature commit.

The spec must preserve every explicit contract in the feature packet, including
applicable project-wide UX and security requirements. Do not discard a required
state because the current fixture cannot trigger it yet. Keep later features out,
define authorization and tenant boundaries only when the feature packet or
reachable code establishes them, identify client and server responsibilities,
and name exact files or areas supported by repository evidence.
Add focused tests for logic when a test command exists. Add browser coverage only
when a Browser tests command exists and it is proportionate. Do not claim live,
visual, persisted-data, or integration evidence that was not run.

Build the branch value from the configured feature prefix plus the feature title
in lowercase kebab-case. Replace each run of characters other than ASCII letters
and digits with one hyphen and trim edge hyphens. Check that the branch name is
not already taken by unrelated work; stop and ask rather than reusing it. The
only existing-ref case allowed is the pristine current branch of a pre-created
parallel worktree. Freeze the branch before review; `/implement` and `/complete`
reuse it rather than deriving it again.

For visual replication, require an existing screenshot or reference (a prototype
folder or prototype frames count). Store a provided image under
`<skill-dir>/../reference/assets/` and link it; reference a prototype folder or
prototype files by path and frame number.

## Critique gate

Before the single write, check these failure classes:

- Missing happy, loading, empty, invalid, denied, and unexpected-error behavior
  that applies to the feature.
- A product contract from the packet that was omitted, weakened, or contradicted.
- Scope added from guesswork or pulled forward from a later feature.
- A proposed abstraction, dependency, service, configuration surface,
  compatibility layer, or security mechanism lacks a current requirement, or
  duplicates existing code, the standard library, the platform, or an installed
  dependency. Untuned stack-specific standards in `.pawang/conventions/` are not
  established requirements.
- An oversized or incorrectly ordered build step.
- When an established persisted-data or external API boundary requires it, the
  contract leaves a material type, format, encoding, generator, uniqueness rule,
  default, lifecycle, serialization, or stable result and error shape implicit.
- When an established security, tenant, concurrency, destructive-operation,
  payment, or sensitive-data boundary requires it, the trusted actor source,
  repository-first tenant scope, atomicity, idempotency, or redaction behavior
  remains implicit.
- User-controlled text lacks a safe rendering rule, or validation and error
  feedback lacks the relevant label, association, announcement, focus, or
  clearing behavior.
- A new file, asset, import, or route is not reachable through the current
  runtime and server behavior.
- A UI feature that rebuilds tokens, a shell, or components that already exist,
  builds more shared components than its screens use, links navigation to pages
  that do not exist yet, or leaves a text and background pair without a recorded
  contrast ratio or a design state unspecified.
- A download feature that adds an endpoint, storage, or server-side file generation
  the user did not choose.
- An authorization or URL shape later work would have to reinterpret.
- A done-when that cannot be observed or a test claim the repository cannot run.
- A prerequisite that makes the final Verify gate impossible.

If a prerequisite is absent, incomplete, untracked, or unverified, say which one
the evidence shows. Do not bury repair inside this feature. Stop with the exact
`/fix` or user decision required.

Otherwise write the tightened spec, update activity to `ready`, and stop for
review. Lead with a short note naming what the critique changed, or say that it
found no material change. Never implement from this skill.

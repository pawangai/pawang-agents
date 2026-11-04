Written to `.pawang/specs/rollback-<id>-<kebab-title>.md` (see `.agents/README.md`
Specs). The title is a `#` heading and each section is a `##` heading.

# Rollback: Feature NN - Name

**Type:** Rollback
**Status:** not started
**Branch:** `rollback/<name>`
**Target feature:** NN - Name
**Target spec:** `.pawang/specs/NN-name.md` (deleted by `/complete`; recover it with `git show <target commit>:<path>`)
**Target trailer:** `Feature: NN`
**Target commit:** `<full 40-character commit SHA>`
**Target parent:** `<full 40-character parent SHA>`
**Reason:** Why this completed feature must be removed

## Goal

Restore the product behavior that existed before the target feature while
preserving history and compatible work added afterward.

## Scope

### Reverse

- Product paths and behavior introduced or changed by the target commit

### Preserve

- `CONTEXT.md`, `AGENTS.md`, `.agents/`, `.opencode/`, `.pawang/rules.md`, `.pawang/specs/` (the reverse patch never touches it)
- Later product behavior confirmed compatible in the risk review

### Out of scope

- Cascading rollbacks of later features
- Destructive data migration
- Unrelated cleanup or refactoring

## Product paths

- `path/from/target-commit`

## Review separately

Hunks the target commit made in `DESIGN.md` or `.pawang/conventions/`. Not part of the
reverse patch; hand off to `/design` or the user after the code is reversed.
Write `None` when there are none.

- `DESIGN.md`: `<token or rule>` - used only by the removed feature? yes/no

## Later-change risk

**Classification:** No overlap | Overlap, likely compatible | Dependency risk | Blocked (stop before writing this spec)

| Later commit | Shared path or contract | Required handling |
| ------------ | ----------------------- | ----------------- |
| `<sha> subject` | `path` or contract | Preserve, adapt, or block |

## Build steps

- [ ] Apply the target commit's product diff in reverse with the Type: Rollback
  guard in `/implement`.
  - Done when: the reverse patch applies only to product paths, workflow files
    are unchanged, and the staged diff matches the approved rollback scope.
- [ ] Make only the compatibility edits approved by the risk review.
  - Done when: later features named above still compile and retain their stated
    behavior. Remove this step when no compatibility work is required.
- [ ] Run the project checks and the observable removal path below.
  - Done when: every declared build, test, and acceptance command passes, the
    removed behavior is no longer reachable, and unaffected core behavior still
    works.

## Verification

- Build: `<command from AGENTS.md>`
- Tests: `<declared test command, or not configured>`
- Removed behavior: `<route, UI action, CLI output, API, or public call that must no longer exist>`
- Regression path: `<small unaffected flow that must still work>`

## Notes for the AI

- Stop on patch conflicts or evidence of an unplanned dependency.
- Never rewrite earlier commits; `/complete` makes the rollback commit with a `Rolled-back: NN` trailer.
- `/complete` unchecks the feature and deletes the target spec. Never delete any other spec.
- Do not broaden this rollback beyond the product paths and compatibility work
  listed above.

## Findings

_No findings recorded. `/audit` appends findings here._

## Review

_No independent review requested. `/audit independent` records its verdict here._

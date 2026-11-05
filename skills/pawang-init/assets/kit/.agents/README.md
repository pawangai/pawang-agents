# Pawang workflow reference

Read this for where workflow state lives and how specs work. Running a command does not require it: each command reads its own `SKILL.md`. It is kept out of `AGENTS.md` so it is not loaded every session.

Project memory is the standard files at the repo root: `AGENTS.md`, `CONTEXT.md`, `DESIGN.md` at the root, and `.pawang/rules.md` plus `.pawang/conventions/` (owners and read-when triggers are in the `AGENTS.md` table). Each work item's spec, findings, and review live in `.pawang/specs/`. This folder holds the workflow settings (`pawang.json`), the installer manifest (`pawang.lock.json`), and this file. The manifest records the installed Pawang version and the files the installer manages; `pawang-init --update` uses it to update only files you have not changed locally. The procedures themselves live in a sibling `skills/` folder when the installer or a plugin put them inside the project (`.agents/skills/`); a package install keeps them elsewhere. Resolve a skill by name, never by a fixed path. Workflow state lives in `.pawang/`; there is no chat log or run history.

## Where state lives

| Need                                                        | Where                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| What to build, feature checklist                            | `CONTEXT.md` (sections 1-8, `## Features`)                                                                                        |
| The item being built: spec, steps, findings, review verdict | its file in `.pawang/specs/` (see Specs below)                                                                                       |
| What landed, and the spec of each landed item               | `git log`: each work commit body holds the spec summary and ends with a `Feature:`, `Fix:`, or `Rolled-back:` trailer             |
| Resume after a context clear                                | the active spec file has its steps checked off; git holds the code. A fresh `/implement` continues from the first unchecked step. |

`/complete` checks the feature off in `## Features`, marks the spec `Status: done`, and makes one commit with a `Goal:` line and trailers (`Feature:`, `Fix:`, or `Rolled-back:`, plus `Spec:`).

## Specs

Every work item has one spec file in `.pawang/specs/`, written by `/feature`, `/fix`, or `/rollback` and kept after the work lands.

- **Names:** feature `<id>-<kebab-title>.md` (id from `CONTEXT.md`, numbers zero-padded to two digits, a letter kept: `04-export-csv.md`, `12a-share-link.md`), fix `fix-<kebab-title>.md`, rollback `rollback-<id>-<kebab-title>.md`. A rebuilt feature reuses its name, because a rolled-back feature's spec is deleted. Do not put a README in this folder.
- **Contents:** title, `**Type:**`, `**Status:**` (`not started`, `in progress`, `verified`, `done`), `**Branch:**`, the spec sections, then `## Findings` (the ledger, `### F-01 [P1] open - title` entries) and `## Review` (the independent-review verdict).
- **Active spec:** the spec whose Status is not `done`: `grep -L '^\*\*Status:\*\* done' .pawang/specs/*.md`. A checkout has at most one. If several are listed, use the one whose `**Branch:**` equals the current branch; if it is still ambiguous, stop and ask. None listed means there is no active work.
- **Immutable once done**, except the status of its findings (so a carried-over finding can be repaired and closed later) and one case: `/complete` for a rollback deletes the rolled-back feature's spec, because it describes something that no longer exists (its text stays in git at the build commit, which the rollback spec records). Finding IDs are unique within one spec; across specs write `<spec-stem>#F-03`, where the stem is the file name without `.md`.
- **Unresolved findings** (`open`, `fixed`, `unverified`) stay in their own spec. List them all: `grep -E '^### F-[0-9]+ \[P[0-3]\] (open|fixed|unverified)' .pawang/specs/*.md`. `/complete` blocks only on P0 or P1 findings that are `open` or `fixed` in the active spec.

## The loop

`/context` (or `/adopt` for an existing codebase) -> `/design` (if there is a UI) -> `/feature` -> `/implement` -> `/check` -> `/audit current` -> `/complete`. Undo a landed feature with `/rollback <feature>` -> `/implement` -> `/check` -> `/complete`. Approve the feature spec before `/implement`. Check proves behavior; audit reviews code and records findings. `/sync` repairs drift between the standard files and the code at any time.

## More

Everything else (every `pawang.json` setting, parallel work, the full skill list with descriptions, automation limits, automatic verification) is in `.pawang/workflow/`, starting at `.pawang/workflow.md`. The rules for commits, review, and the 14-step loop are in `.pawang/rules.md`. Skills are folders named after the skill, each with a `SKILL.md`; in a project install they are under `.agents/skills/` (or `.claude/skills/`).

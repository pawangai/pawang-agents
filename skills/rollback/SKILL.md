---
name: rollback
description: Plan a safe, history-preserving reversal of a completed feature from its exact work commit, including later-dependency risk, then stop before implementation. Use for /rollback or requests to undo, remove, or reverse a completed feature. Not for a bug in a live feature (/fix) or diagnosis (/debug).
disable-model-invocation: true
---

# rollback - safely reverse a completed feature

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    completed feature + git history  ->  [rollback]  ->  /implement  ->  /check  ->  /complete
    (git log trailer + work commit)       (risk review     (reverse       (prove)     (log + merge)
                                           + spec)          product diff)

**Reads:** `CONTEXT.md` (`## Features`), the target feature's spec in `.pawang/specs/`, `git log` and diffs, `.agents/pawang.json` (branch prefix), `AGENTS.md` Commands.

**Writes:** one new file, `.pawang/specs/rollback-<id>-<kebab-title>.md`, only.

This skill plans a rollback. It does not change product code, create a branch, commit, merge, or push. It identifies the completed feature and its exact work commit, checks what changed afterward, writes a guarded rollback spec, then stops for review. `/implement` performs the reversal only after the user approves that spec.

## Input

A completed feature by `CONTEXT.md` number or name, plus an optional reason. Examples:

    /rollback 4 because the new export flow is corrupting files
    /rollback "PDF export"

Every question goes through the `interview` skill: numbered, each with a recommended answer, in rounds. An interview answer never replaces a separate approval gate.

With no target, list the most recent checked features from `CONTEXT.md` (with their `Feature:` trailer commits) and ask the user to choose. Never silently pick the latest. If the reason is missing, ask for one before writing the spec: the rollback commit body must explain why the feature was removed.

## Step 0 - preflight

Read the inputs above. Stop before writing when:

- the directory is not a git repository
- an active spec already exists (`.agents/README.md` Specs). Never replace another worker's active spec; parallel work uses one clone or Git worktree per work item, with a separate branch in each checkout
- the working tree is dirty, including unrelated untracked work
- the current branch is not the local default branch
- the target is not a checked item in `## Features`
- `<rollbackBranchPrefix><title>` already exists as a branch

Do not stash, discard, fetch, pull, switch branches, or clean the tree from this skill.

## Step 1 - find the exact work commit

`/complete` lands each work item as one squashed commit whose body ends with a trailer (`Feature: 12`, or `Rolled-back: 12` for an earlier reversal) and that flips the feature's checkbox in `CONTEXT.md`. That makes the commit provable from `git log`, without any archive or extra file.

1. List the build commits on the default branch, newest first, using the full id as written in `CONTEXT.md` and in the trailer: `git log --first-parent --format=%H --grep='^Feature: 12$'`. The anchored pattern keeps `12` from matching `12a` or `120`; when the id has a letter suffix, build the pattern from that full id (`12a`), not from the number alone. List earlier reversals the same way with `--grep='^Rolled-back: 12$'`.
2. Drop every build commit that has a reversal commit descending from it (`git merge-base --is-ancestor <build> <reversal>`). Exactly one unreversed build commit must remain. A feature rolled back and then rebuilt resolves to the rebuild.
3. Confirm the commit changes the feature's checkbox in `CONTEXT.md` (`git show <commit> -- CONTEXT.md`). Read its `Spec:` trailer to locate the feature's spec file (fallback: `.pawang/specs/<id>-*.md`) and record that path as the target spec. Record the commit and its parent as full 40-character SHAs. `git rev-list --parents -n1 <commit>` must list exactly one parent.
4. If no trailer commit exists (an older project, or a squash merge that dropped the body), ask the user for the commit SHA and apply step 3 to it. Never guess from subject lines.

Stop and show the evidence (lines and commits found) when the result is zero, more than one, a commit not on the default branch's first-parent line, or a merge commit with two parents. For a merge commit, do not guess a mainline: explain that the pre-feature state cannot be inferred safely and tell the user what to decide. Never pick by newest commit or message text alone.

Confirm the commit's diff is consistent with the requested feature before continuing: stop if it touches areas the feature's spec does not mention, if it is far larger or smaller than the spec's steps imply, or if unrelated files moved in the same commit.

## Step 2 - separate product changes from workflow files

Inspect the target commit and build the product-path set from the files it changed. Exclude these workflow paths; the rollback never reverses them automatically:

- `.agents/**`, `.opencode/**`, `opencode.json`
- `AGENTS.md`, `CONTEXT.md`, `.pawang/**` (rules, specs, decisions, incidents, handoffs, assessments, runbooks, workflow files), `openapi.json` — all owned by other skills per the ownership table. The reverse patch never touches them; `/complete` deletes the target spec afterwards. `.pawang/conventions/` is the exception: list those files under "Review separately" rather than reversing them silently.

`DESIGN.md` and `.pawang/conventions/` are owned by other skills. If the target commit changed them, list each hunk under "Review separately" in the spec: tokens or rules that only the removed feature used are handed to `/design` or the user after the code is reversed. Do not include them in the reverse patch.

If no product paths remain, stop. Never create an empty rollback that only rewrites workflow files.

## Step 3 - review later-change risk

Inspect every commit after the target through `HEAD` that touches one of the product paths. Also read the bodies of later work commits and `CONTEXT.md` features that mention the target, its contracts, routes, data, or files.

Classify the result:

- **No overlap** - no later commit touched the target product paths.
- **Overlap, likely compatible** - later edits touched the same paths, but the target change can be reversed without removing their behavior.
- **Dependency risk** - later work appears to require the target's API, schema, route, component, or data.
- **Blocked** - safe behavior after reversal is unclear, data migration would be destructive, or a cascading rollback would be required.

Path overlap is a warning signal, not proof of dependency. Name the concrete later commit and contract involved. Never silently cascade into reverting other features. For a blocked case, stop and ask the user to choose a narrower remediation or to plan the dependent rollbacks explicitly.

## Step 4 - write the rollback spec

Write the spec as the new file `.pawang/specs/rollback-<id>-<kebab-title>.md` (left uncommitted; `/implement` creates the branch that carries it) using `reference/rollback-spec-template.md`. Its first heading must be exactly `# Rollback: Feature <id> - <title>` and it must retain `**Type:** Rollback`. Fill in:

- the full branch: `rollback/` prefix from `.agents/pawang.json` plus the title in lowercase kebab-case
- target feature, target spec path, target commit and parent (full SHAs), and the user's reason
- product paths changed by the target, the workflow paths left alone, and the "Review separately" hunks
- later commits reviewed and the risk classification
- compatibility work that is allowed, if any
- exact verification commands and observable removal criteria

Red-team the draft before presenting it:

- does it leave `CONTEXT.md`, `.pawang/specs/`, and all workflow files untouched in the reverse patch?
- could it remove data or require a destructive migration?
- does later code import or call something the target introduced?
- are the removal criteria observable rather than "feature gone"?
- can each compatibility edit be reviewed separately?

Tighten the spec, then stop. Summarize the target commit, affected product paths, later-change risk, and what the critique changed. Tell the user to review the spec, then run `/implement` to create the rollback branch and apply it. `/complete` unchecks the feature in `## Features`, deletes the target feature's spec (its text stays in git at the build commit), and commits with a `Rolled-back: <id>` trailer.

## Rules

- Preserve history. Never rewrite or delete earlier commits; the rollback is a new commit.
- Plan only. This skill writes the rollback spec and nothing else.
- One completed feature per rollback.
- Record the target commit and its parent as full 40-character SHAs that resolve in the current repository.
- Never use `git reset --hard`, force-push, history rewriting, or broad file restoration. Never run a whole-commit `git revert`: the work commit also carries `CONTEXT.md` edits.
- Never infer permission to cascade into later features or destroy stored data.
- A rollback still uses `/implement`, `/check`, and `/complete` review gates.

## Formatting

Format the output to match the project's conventions in `AGENTS.md#communication`: concise, scannable markdown, with a small risk table when later commits overlap.

# Rollback implementation safeguard

Use this only when the active spec in `.pawang/specs/` says `**Type:** Rollback`.

Do not hand-delete the old feature and do not run a whole-commit `git revert`.
The completed commit also contains `CONTEXT.md` and `.pawang/specs/` bookkeeping that
must stay as it is now.

Before the first rollback step:

1. Read `Target commit` and `Target parent`. Stop unless both values match
   `^[0-9a-f]{40}$`.
2. Verify the target commit has exactly one parent. Stop on a merge target.
   Confirm the resolved parent exactly equals `Target parent`.
3. Confirm the target is an ancestor of `HEAD` and that the rollback spec file
   in `.pawang/specs/` is the only dirty path. Stop on drift.
4. Preview the target's product diff while excluding the workflow paths
   `.agents/**`, `.opencode/**`, `opencode.json`, `AGENTS.md`, `CONTEXT.md`,
   `.pawang/**` (including `.pawang/rules.md`), and the separately reviewed
   `DESIGN.md` and `.pawang/conventions/`.
   Confirm it is non-empty and matches the Product paths in the spec.
5. Apply only the resolved product diff in reverse with three-way conflict
   detection. Use only the resolved full SHA values:

       git diff --binary <target-parent> <target-commit> -- . \
         ':(exclude).agents/**' ':(exclude).opencode/**' \
         ':(exclude)opencode.json' ':(exclude)AGENTS.md' \
         ':(exclude)CONTEXT.md' ':(exclude).pawang/specs/**' \
         ':(exclude)DESIGN.md' ':(exclude).pawang/conventions/**' \
         ':(exclude).pawang/rules.md' |
         git apply --reverse --3way --index

6. Show the staged diff and status. Stop if any excluded path is staged or
   modified by the patch (the only allowed workflow change is the rollback spec's own
   `Status` and step checkboxes).

The target feature's spec is not deleted here: `/complete` deletes it and unchecks
the feature after the checks pass.

If the reverse patch conflicts, report the exact paths and the later commit
involved. Do not auto-resolve, discard, stash, reset, or broaden the rollback.
Ask whether to resolve only the approved conflict or abandon the attempt.

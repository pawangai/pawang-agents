# Rules for AI agents

The full rules for working in this project. `AGENTS.md` holds the short core and
points here. Read this file before committing, reviewing code, running the
feature loop, or when you are stuck. Written by the user and the `agents-md`
skill; other skills do not edit it.

> **Pawang is an overlay layer**, added on top of an already-scaffolded app.
> Never run a framework scaffolder (`bun create hono`, etc.) inside this
> directory. For a new project, scaffold the app first, then overlay these files.

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features that are not in `CONTEXT.md`
- Never delete files without clarification

### Asking the user questions

Whenever a skill or the agent needs to ask the user something, invoke the
`interview` skill and follow its round
format: every unblocked question in one round, numbered, each with a
recommended answer, so that "yes" accepts the recommendation. For one to three
independent questions use its light mode: a single round, no decision tree, and
no summary-and-confirm step. Ask only about decisions (goals, priorities,
tradeoffs, taste, business constraints). Look up facts in the repository,
config, or docs instead of asking.

Approvals stay separate. A "yes" in an interview round never counts as approval
to commit, merge, push, deploy, publish, or touch a remote service or data;
those still need their own explicit yes in the current chat, as the skill that
gates them requires.

## Output formatting

Format every response for fast scanning, in whatever tool renders it. Skills
point at this file for formatting, so tune it here and the change applies
everywhere.

- **Real markdown, not prose walls** - bold field labels, short lines, a blank line between blocks.
- **Enumerations are lists** - a sequence of steps, options, or findings is a numbered or bulleted list, never an inline `(1)... (2)... (3)...` run crammed into a paragraph.
- **Tables for matrices** - comparing things across the same fields (status per item, option tradeoffs) goes in a table, not stacked bullets.
- **Backticks for code things** - identifiers, paths, commands, filenames.
- **Lead with the answer** - state the result or the state first, supporting detail after.
- **Don't over-format** - no deep bullet nests or decorative headers on a two-line reply. Concise still wins.

## Workflow

The loop used for every feature. The spec of the work item being built is its
file in `.pawang/specs/` (see `.agents/README.md`, Specs).

Run `/feature` (or `/fix` for a bug or change that isn't a planned feature) to
write the spec and approve it before `/implement` builds it on a branch. Use
`/check` to prove behavior, `/audit` to review code and record findings, and
`/complete` to close the spec, commit, and merge with approval. This path does
not change the configured gates; Audit is not mandatory for every feature.
`/check guide` only explains how the user can test the work and never runs
checks or records acceptance. The numbered loop below is what those skills
follow.

Run these skills in AI chat, not as terminal commands.

After the first successful `/context`, Pawang offers a reviewed local commit for
the initial workflow setup and plans before Feature 1. It shows the exact
candidate diff and asks first. It skips local-only installations and stops
rather than mixing app source or unrelated work into the baseline. When setup
work is on a dedicated branch, the same approval can finalize the local baseline
and fast-forward it into the unchanged default branch. It never pushes.

The skills are the structured path, not a requirement. You can also describe a
feature, fix, or change in chat at any time and it is built the same way; the
rules below still apply (small steps, a reviewable diff, the conventions in
`.pawang/conventions/`). Use the skills when you want the repeatable loop and the
record; prompt directly when you just want something done.

1. **Spec** - Run `/feature` (no number = the next unchecked item in
   `CONTEXT.md` `## Features`) to write `.pawang/specs/<id>-<title>.md`, then
   review it together before any code.
2. **Branch** - Create a new branch for the feature or fix.
3. **Implement** - Build one small step from the spec at a time, not the whole
   feature as one undifferentiated change.
4. **Review** - By default, implement and verify each small step, then show one
   feature-level review packet with the complete diff and done-when evidence.
   Set `workflow.stepReview` to `every` when each step needs approval before the
   next begins. After the final packet, `/implement` always offers a read-only
   walkthrough of the finished code.
5. **Test** - Verify the done-when with evidence. If `AGENTS.md` declares a
   `Verify` command, run that exact command as the final automated gate. If no
   Verify command exists, run the documented build command and the test command
   when configured. A step that adds logic must ship a passing test when the
   test gate is on. When `AGENTS.md` declares `Browser tests`, stable browser
   behavior can include focused harness coverage, while remaining UI and
   integration claims ride on direct browser, screenshot, API, and build
   evidence. Run `/tests` or `/tests browser` explicitly rather than adding a
   missing runner mid-feature. See `.pawang/conventions/testing.md`
   for the gates. Run `/ci` separately when you want one Verify command and
   matching automatic GitHub checks.
6. **Try it now** - After Verify and any required `/check` pass, the default
   `when-testable` guide policy adds one small user-run command or interaction
   with the exact expected result whenever a safe meaningful path exists. Run
   `/check guide` for a deeper human walkthrough. Try It Now never replaces
   tests, Verify, or Check.
7. **Audit (optional)** - Run `/audit` for a read-only code quality pass before
   closing a feature or after a larger automated run. It checks duplication,
   dead code, missing tests for logic, standards drift, and maintainability
   risks, and records findings in the spec's `## Findings`. Run
   `/audit independent` when a separate reviewer should inspect an
   approved checkpoint; its verdict goes in the spec's `## Review` and goes
   stale when the reviewed tree changes. Independent review defaults to
   `when-sensitive`, so sensitive or unusually broad work selects it
   automatically while ordinary small features do not. A `manual` gate policy
   disables automatic selection, but the explicit command stays available.
   Fixes happen through `/implement` or `/fix`.
8. **Iterate** - If it doesn't work or needs changes, re-prompt or hand-edit and
   re-test; repeat until it works, before moving on.
9. **Checkpoint (optional)** - checkpoint commits are disabled by default. When
   enabled with per-step review, `/implement` offers continue, commit a
   checkpoint, walk me through it, or stop here after an approved step. The
   checkpoints are optional rollback points; `/complete` still makes the real
   commit. Verify, or the fallback checks, must pass first. When implementation
   is done, end with a compact review packet: changed files, checks run, the
   generated `## Try it now` section when applicable, risks, and next action.

   `workflow.stepReview: "every"` restores per-step approval pauses but does not
   enable checkpoint prompts by itself. The previous behavior is
   `stepReview: "every"` together with `checkpointCommits: "enabled"`.
10. **Safety and close** - `/complete` first checks the active spec, branch,
    changed files, Verify or fallback check evidence, the manual try path, and
    the independent review gate. Then it sets the spec to `Status: done`,
    checks the feature off in `CONTEXT.md` (a rollback unchecks it and deletes
    the rolled-back feature's spec), and keeps findings in the spec.
11. **Work commit** - `/complete` stages everything on the branch into one
    conventional commit with a `Goal:` line and trailers (see Commits).
12. **Land** - `/complete` follows `git.landing`. The default local path asks to
    squash-merge the branch and later asks separately before pushing the default
    branch. The `pull-request` path asks once before pushing the work branch and
    opening a pull request, then leaves provider review and squash merge to the
    user. Neither path infers approval from configuration.
13. **Auth and data setup (optional)** - run `/auth <provider>` and
    `/data <store>` once the stack is known, before the features that depend on
    them. Each prepares local config, env review, and local checks, and stops
    before any remote account, resource, migration, or secret change unless the
    user gives a separate yes in the current chat.
14. **Release prep (optional)** - run `/release <provider>` after a completed
    feature or milestone for local provider config, env var review,
    build/start checks, and a smoke-test path. It stops before deploy, remote
    service creation, remote env changes, push, or publish unless the user gives
    a separate yes in the current chat.

**Resuming after a context clear.** Progress lives in files, not the chat: the
active spec holds the steps, each checked off as it is done, and git holds the
code (branch, commits, working tree). A fresh `/implement` continues from the
first unchecked step, so no separate save or load command is needed.

Do NOT commit without permission or until Verify, or the fallback build and
tests, passes. If a required check fails, fix the issue first.

`/buildall` exists only as an explicit command. Do not suggest it as the default
next action. It runs the feature loop over many `CONTEXT.md` items without
per-feature approval pauses, and stops on decisions, failed gates, or missing
prerequisites. It never authorizes push, deploy, publish, remote changes,
destructive actions, or waiving findings.

## Branching

A new branch for every feature, fix, or rollback, using the prefixes in
`.agents/pawang.json`. Ask to delete the branch once merged. `/buildall` already
authorizes deleting each locally merged feature branch.

## Commits

- Ask before committing, except for checkpoint commits the user has enabled in `.agents/pawang.json` and the commits explicitly authorized by running `/buildall`
- The initial baseline also requires explicit approval and uses
  `chore: establish project baseline`
- Use conventional commit messages (feat:, fix:, chore:, etc.); see
  [Commit message style](#commit-message-style)
- Keep commits focused (one feature or fix per commit)
- Do not add AI `Co-Authored-By` trailers, generated-by signatures, or other AI
  attribution to commits or pull requests; preserve genuine human attribution

### Commit and PR attribution

Review the final commit or PR text before submitting it, and remove any AI
attribution that a tool adds by default.

### Commit message style

Terse and exact. The diff says what changed; the message says why.

**Subject:** `<type>(<scope>): <imperative summary>`, scope optional.

- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`,
  `ci`, `style`, `revert`
- Imperative mood ("add", "fix", "remove"), not "added" or "adds"
- 50 characters when possible, 72 maximum, no trailing period
- Match the project's capitalization after the colon
- Mark a breaking change with `!` after the type or scope, for example
  `feat(api)!: rename /v1/orders to /v1/checkout`, and give the migration in the body

**Body:** only when needed, otherwise omit it.

- Add one for a non-obvious reason, a breaking change, migration notes, or a deviation from the spec
- Wrap at 72 characters, bullets with `-`
- Linked issues go last: `Closes #42`, `Refs #17`

**Never include:**

- "This commit does X", "I", "we", "now", "currently"
- "As requested by ..." (use a human `Co-authored-by` trailer instead)
- Any AI attribution or trailer, including `Assisted-by`; the rule above wins
- Emoji, em dashes, or the file name when the scope already names it

**Work commits from `/complete` and `/buildall`:** one squashed commit per work
item, so the subject names the feature or fix itself. The body is short: a
`Goal:` line, then trailers: `Feature: <id>`, `Fix: <slug>`, or
`Rolled-back: <id>` (with `Reverts: <sha>`), and `Spec: .pawang/specs/<file>.md`.
The spec file holds the full record. `/rollback`, `/sync`, and `/context` find
landed work through the trailers, so never drop them when editing the message or
PR description. Do not mention workflow bookkeeping.

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase
- For visual or replication features (recreating a design, matching a mockup),
  work from a reference image stored in the `assets/` folder of the `reference` skill, not
  a prose description. Ask for the image if it's missing; building a visual
  target from words alone yields an approximation that costs rework.

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)

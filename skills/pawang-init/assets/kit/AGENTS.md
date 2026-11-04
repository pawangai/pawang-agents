# AGENTS.md

Instructions for AI coding agents working in this project.

Never add AI attribution to commits or pull requests (no AI `Co-Authored-By` trailers or generated-by signatures). Preserve genuine human attribution. See [Commits](#commits).

## What this is

A description of your project and the problem it solves.

This project uses **Pawang**, a workflow layer, not an app skeleton. To start a new project, scaffold the app first in an empty folder (`bun create hono`, etc.), then overlay these files on top. Never run a framework scaffolder inside a directory that already holds the Pawang files (`AGENTS.md`, `.agents/`, `.opencode/`); it fails because the directory isn't empty.

Workflow steps are OpenCode commands in `.opencode/commands/` (`/context`, `/feature`, `/implement`, ...). Each one reads its instructions from the `SKILL.md` of the skill with the same name. Skills are hidden from the skill list on purpose (see `opencode.json`), so a skill runs only through its command (`/feature`, ...) and calling it directly through the skill tool is denied; the exceptions are `agents-md`, which the agent may invoke on its own when `AGENTS.md` needs to be written, tidied, or split, and `interview`, which the agent invokes whenever it needs to ask the user a question (see [Communication](#communication)).

**Skill paths and subagents.** Skills can be installed in the project (`.agents/skills/`, `.claude/skills/`) or by a plugin, so they refer to their own files with `<skill-dir>`, the folder that holds their `SKILL.md` (see the note at the top of each skill). Named subagents (`explorer`, `implementer`, `reviewer`, `verifier`) are OpenCode agents in `.opencode/agents/` and plugin agents (`pawang:<name>`) in Claude Code. If the harness has no named subagents, start a general subagent and have it read the persona file first (in a plugin: `agents/<name>.md` at the plugin root). If it cannot start a subagent at all, tell the user to run that step in a fresh session.

## Project files

The project's memory is plain standard files: `AGENTS.md`, `CONTEXT.md`, and `DESIGN.md` at the repo root, and the long rules and standards under `.pawang/` (open each one when its row below says to). There is no hidden chat log or run history: workflow state lives in `.pawang/` and history is `git log` (work commits carry a `Goal:` line and trailers), and every work item's spec, findings, and review live in its own file in `.pawang/specs/`, which you read before building, reviewing, or rolling back that item.

| File                | Holds                                                                                           | Written by                                                     | Read when                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `AGENTS.md`         | rules, commands, this index; `layout` owns its `## Repository layout` section                   | `agents-md`, `sync`, `layout`                                  | every session                                                                        |
| `CONTEXT.md`        | what to build: problem, users, data, stack, features checklist                                  | `context`, `adopt`, `plan`; `complete` only checks boxes       | before planning or building                                                          |
| `.pawang/specs/*.md`   | one spec per work item: goal, steps, done-when, findings, review; immutable once `Status: done` | `feature`, `fix`, `rollback`, `implement`, `audit`, `complete` | before building, reviewing, or rolling back that item                                |
| `.pawang/README.md` | index of the state folder and its owners | `agents-md` | when you need to find a file inside `.pawang/` |
| `DESIGN.md`         | look and feel: tokens in front matter, rationale in prose (Google DESIGN.md format)             | `design`, `adopt`                                              | before any UI change                                                                 |
| `.pawang/rules.md`     | full agent rules: workflow loop, commit style, when stuck, code review                          | the user, `agents-md`                                          | before committing, reviewing code, running the feature loop, or when stuck           |
| `.pawang/workflow.md`  | workflow reference: config settings, skill list, automation limits, automatic verification      | the user, `agents-md`                                          | when changing workflow settings or looking for the right skill, not on every command |
| `.pawang/conventions/` | coding standards for this stack (start at `README.md`)                                          | the user, `adopt`                                              | before changing code                                                                 |
| `.pawang/incidents/`   | incident records, one file per incident                                                         | `incident`                                                     | when triaging a production problem                                                   |
| `.pawang/handoff/`     | end-of-session handoff notes                                                                    | `handoff`                                                      | when resuming from a handoff                                                         |
| `.pawang/assessments/` | idea assessments (go, needs-clarification, kill)                                                | `assess`                                                       | before `/plan`                                                                       |
| `.pawang/decisions/`   | architecture decisions, one file per decision, only `Accepted` applies                          | `agents-md`, `layout`, `handoff`                               | when a task touches architecture                                                     |
| `.pawang/runbooks/`   | operator runbooks, one file per procedure, each with `Last verified`                         | `runbook`                                                      | before running a repeatable procedure                                                |
| `.pawang/runs/` | workflow measurement records, one file per side | the user, `runbook` | when measuring or comparing workflow runs |
| `openapi.json`      | API contract, generated                                                                         | `bun run openapi`                                              | before an API change                                                                 |

- Only the listed skill, or the user, writes a file. A skill that needs a change elsewhere hands off to the owner (for example `implement` asks for `/design` instead of editing `DESIGN.md`).
- A new folder under the root or under `.pawang/` needs an owner row in this table before anything writes to it. A skill that needs one asks its owner instead of creating it silently.
- Add a file only when the project needs it, under its standard name (for example `GAME-DESIGN.md` for a game). Register it in this table.
- `/sync` finds drift between these files and the code, such as a command listed here that no longer exists.
- Workflow reference: `.agents/README.md`. Workflow settings: `.agents/pawang.json`.

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.
- Stack-specific standards apply only when the project uses that stack.

## Communication

- Be concise and direct. Explain non-obvious decisions briefly.
- Ask before large refactors or architectural changes.
- Don't add features that are not in `CONTEXT.md`. Never delete files without clarification.
- If something isn't working after 2-3 attempts, stop and explain the issue; don't keep trying random fixes.

**Asking the user questions.** Whenever a skill or the agent needs to ask the user something, invoke the `interview` skill and follow its round format: every unblocked question in one round, numbered, each with a recommended answer, so that "yes" accepts the recommendation. For one to three independent questions use its light mode. Ask only about decisions (goals, priorities, tradeoffs, taste, business constraints); look up facts in the repository or docs instead. A "yes" in an interview round never counts as approval to commit, merge, push, deploy, publish, or touch a remote service or data; those need their own explicit yes in the current chat.

**Output formatting.** Skills point here for formatting, so tune this once.

- Real markdown, short lines, a blank line between blocks. Lead with the answer.
- Enumerations are lists, never an inline `(1)... (2)...` run. Matrices (status per item, option tradeoffs) are tables.
- Backticks for identifiers, paths, commands, and filenames.
- Don't over-format a two-line reply.

## Code changes

- Make minimal changes to accomplish the task. Preserve existing patterns. Don't refactor unrelated code or add "nice to have" features.
- Follow `.pawang/conventions/README.md` before changing code, and `DESIGN.md` before changing UI.
- For visual or replication work (matching a mockup), work from a reference image in the `assets/` folder of the `reference` skill, not a prose description. Ask for the image if it is missing.
- Review AI-written code for security (auth checks, input validation), performance (N+1 queries), logic edge cases, and fit with existing patterns.

## Branching and commits

- One branch per feature, fix, rollback, or work item, using the prefixes in `.agents/pawang.json`. Delete the branch after a confirmed merge according to `git.branchCleanup`: `ask` is the default, `auto` deletes, `keep` leaves it.
- Ask before committing, except checkpoint commits the user enabled in `.agents/pawang.json` and commits explicitly authorized by `/buildall`.
- Keep commits focused: one feature or fix per commit. `Verify` (or the fallback build and tests) must pass first.

### Commits

Review the final commit or PR text before submitting it, and remove any AI attribution a tool adds by default. Terse and exact: the diff says what changed; the message says why.

**Subject:** `<type>(<scope>): <imperative summary>`, scope optional.

- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- Imperative mood, 50 characters when possible, 72 maximum, no trailing period
- Mark a breaking change with `!` after the type or scope and give the migration in the body

**Body:** only when needed, except work commits below (non-obvious reason, breaking change, migration notes, deviation from the spec). Wrap at 72 characters, bullets with `-`, linked issues last (`Closes #42`).

**Never include:** "This commit does X", "I", "we", "now", "currently"; AI attribution or trailers (including `Assisted-by`); emoji; em dashes.

**Work commits from `/complete` and `/buildall`:** one squashed commit per work item, subject names the feature or fix itself. The body is short: a `Goal:` line, then trailers: `Feature: <id>`, `Fix: <slug>`, or `Rolled-back: <id>` (with `Reverts: <sha>`), and `Spec: .pawang/specs/<file>.md`. The spec file holds the full record. `/rollback`, `/sync`, and `/context` find landed work through the trailers, so never drop them when editing the message or PR description. Don't mention workflow bookkeeping.

## Writing

No em dashes (U+2014) in generated content: docs, comments, commit messages, specs. Use a hyphen for `term - description`, or rephrase with commas, parentheses, or a colon. Avoid en dashes and the ellipsis character too.

## Commands

For a Hono API on Cloudflare Workers with Drizzle ORM and Better Auth or Cloudflare Access. Change or remove if you're using something else. Script names are the expected defaults; confirm them against `package.json`.

- Package manager and runner: Bun. Toolchain: Wrangler (no Vite).
- Dev server: `bun run dev` (`wrangler dev`, http://localhost:8787)
- Typecheck: `bun run typecheck`
- Generate OpenAPI spec: `bun run openapi` (writes `openapi.json`)
- Build check: `bun run build` (`wrangler deploy --dry-run`, no upload)
- Lint: `bun run lint`
- Lint `DESIGN.md` (when present): `npx -y @google/design.md lint DESIGN.md`

Testing is opt-in. If this project does not already have a unit test runner, run
`/tests` or `$tests` to add one and update this section with the real test
commands.

Browser testing is also opt-in. Run `/tests browser` or `$tests browser` to add
or normalize a browser harness and document its exact command as `Browser
tests`. Check can then reuse it without installing tooling
mid-feature.

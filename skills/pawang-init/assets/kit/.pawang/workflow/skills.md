# Workflow

Build one feature, fix, or rollback at a time, behind review gates. Each step's
instructions are plain markdown skills any capable agent can read and follow.
The workflow is exposed to OpenCode as slash commands in `.opencode/commands/`,
each reading the `SKILL.md` of the skill with the same name. `AGENTS.md` holds
the shared project instructions.

## Parallel work

Pawang supports parallel work through isolated Git checkouts, without a
separate team mode. Give each developer or agent its own clone or Git worktree
and one dedicated branch before starting `/feature` or `/fix`. The branch must
use the configured prefix and the work item's lowercase kebab-case title. Each
branch carries its own spec file in `.pawang/specs/`, with its findings and review
state, so parallel branches do not conflict on workflow state. Never run two
active work items in the same working directory or replace another worker's
active spec.

Parallel branches may both check off features in `CONTEXT.md`; resolve any
normal Git conflict when the later branch lands. Use `git.landing:
"pull-request"` when the default branch is protected or several isolated
checkouts are active. This model intentionally does not add per-item state
folders or automatic agent coordination.

Learn the feature loop: `/feature` -> `/implement` -> `/check` -> `/audit current` ->
`/complete`. Approve the feature spec before `/implement`. Check proves behavior;
Audit reviews code and records findings. Showing both in this path does not
change configured gates or make Audit mandatory. `/check guide` only generates
manual instructions and never performs verification or records acceptance.

Core skills:

## Build

- `feature` - turn a `CONTEXT.md` feature into a spec in `.pawang/specs/`, or propose a reviewed addition for a genuinely new feature
- `implement` - build the active spec one small, reviewed step at a time
- `check` - prove the active spec against the running app, or use `check guide` for a read-only manual review guide: where to go, what to click, what to expect
- `complete` - run the final safety pass, close the spec (`Status: done`), check the feature off in `CONTEXT.md`, commit with a `Goal:` line and trailers, then request approval for the configured local merge or pull-request landing

## Understand and review

- `status` - read-only progress summary, workflow drift warning, and suggested next action
- `debug` - reproduce and isolate a failure without editing code, then hand the evidence to `fix` or `implement`
- `audit` - branch-aware or full-project review across all concerns or a focused quality, security, performance, or tests lens; records findings in the spec's `## Findings`; `audit independent` has the separate `reviewer` subagent inspect an approved checkpoint and records a verdict in `## Review`
- `sync` - detect and repair drift between `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`, and the code

## Extras

- `handoff` - write a short end-of-session handoff to `.pawang/handoff/<topic>.md`, or resume from one in a new session
- `runbook` - turn a repeatable procedure into numbered operator instructions in `.pawang/runbooks/<topic>.md` with exact commands, expected output, a budget, stop conditions, and a reset; writes the document, never runs it
- `layout` - audit and tidy folder placement and file naming; writes the Repository layout section in `AGENTS.md`
- `agents-md` - write, tidy, or split `AGENTS.md` into a short index that links to `.pawang/` with read-when triggers; one of two skills the agent may also invoke on its own
- `interview` - interview the user round by round, every question with a recommended answer, until a shared understanding is confirmed (one light round for one to three independent questions); the agent invokes it whenever it needs to ask the user a question
- `pawang-skill-creator` (external: `npx skills add pawangai/pawang-skills --skill pawang-skill-creator`) - create, audit, or improve an Agent Skills folder (`SKILL.md`, `reference/`, `scripts/`) and validate it with `scripts/validate_skill.py`; new skills stay hidden and run through their own command
- `buildall` - explicit-only: build many `CONTEXT.md` features in sequence, each through spec, implement, gates, and a local merge, with no per-feature approval pauses; stops on decisions, failed checks, or missing prerequisites
- `advise` - evidence-based recommendations for missing tooling, tests, CI, docs, or skills; also reports docs and skill health
- `reference` - turn sample documents (invoice, receipt, contract) into a precise spec and verify the built feature against it
- `agents` - install the explorer, implementer, verifier, and reviewer subagents under `.opencode/agents/`

## Plan and set up

- `adopt` - bootstrap Pawang into an existing brownfield app with shipped features: creates `CONTEXT.md`, `DESIGN.md`, and `.pawang/conventions/` from what the code really does
- `assess` - decide whether a raw idea is worth building (go, needs-clarification, or kill) in one `assessments/<slug>.md`, before `plan`; a `go` hands off to `plan`
- `plan` - draft or revise the product sections and feature list of `CONTEXT.md` through an interview or from prototype files (`01-PRD.md` to `04-edge-cases.md`), shown in full for approval before writing
- `context` - create or normalize `CONTEXT.md` (the single source of truth for what to build): fill empty sections through an interview, validate the numbered feature checklist, report contradictions, then offer a reviewed initial baseline commit before Feature 1
- `design` - create or update `DESIGN.md` from `CONTEXT.md` and existing UI code, then lint it
- `tests` - set up unit testing by default, or a repeatable browser harness with `tests browser`
- `ci` - explicitly set up one project-specific Verify command and matching automatic GitHub checks, with an optional local pre-push hook
- `ci-deploy` - optional Cloudflare deploy and preview workflows, each its own scope (`deploy workers`, `preview workers`, `deploy pages`, `preview pages`), gated on Verify; `e2e workers` adds E2E on a Worker Preview and `audit workers` is a read-only check of the setup

## Recover and release

- `fix` - document an ad-hoc bug or change into a spec in `.pawang/specs/fix-<title>.md`
- `rollback` - plan a safe reversal of a completed feature from its exact git work commit (found through its `Feature:` trailer), with later-dependency review before code changes; `/complete` then unchecks the feature and deletes its spec
- `incident` - triage a production bug or incident report without touching production: classify severity, route to `debug`, `fix`, or `rollback`, and write a record under `.pawang/incidents/`
- `deps` - audit outdated or vulnerable dependencies read-only and queue one update batch at a time through `fix`
- `auth` - optional authentication setup for Better Auth, Cloudflare Access, or another provider: local config, env review, protected-route checks, and smoke-test planning
- `data` - optional database, storage, and cache setup for Drizzle ORM, D1, R2, KV, Supabase, Neon, or another store: schema and migration checks, bindings, env review, and smoke-test planning
- `release` - optional deployment readiness for Cloudflare, Render, Vercel, Netlify, or another host: local config, env review, and smoke-test planning

In OpenCode, use slash commands such as `/context` or `/feature`. These are AI chat
commands, not terminal commands. The conventions in `.pawang/rules.md` and
`.pawang/conventions/` apply however a step is invoked.

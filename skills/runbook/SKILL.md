---
name: runbook
description: Turn a repeatable procedure (measurement, release readiness, manual QA pass, incident drill, migration rehearsal) into a numbered operator runbook in .pawang/runbooks/<topic>.md with exact commands, expected output, a time budget, stop conditions, and a reset. Use for /runbook or "buatkan runbook". Not for running the steps, not for a feature spec (/feature), not for session handoff (/handoff), and not for a one-feature manual check (/check guide).
disable-model-invocation: true
---

# runbook - turn a procedure into operator instructions

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

    goal  ->  [runbook]  ->  .pawang/runbooks/<topic>.md
              (one file)     steps, expected output, budget, stops, reset

This skill writes instructions. It never runs them.

## Input

`/runbook "<goal>"` or `/runbook <topic>`. Typical goals: measure a workflow,
check release readiness, run a manual QA pass, rehearse an incident, onboard a
new machine, rehearse a migration.

Refuse and route elsewhere when the goal is really a feature spec (`/feature`),
a session handoff (`/handoff`), or a manual check of one feature
(`/check guide`).

## Rules

- Write exactly one file. Never edit code, tests, config, or `CONTEXT.md`.
- Never execute a step from the runbook, not even the safe ones.
- Every command must already exist. Check the Commands section in `AGENTS.md`
  and the scripts in `package.json`; if a step has no existing command, write the
  manual action instead of inventing one.
- No secrets, tokens, email addresses, or personal data. Refer to environment
  variable names only.
- Mark any step that needs approval, a remote service, or a destructive action
  with `[needs approval]`, and never add a shortcut that bypasses that approval.
- Expected output must be concrete: a status code, a string, a file, a count.
  "It works" is not output.
- One procedure per file. If the goal spans two procedures, write two files and
  link them.

## Steps

### 1. Define the procedure

State the goal in one sentence, who runs it, and the success signal. Ask through
`interview` only when the goal, the environment, or a safety boundary is
genuinely ambiguous.

### 2. Collect the real commands

Read the Commands section of `AGENTS.md`, the scripts in `package.json`, and the
active spec when the runbook covers it. Confirm each command exists before
writing it down.

### 3. Set the budget and the stops

Give the procedure a wall-clock budget. List the conditions that end it early:
unexpected output, a failed Verify, a missing secret, a dirty tree, a refused
approval. For each stop, state what state is left behind and how to resume.

### 4. Write the file

Use `reference/template.md`. Name the file `.pawang/runbooks/<kebab-topic>.md`.
Update an existing file for the same topic instead of adding a near-duplicate.
When you change steps without running them, keep `Last verified` and add
`Changed since last run: <date>`.

### 5. Close

Report the path, the step count, the budget, the approvals needed, and the two
riskiest steps. Do not run anything.

## Output

A short summary after the file is written:

    Runbook: .pawang/runbooks/release-check.md
    Steps: 9, approvals: 2, budget: 30 min
    Riskiest: step 4 (remote migration), step 7 (deploy)
    Not run. Last verified: never.

Do not paste the runbook into chat.

## Done when

- The file exists, follows the template, and every command was confirmed to
  exist.
- Every step has a concrete expected result.
- Budget, stop conditions, reset, and the evidence list are present.
- No secret, no invented command, and no executed step.

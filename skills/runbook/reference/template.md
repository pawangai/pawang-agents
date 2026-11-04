# <Procedure title>

**Owner:** <role or person>
**Last verified:** never
**Budget:** <minutes>
**Environment:** <local, CI, staging, production>

## Goal

One sentence: what is true when this runbook is done.

## Prerequisites

- <tool or version>
- <env var name, never the value>
- <access or approval, marked [needs approval] when it is required>

## Steps

For each step: the command, the expected result, and what to do when the result
differs. Number them. Keep one action per step.

1. **<Action>**

   ```sh
   <exact command>
   ```

   Expected: <status code, string, file, or count>

   If different: <stop, retry, or branch>

## Stop conditions

End the run and report when any of these happens. For each, state what state is
left behind and how to resume.

- <condition> -> <state> -> <resume with>

## Reset

How to return to a clean starting point. Prefer non-destructive commands. Never
use `git reset --hard`; use `git reset --mixed <sha>`, `git checkout -- .`, and
`git clean -fd`.

```sh
<reset commands>
```

## Evidence

What to keep when the run finishes, and where:

- <log, screenshot, output file, commit sha>
- <where it is stored>

## Notes

- Changed since last run: <date, or "none">
- Known limits of this procedure: <one or two lines>

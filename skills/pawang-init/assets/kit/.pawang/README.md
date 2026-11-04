# .pawang

Workflow state and rules. Plain markdown, tracked in git. No chat log, no run
history: history is `git log`.

| Path           | Holds                                         | Owner                                                          |
| -------------- | --------------------------------------------- | -------------------------------------------------------------- |
| `rules.md`     | full agent rules, commit style, when stuck    | the user, `agents-md`                                          |
| `workflow.md`  | workflow reference index                      | the user, `agents-md`                                          |
| `workflow/`    | config, skills, automation, verification      | the user, `agents-md`                                          |
| `specs/`       | one spec per work item, findings, review      | `feature`, `fix`, `rollback`, `implement`, `audit`, `complete` |
| `conventions/` | coding standards for this stack               | the user, `adopt`                                              |
| `decisions/`   | architecture decisions, only `Accepted` binds | `agents-md`, `layout`, `handoff`                               |
| `runbooks/`    | operator runbooks with `Last verified`        | `runbook`                                                      |
| `runs/`        | workflow measurement records                  | the user, `runbook`                                            |
| `incidents/`   | incident records                              | `incident`                                                     |
| `handoff/`     | end-of-session handoff notes                  | `handoff`                                                      |
| `assessments/` | idea assessments                              | `assess`, `plan`                                               |

`AGENTS.md`, `CONTEXT.md`, and `DESIGN.md` stay at the repository root: the agent
reads `AGENTS.md` there, and `CONTEXT.md` and `DESIGN.md` are standard root files.

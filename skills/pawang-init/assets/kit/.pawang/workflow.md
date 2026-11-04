# Pawang workflow reference

Read this when you change `.agents/pawang.json`, need the right skill name, or
set up batch or provider work. Running a command does not require it: each
command reads its own `SKILL.md` and only the files that skill names.

| File                            | Holds                                                                      | Read when                           |
| ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `.pawang/workflow/config.md`       | every `.agents/pawang.json` key, gate modes, branch prefixes, build limits | changing workflow settings          |
| `.pawang/workflow/skills.md`       | the skill list by area, the feature loop, parallel work                    | looking for the right skill or step |
| `.pawang/workflow/automation.md`   | `/buildall`, `/release`, `/ci-deploy`, `/auth`, `/data` limits             | running batch or provider work      |
| `.pawang/workflow/verification.md` | `Verify`, GitHub checks, browser tests                                     | setting up checks                   |

## Non-negotiables

- Configuration can tighten review and verification. It never grants permission
  to commit, merge, push, deploy, publish, send, delete data, waive a failing
  check, or accept a finding.
- Approval and safety boundaries are not configurable.
- State, specs, and the active-spec rule live in `.agents/README.md`. The full
  rule text and the 14-step loop live in `.pawang/rules.md`.

## Reading budget

Each turn should load one `SKILL.md` plus the files that skill names. This
folder is reference, not a session default: open one file, not all five, and
only when the table above says so.

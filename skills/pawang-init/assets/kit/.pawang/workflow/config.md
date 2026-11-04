# Project configuration

`.agents/pawang.json` is the user-owned, machine-readable workflow policy for
this project. Workflow skills read the relevant settings before acting. A
missing file means built-in defaults. An invalid file falls back to defaults for
read-only status reporting, but mutating workflow commands stop and ask the user
to fix the file instead of guessing.

Configuration can make review or verification stricter and can tune local
branch names, automated-mode limits, and whether the agent asks before a git
action. It never grants permission the client has not granted: `auto` removes the
extra chat question only. The client's permission prompt, the deny rules, and the
no-force rule still apply. Pull request creation, deploys, publishing, sending,
deleting data, waiving a failing check, and accepting a finding are never
configurable.

`qualityGates.regular` controls automatic audit, independent-review, check, and
try-guide behavior. The `tryGuide` key selects `/check guide`, which generates
instructions without performing verification or recording acceptance.
Audit and independent review default to `when-sensitive`, while check defaults
to `manual`. Try guide defaults to `when-testable`, which generates one small
`## Try it now` demonstration only when the work has a safe, meaningful direct
observation path. Sensitive or unusually broad work therefore selects audit and
independent review automatically; ordinary small work does not, unless check is
explicitly requested. Setting
independent review to `manual` disables that automatic selection, while an
explicit `/audit independent` remains available. The other conditional
modes are `when-sensitive` for audit (auth, payments, secrets, personal data,
migrations, destructive operations, external side effects, unusually broad
changes), `when-behavioral` for check (a done-when needs observed runtime
behavior), and `always`.

The independent reviewer is the read-only `reviewer` subagent installed by
`/agents` under `.opencode/agents/`. Its verdict is written to the spec's
`## Review` together with a hash of the reviewed tree. `/complete` refuses a
missing, stale (the tree changed after the review), or changes-requested
verdict.

`git.landing` controls only how `/complete` lands finished regular work. Its
default, `local-merge`, squash-merges into the default branch. Set it to
`pull-request` when finished branches should be pushed and opened as pull
requests for provider review.

These keys decide whether the agent stops to ask in chat, and what happens to the
work branch after a confirmed merge:

| Key | Values | Default | What it changes |
|---|---|---|---|
| `git.commit` | `ask`, `auto` | `ask` | The work commit in `/complete`. `auto` still shows the diff and the message, then commits without waiting |
| `git.merge` | `ask`, `auto` | `ask` | The local squash merge in `/complete`. `auto` still runs the pre-merge checks, then merges without waiting |
| `git.push` | `ask`, `auto` | `ask` | Pushing the default branch after a local merge, or the feature branch for a pull request. `auto` still needs a remote and an upstream, and never forces |
| `git.branchCleanup` | `ask`, `auto`, `keep` | `ask` | The local work branch after a confirmed merge. `auto` deletes it when its tree matches the merged result; `keep` leaves it and says so |

`auto` chooses the extra chat question, not the permission. The client's
permission prompt, the deny rules in `opencode.json`, and the no-force rule still
apply. If your client runs bash without a prompt, `auto` runs the action with no
further confirmation, so choose it only when that is what you want. Pull request
creation is separate: no key approves it, and it still needs its own explicit yes.
`/buildall` ignores `commit` and `merge` because running it is the approval, and
it never pushes whatever `git.push` says.

Annotated example. JSON does not allow comments, so copy the keys, not the lines
that start with `//`:

```jsonc
"git": {
  "landing": "local-merge",   // local-merge | pull-request
  "commit": "ask",            // ask | auto
  "merge": "ask",             // ask | auto
  "push": "ask",              // ask | auto
  "branchCleanup": "ask",     // ask | auto | keep
  "featureBranchPrefix": "feature/",
  "fixBranchPrefix": "fix/",
  "rollbackBranchPrefix": "rollback/"
}
```

Branch deletion only happens after a confirmed merge and a tree comparison, never
on unmerged work, never on the default branch, and never on a remote branch. A
squash merge leaves no ancestry link, so compare trees before deleting.

Force pushes (`--force*`, `-f`) and `reset --hard` are always denied, and the
subagents (`implementer`, `verifier`) cannot push at all. Branch prefixes
(`featureBranchPrefix`, `fixBranchPrefix`, `rollbackBranchPrefix`) set the local
branch names.

## Permissions

Two layers, both real:

| Layer | Enforced by | Read from | Example |
|---|---|---|---|
| Client gate | OpenCode | `opencode.json`, `.opencode/agents/*.md` | "Allow bash?" prompt |
| Pawang question | Skills | `.agents/pawang.json` | "Commit now?" in chat |

`auto` removes the Pawang question only. The client gate still applies, and no
key moves enforcement out of `opencode.json`.

| Key | Values | Default | Notes |
|---|---|---|---|
| `permissions.fileEdit` | `allow`, `ask`, `deny` | `allow` | Must match `opencode.json` edit `*`; the checker compares them |
| `permissions.secrets` | `deny` | `deny` | Fixed. The checker rejects `allow` |
| `permissions.network` | `allow`, `ask`, `deny` | `ask` | Declared only; no client mapping |
| `permissions.installDependency` | `allow`, `ask`, `deny` | `ask` | Declared only; installs still follow the agent fallback |
| `permissions.deploy` | `allow`, `ask`, `deny` | `ask` | Declared only; deploy skills still need an explicit yes |
| `permissions.destructiveGit` | `deny` | `deny` | Fixed. Force push and `reset --hard` |

The checker reads `pawang.json`, `opencode.json`, the agent frontmatter, and the
plugin list, prints the effective matrix, and exits non-zero on drift:

```sh
node <skill-dir>/scripts/permissions.mjs   # <skill-dir> = folder of the status skill
```

`/status` runs it and shows the `Permissions:`, `Git:`, and `Client:` lines. A
drift line names the two values that disagree, so the fix is obvious.

Annotated example:

```jsonc
"permissions": {
  "fileEdit": "allow",         // allow | ask | deny, must match opencode.json edit "*"
  "secrets": "deny",           // fixed
  "network": "ask",            // allow | ask | deny, declared only
  "installDependency": "ask",  // allow | ask | deny, declared only
  "deploy": "ask",             // allow | ask | deny, declared only
  "destructiveGit": "deny"     // fixed
}
```

`network`, `installDependency`, and `deploy` are declarations for the skills.
OpenCode cannot turn them into prompts on its own, so the skills stop before
those actions and the client rules still apply.

New projects default to one review packet after all small implementation steps
(`workflow.stepReview: "feature"`) with step checkpoint commits disabled. This
keeps the normal loop reviewable without repeating the full session context after
every step. Set `stepReview` to `every` when teaching, pairing closely, or working
on a high-risk change. That restores the per-step approval pauses. To fully
restore the previous workflow, including optional checkpoint prompts after an
approved step, also set `checkpointCommits` to `enabled`. These pairs are
Efficient and Guided choices, but only the two low-level settings are stored.
They can be changed at any time. Both styles end with an optional read-only code
walkthrough. Review cadence controls approval pauses, not whether the user can
ask for an explanation of the finished implementation.

`verification.logicTests` and `verification.uiEvidence` make logic tests or
browser evidence required. `logicTests: always` is the recommended start for a
project with logic; `when-configured` only enforces tests when a runner already
exists. `buildAll` limits `/buildall`: `maxFeatures`, `maxRepairAttempts`, and
`maxMinutes`, a wall-clock budget for the whole run (see Automation).

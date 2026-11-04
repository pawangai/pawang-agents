# Ruleset file for `/ci-deploy`

A GitHub ruleset is the lock: it makes the required checks pass before merge.
It matters most with Workers Builds, which deploys the default branch on every
push independently of GitHub Actions, so a red Verify cannot stop a merged
change from deploying. Only a ruleset can.

Applying a ruleset is a remote repository setting. Pawang never applies it. This
reference only covers writing the file and printing the commands for the user.
Write the file only when the user asks for the ruleset (or says yes when you
offer it at the end of a deploy or preview scope).

## Decide with the user (interview, light mode)

- Approvals required before merge (recommend 1 for a team, 0 for a solo project).
- Whether to allow a bypass actor for emergencies. The template has none, so
  nobody, including admins, can merge without the checks.
- Which checks to require, from the workflows that exist now.

## Template

Write `.github/rulesets/protect-default-branch.json`:

```json
{
  "name": "Protect <default branch>",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": <approvals>,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "<check name>" }
        ]
      }
    }
  ]
}
```

Replace the placeholders, remove the angle brackets, and validate the JSON
before showing it.

## Check names

`context` must equal the name GitHub shows for the check on a pull request: the
workflow job's `name:` (or its key when it has no `name:`). A name that never
reports blocks every merge, so confirm each one against a real run or the
workflow file. Typical names: the `/ci` Verify job, the `e2e` job from
`e2e workers`, and `Workers Builds: <worker>` posted by Cloudflare *(confirm
that this check can be required)*. Print the exact names in the report.

## Commands for the user

Print, do not run:

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/protect-default-branch.json
```

If a ruleset with the same name already exists (`gh api repos/{owner}/{repo}/rulesets`
lists them), the user updates it with `PUT repos/{owner}/{repo}/rulesets/<id>`
instead of creating a duplicate. Deleting head branches after merge is a
separate setting the user can enable in the repository settings. Say that the
file is local and changes nothing until the user runs the command.

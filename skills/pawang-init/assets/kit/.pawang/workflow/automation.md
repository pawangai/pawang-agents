## Automation

`buildall` is an explicit-only skill. Running `/buildall` approves, for that run only,
the spec of each feature already listed in `CONTEXT.md`, per-feature branches,
checkpoint and work commits, local squash merges, and deleting merged feature
branches. It never pushes, opens pull requests, deploys, publishes, sends,
changes remote services, waives a failing check, or decides unwritten product
questions. It requires `git.landing: "local-merge"` and stops at the first
decision, failed gate, or missing prerequisite. Its limits live in the
`buildAll` block of `.agents/pawang.json` (`maxFeatures`, `maxRepairAttempts`,
`maxMinutes`, `finalIntegrationAudit`). It ignores `git.commit` and `git.merge`
because running it is the approval, and it never pushes whatever `git.push` says.
It deletes a merged feature branch unless `git.branchCleanup` is `keep`.
`maxMinutes` is a wall-clock budget for
the whole run, default 120; when it expires, the run stops at the current
feature and reports, leaving a resumable state.

Deployment is also explicit. `/release` can prepare local provider config
(Cloudflare, Render, Vercel, Netlify, or another host) and run readiness checks,
but it must stop before deploy, remote service changes, push, or publish unless
the user gives a separate yes in the current chat.

`/ci-deploy` only writes workflow files locally (and, when asked, a ruleset JSON
file it never applies); it never sets GitHub secrets or environments, pushes,
deploys, creates previews, or deletes anything. `/ci-deploy audit workers`
writes nothing.

`/auth` and `/data` follow the same rule. They prepare local config and run
local checks, but stop before creating accounts, Access applications or
policies, databases, buckets, namespaces, or projects, running remote migrations,
setting remote secrets, or seeding or deleting remote data unless the user gives
a separate yes in the current chat.

---
description: Agent utama untuk pengembangan; mengorkestrasi subagent dan satu-satunya yang boleh commit.
mode: primary
permission:
  task:
    "*": deny
    explorer: allow
    implementer: allow
    verifier: allow
    reviewer: allow
  bash:
    "*": ask
    "git status*": allow
    "git diff*": allow
    "git log*": allow
    "git show*": allow
    "git add*": allow
    "git commit*": allow
    "git commit*--amend*": deny
    "git commit*--no-verify*": deny
    "git branch": allow
    "git branch --list*": allow
    "git worktree list*": allow
{{ALLOW_PROJECT}}
    "node .agents/skills/*/scripts/*": allow
    "node scripts/*": allow
    "git push*": ask
    "git -C * push*": ask
    "git push* -f*": deny
    "git reset*--hard*": deny
    "git*--force*": deny
{{BASH_SECRET}}
---

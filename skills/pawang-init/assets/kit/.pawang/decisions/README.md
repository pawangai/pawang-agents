# Decisions

One file per decision that outlives a single work item: architecture, provider
choice, a deliberate deviation from a convention. A decision that is still open
does not belong here.

File name: `NNNN-kebab-title.md`, starting at `0001`. Never renumber and never
delete a file; supersede it.

## Template

```markdown
# <title>

**Status:** Accepted
**Date:** YYYY-MM-DD

## Context

What forced the decision.

## Decision

One paragraph, present tense.

## Consequences

What becomes easier, what becomes harder, what is now forbidden.
```

## Rules

- Only `Status: Accepted` applies to new work. `Superseded by NNNN` and
  `Rejected` stay readable but do not bind.
- A decision that changes a hard rule also updates `AGENTS.md` or
  `.pawang/conventions/`, so the rule is found without opening this folder.
- Code review reads the Accepted decisions that touch the changed area.

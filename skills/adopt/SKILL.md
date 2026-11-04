---
name: adopt
description: Adopt Pawang into an existing brownfield codebase by surveying shipped behavior and creating CONTEXT.md, DESIGN.md, and .pawang/conventions/ from what the code really does, updating the AGENTS.md facts, and setting visibility. Use for /adopt or requests to bootstrap Pawang into an established app.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# adopt - create the standard files from an existing codebase

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    existing codebase  ->  [adopt]  ->  CONTEXT.md + DESIGN.md + .pawang/conventions/  ->  /context  ->  normal loop
    (already has code)     (survey +     (seeded from the real code; shipped        (validate)  (/feature,
                            interview)    features already checked off)                          /implement, ...)

The standard flow assumes a freshly scaffolded, near-empty app: you write `CONTEXT.md` and build forward. That doesn't fit a project that already has thousands of lines of working code. `/adopt` is the brownfield on-ramp: it reads what's already there, asks you only for what the code can't tell it (the *why* and the *roadmap*), and creates the same standard files the rest of the workflow expects, so an existing project joins the loop without you hand-writing everything.

**Reads:** the whole repository (manifests, lockfiles, scripts, configs, routes, UI and style files, tests, CI), existing `README.md`, and the template files `CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`, `AGENTS.md`.

**Writes:** `CONTEXT.md` (sections 1-8 and `## Features`), `DESIGN.md` when the app has a UI, `.pawang/conventions/`, and the project facts in `AGENTS.md` (the "What this is" paragraph and the Commands section). Never `.pawang/specs/`, code, or `README.md`: adopt checks boxes for features that already exist and creates no spec files for them (only a work item started by `/feature`, `/fix`, or `/rollback` gets one). `.gitignore` only in local-only mode (Step 5), with approval.

## Input

A description of what the project is, if the user offers one. Otherwise just the repository itself. No argument is required.

A prototype export is design evidence, not shipped behavior. If the repo holds a
`prototype/` or `prototypes/` folder, or a screen folder with route and screen
source, use it for `DESIGN.md` and `CONTEXT.md` section 5, but do not count its
screens as shipped features and do not check them off. Anything the source marks
`[ASUMSI]` is a proposal and is confirmed with the user. A `pawang-capture-*`
package is evidence as well; when the user wants a plan from it, point to
`plans-prototype` first, because capture output has no requirement IDs.

## Step 0 - confirm it's brownfield and safe

Prerequisite: the Pawang kit is already overlaid in the project (run `/pawang-init` first). This skill fills `CONTEXT.md`, `DESIGN.md`, `.pawang/conventions/`, and `AGENTS.md` from the codebase; it does not install them.

Look at `AGENTS.md`, `CONTEXT.md`, `DESIGN.md`, and `.pawang/conventions/`.

- If they are missing or still the shipped template placeholders, proceed.
- If a file already holds real content, that file is already adopted. Stop for it and offer to refresh specific sections instead of overwriting work the user owns. Other files that are still placeholders may proceed. `AGENTS.md` counts too: if it carries project-specific rules beyond the shipped kit, hand its update to `/agents-md` instead of rewriting it here.

Never overwrite filled-in content without explicit confirmation. Never run a framework scaffolder (Pawang is an overlay, never a generator).

Protect the project README:

- If the root `README.md` already looks like a real project README, leave it alone.
- If it is the copied Pawang workflow doc (for example it starts with `# AI Coding Pawang`), report it as obsolete overlay content and ask before replacing or removing it.
- Do not create or overwrite a root project README for a brownfield app unless the user explicitly asks. The project face belongs to the app, not the workflow.

## Step 1 - survey the codebase (read-only)

Read the repo to establish the facts. Change nothing in this step. Establish:

- **Stack and tooling** - language(s), framework(s), and versions, from the real manifest (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`, etc.). Note the package manager actually in use (lockfile).
- **Commands** - the real dev / build / test / lint scripts. These feed the `AGENTS.md` Commands section and, per the testing opt-in switch, decide whether a testing gate even applies.
- **Conventions in practice** - directory layout, component and file naming, styling approach, state management, data-fetching pattern, error handling. Read what the code *does*, not what a default template prescribes.
- **Testing reality** - is a runner configured and are there tests, or none? Be honest; don't describe a gate the project doesn't have.
- **Verification and CI** - note any combined verification command, GitHub remote, `.github/workflows/`, or external CI. Preserve what already exists.
- **Design in code** - whether there is a UI and where its tokens live (CSS variables, Tailwind or theme config, fonts, component library). Record real values and their source files.
- **What the app already does** - the shipped features, inferred from routes, pages, entry points, and modules. This becomes the *checked* part of `## Features`.
- **API contract** - whether an OpenAPI spec exists or is generated.

Keep notes; you'll turn them into the files in Step 3.

## Step 2 - interview for intent

Every question this skill asks the user goes through the `interview` skill: numbered questions, each with a recommended answer, asked in rounds. Any limit on question count stated here still applies, and an interview answer never replaces a separate approval gate.

The code reveals *what* and *how*, never *why* or *what next*. Ask a short set of questions (aim for three to five, not an interrogation) to fill the gaps:

- What is this project for, and who uses it? (the problem and the users)
- Is the stack and structure you found intentional, or are there parts they'd call legacy or want to change?
- What do you want to build next? (the unchecked items in `## Features`)
- Anything the survey got wrong or missed?

If the user already gave intent up front, skip what they've answered. Don't ask what you can read from the code.

## Step 3 - create the files

Write these, drawn from the survey (facts) and the interview (intent). Mark every inference you're unsure of with a clear `> TODO (confirm)` so the user can correct it rather than inherit a wrong guess.

- **`CONTEXT.md`** - fill sections 1-8 (problem, users, data, stack, UI/UX, deployment, usage model, monetization). Stack and data describe what *already exists*; problem, users, and roadmap come from the interview. In `## Features`, write the ordered checklist in the tracked format `- [x] N. **Name** - description` for shipped features and `- [ ] N. **Name** - description` for the roadmap. This is the brownfield difference: the list reflects reality, so most of an existing app starts checked, and `/status` and `/feature` work immediately because the next unchecked item is genuinely what's next. Do not create anything in `.pawang/specs/`; shipped features are simply checked, and a spec file appears only when `/feature` builds something.
- **`DESIGN.md`** - when the app has a UI, follow `<skill-dir>/../design/SKILL.md` Steps 1, 3, and 4: extract the real tokens from the code, write the Google DESIGN.md format, and lint it. Skip when there is no UI and say so in the report.
- **`.pawang/conventions/`** - rewrite the default to match the project's *actual* conventions from Step 1, not the shipped Hono/Drizzle defaults. The folder holds `README.md` (general rules, Writing, Comments) plus topic files (`api.md`, `database.md`, `auth.md`, `testing.md`, `ui.md`). Keep Writing and Comments; rewrite each topic file to what the code really does, and delete a topic file the project has no part of (for example `auth.md` for a project without auth), updating the table in `README.md`. `testing.md` must reflect the real testing state (the opt-in switch is a `test` command in `AGENTS.md`).
- **`AGENTS.md`** - replace the "What this is" placeholder with a one-paragraph description of the project, and fill the Commands section with the real dev / build / test / lint commands, so the rest of the workflow (and the testing gate) uses the project's actual scripts. Include `Verify` when a real combined command exists. Change nothing else in the file.

## Step 4 - point to optional CI setup

Do not create or change Verify commands or GitHub workflows during adoption. Report any verification command or CI already present. When equivalent automatic pull-request checks are absent, mention the optional standalone setup:

```text
Run /ci or $ci when you want automatic GitHub checks.
```

Explain that CI is not required to finish adoption. The `/ci` skill owns project-specific Verify and GitHub workflow setup.

## Step 5 - ask about Pawang visibility

Ask how the Pawang workflow files should be handled in git, unless the user already gave a preference:

```text
Pawang visibility?

1. Commit Pawang workflow files
   Portable. Best for teams and working across machines.

2. Keep Pawang workflow files local
   Adds .agents/, .opencode/, and CONTEXT.md to .gitignore.
   Keeps AGENTS.md, DESIGN.md, and .pawang/conventions/ public
   as ordinary project documents.
```

Recommend option 1 by default. If the user chooses option 2:

- Add this block to `.gitignore`, preserving existing entries:

  ```gitignore
  # Pawang local workflow files
  .agents/
  .opencode/
  CONTEXT.md
  ```

- Keep `AGENTS.md` tracked. It remains the lightweight public project guide for commands and conventions.
- Make `AGENTS.md` public-safe: keep the project description, commands, testing gate, and conventions pointers, but remove or avoid Pawang workflow explanations, hidden adapter paths, the workflow reference pointer, and skill lists that would expose the local-only workflow. Remove the `.pawang/specs/` row and any `CONTEXT.md` row details that describe workflow state.
- Explain that local-only mode hides the workflow contents from the repo, but the `.gitignore` names still reveal the ignored paths.
- Explain that workflow state (the spec in progress and findings live in `CONTEXT.md`) will not travel with the repo; another machine needs the workflow reinstalled or restored locally.
- Adoption runs right after the Pawang files were added to an existing repository, so they are more likely to be staged or committed already. If any of `.agents/`, `.opencode/`, or `CONTEXT.md` are already tracked, say `.gitignore` will not hide tracked files. Ask before running `git rm --cached -r .agents .opencode CONTEXT.md`, and only run it if the user explicitly approves. Never delete the local files.

## Step 6 - review gate, then hand off

Stop and show the user what you created, calling out:

- the **feature split** - what you marked shipped vs not, since that's the judgment most worth their eyes,
- every `> TODO (confirm)` you left,
- anything the survey and the interview disagreed on,
- the `DESIGN.md` lint result, or why it was skipped,
- verification command and GitHub checks status,
- the Pawang visibility choice, and a tracked-file warning if local-only mode was chosen after files were already tracked.

These files are ones the user *owns*. Have them review and adjust, then tell them to run `/context` to validate the checklist, and then start the normal loop with `/feature`. Do not promise a baseline commit here: `/context` offers it only for a project with no checked feature and no active spec, and an adopted codebase normally fails both conditions. If the user wants one, that is `/context`'s call to make and explain.

## Rules

- **Read-only until Step 3.** The survey changes nothing; only creation writes.
- **Reflect reality, don't prescribe.** `.pawang/conventions/` and `DESIGN.md` must match the code that exists. A project using Zustand and REST routes should not be handed standards about server functions and Drizzle just because that's the default.
- Follow and preserve the proportional-engineering contract in `AGENTS.md`; record only established usage or trust constraints and leave unknowns blank.
- **Never invent intent.** Ask for the why and the roadmap; mark anything inferred with `> TODO (confirm)`. Silent guesses about purpose are the main failure mode.
- **Don't clobber owned work.** If a file already has real content, confirm before touching it. Never run a scaffolder.
- **Be honest about testing.** If there's no runner, say testing is opt-in and not yet set up; don't describe a gate the project hasn't adopted.
- Keep `AGENTS.md` public in local-only mode unless the user explicitly asks for a more advanced setup.
- Do not untrack Pawang files with `git rm --cached` without a separate explicit approval.

## Formatting

Format the output to match the project's conventions in `AGENTS.md#communication`: concise, scannable markdown, with lists for enumerations and tables for matrices rather than dense paragraphs.

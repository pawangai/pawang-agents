---
name: design
description: Create or update DESIGN.md in the Google DESIGN.md format. Extracts real tokens from existing UI code, or interviews for taste when no UI exists, then lints the file and fixes errors. Use for /design, defining or refreshing the look and feel, or before building the first UI feature. Never edits code.
disable-model-invocation: true
---

> **Paths:** `<skill-dir>` is the folder that contains this `SKILL.md`; sibling skills are at `<skill-dir>/../<name>/`. Resolve it before running a script or opening another file. When the skill is installed inside the project (for example `.agents/skills/<name>/`), use the project-relative path so permission patterns match.

# design - write the visual system agents can follow

**Context reuse:** Reuse any required file already loaded in project instructions or the current session. Read it again only if absent, changed, or exact current bytes or line references are needed.

Where this sits in the workflow:

    CONTEXT.md section 5  +  UI code (if any)  ->  [design]  ->  DESIGN.md  ->  /feature, /implement
    (intent)               (real tokens)          (tokens + why)             (read it before any UI change)

`DESIGN.md` gives agents the exact tokens (front matter) and the reasoning (prose) so generated UI stays consistent instead of drifting to generic defaults. It describes the design; it does not implement it.

**Reads:** `CONTEXT.md` (sections 1, 2, 4, 5), existing `DESIGN.md`, UI source and style files (token and theme files, CSS variables, Tailwind config, font loading, component library), reference mockups in `<skill-dir>/../reference/assets/`, `design-tokens.md` or `design-tokens.json` from a `pawang-capture-*` package, `.pawang/conventions/` (UI section).

**Writes:** `DESIGN.md` only. Never code, `CONTEXT.md`, or `.pawang/conventions/`. Moving tokens into code is `/feature` or `/fix` work.

## Step 0 - decide the mode

Prerequisite: `CONTEXT.md` exists. Step 0 reads section 5 and Step 2 reads users and tone from it. If it is missing, stop and send the user to `/context`; do not invent the missing facts.

- `CONTEXT.md` section 5 says "No UI" (an API-only project): stop and say no `DESIGN.md` is needed. Create one only if the user insists.
- `DESIGN.md` missing, or still the template (name `Project Name`, placeholder colors): **Create**.
- `DESIGN.md` has real content: **Update**. Preserve the user's prose and decisions; change only what the survey or the user shows is wrong.

## Step 1 - survey existing UI (read-only)

If the project has UI code, establish the facts from it, with the source file for each:

- **Colors** - CSS custom properties (`:root`, `[data-theme]`), Tailwind `theme.extend` or `@theme`, theme files (`theme.ts`, `tokens.json`), component-library overrides. Note light and dark variants.
- **Typography** - families and how they load (`@font-face`, font links, framework font helpers), the size and weight scale, line heights, letter spacing.
- **Shape and space** - radius values, the spacing scale or the dominant spacing in use, breakpoints, container widths.
- **Depth** - shadows, borders, tonal layers.
- **Components** - buttons, inputs, cards, navigation: their padding, radius, colors, and states as the code really has them.

- **Capture tokens** - when a `pawang-capture-*` package is present, read its
  `design-tokens.md` and `design-tokens.json` first. Values marked `[ASUMSI]` are
  inferred, so carry them as `TODO (confirm)` until the user agrees.

Extract real values. Never invent a token when UI exists. If the code has no token layer (literal values scattered through components), record the dominant values, mark them `TODO (confirm)` in prose, and tell the user that consolidating them into tokens is a separate feature or fix.

## Step 2 - interview for taste (no UI yet, or gaps)

When there is no UI to read, or the survey leaves taste undecided, ask through the `interview` skill: numbered, each with a recommended answer derived from `CONTEXT.md` users and tone, in rounds. Cover: personality in three adjectives and reference products, density (airy or compact), light/dark, primary and accent color direction, type feel, shape language, and the components the first features need. Skip what the user or a mockup already answers; look up facts instead of asking.

## Step 3 - write DESIGN.md

Follow the Google DESIGN.md format (alpha). Front matter, then prose.

**Front matter (YAML between `---` lines):**

- `version: alpha` and `name` (required); `description` (optional)
- `colors` (required): quote every hex, `primary: "#1B2A41"`
- `typography` (optional): per style, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation`
- `rounded` and `spacing` (optional)
- `components` (optional): allowed properties are `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`
- Token references use the full dotted path in quotes: `"{colors.primary}"`. A bare `{primary}` does not resolve.
- Quote negative dimensions, `"-0.02em"`.
- Variants are sibling keys (`button-primary`, `button-primary-hover`), never nested.

**Prose sections**, in this order, omitting any that do not apply, never duplicating a heading: Overview (alias Brand & Style), Colors, Typography, Layout (alias Layout & Spacing), Elevation & Depth (alias Elevation), Shapes, Components, Do's and Don'ts.

The prose carries the why, because tokens alone do not transfer judgment: the role of each color, when each type style applies, and in Do's and Don'ts the specific patterns agents default to that this design rejects. Keep text and interactive boundaries at WCAG AA contrast (4.5:1 normal text, 3:1 large text and sole-cue boundaries) in every theme. Keep the file compact enough to be read whole; a design system too large to fit should move detail to a focused file registered in the `AGENTS.md` table.

## Step 4 - lint and fix

Run `npx -y @google/design.md lint DESIGN.md`. It validates structure, token references, and contrast, and adds nothing to the project's dependencies. On Windows use `npx -y -p @google/design.md designmd lint DESIGN.md`. Fix every error (broken references and duplicate headings; the linter reports a
contrast-ratio finding as a warning, so treat those as warnings and say so) and
re-run until it passes; report what remains. In Update mode, to check for
regressions, save the previous version outside the repo and run the tool's
`diff` command against it. Use `git show HEAD:DESIGN.md` when `DESIGN.md` is
tracked; when it is new and never committed, say the comparison is unavailable
and skip it rather than failing the step.

If `npx` cannot reach the registry, say so plainly and do a manual pass against the rules above; never claim the lint passed without running it.

## Step 5 - report

Show what changed and where each token came from (file for extracted values, interview answer for chosen ones). List every `TODO (confirm)`. Point out drift found between `DESIGN.md` and the code, and suggest `/sync` for ongoing checks. Optionally mention that the tool can export tokens (`export --format css-tailwind` or `dtcg`); exporting into code is a separate feature, not part of this skill. Do not commit.

## Rules

- **Never edit code.** This skill writes `DESIGN.md` only.
- **Reflect reality, then taste.** Extract before choosing; interview only for decisions.
- **Never invent intent.** Mark inferences `TODO (confirm)`.
- **Lint before done.** A `DESIGN.md` that fails lint is not finished.
- **Owner, with one exception.** Other skills ask for `/design` instead of
  editing this file; `/adopt` may also write it when reconstructing a design from
  an existing codebase (see the ownership table in `AGENTS.md`).

## Formatting

Format the output to match the project's conventions in `AGENTS.md#communication`: concise, scannable markdown, with lists for enumerations and tables for matrices rather than dense paragraphs.

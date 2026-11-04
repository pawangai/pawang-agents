# UI work in a feature spec

## Contents

- [When this applies](#when-this-applies)
- [Find the design source](#find-the-design-source)
- [Find the gap](#find-the-gap)
- [Turn the gap into build steps](#turn-the-gap-into-build-steps)
- [Downloads default to the browser](#downloads-default-to-the-browser)
- [Evidence and spec sections](#evidence-and-spec-sections)

## When this applies

The selected feature has user-visible screens. Read this file in the same batch as the
target lookup and the spec template. It only changes what goes into the spec; this
skill still writes no code and starts no server.

Creating the app (the framework, the build, the scripts) stays a pre-build step. The
UI foundation is not: tokens, shared layout, and base components are built inside the
first feature that needs them, as its first steps, and only as far as that feature
needs. They are not a separate pre-build item; a shell that users see as a
deliverable of its own is a normal feature.

If the UI stack (framework, rendering, styling) is named neither in `CONTEXT.md`
section 4 nor in the repository, stop and ask through `interview`. Do not pick a
framework here.

## Find the design source

Use the first source that exists, in the single batched repository inspection:

1. `DESIGN.md` at the repo root. Its front matter holds the tokens and its prose the
   rationale; it is the design system. Read it whole (it is short by design). Skip it
   only when it is still the unfilled template.
2. A path or reference the packet names (the `CONTEXT.md` feature line, section 5, the
   user).
3. prototype files, through the trace IDs on the target line (the Trace and design
   paragraph in `SKILL.md` says how to find and read them). For UI, the frames that the
   flow maps to come from `Flow -> frame` and the frame inventory.
4. A prototype source folder. Look only at root `prototype/` (or `prototypes/`),
   or a path the plans name. It counts as a prototype when it holds route or screen
   source (route files, a `screens/` folder, HTML, component files), not only
   Markdown. When the folder ships a frame manifest (a JSON file listing screen
   names, routes, and states), read the manifest first as an index, then open the
   screens this feature needs. An empty flow or edge list is not a flow: derive
   order from routes, names, and states, and never invent an edge. Read, for this
   feature's screens only: the token or theme CSS, the route and navigation files,
   the screen files, and the components they import.
5. Screenshots under `<skill-dir>/../reference/assets/`.
6. Nothing exists. Use `CONTEXT.md` section 5, and ask one `interview` round
   (recommended answers included) for what the feature needs and the text does not
   state: brand color, typeface, light or dark, density, platform, breakpoints. Put
   `/design` first in the handoff so the answers land in `DESIGN.md`; a deferred answer
   becomes a provisional choice recorded in the spec.

When two sources disagree, ask which wins. `DESIGN.md` wins over a prototype unless the
user says the prototype is newer; then hand off to `/design` to update it. A prototype shows what was designed. In
prototype files, anything marked `[ASUMSI]` or `[KEPUTUSAN DIBUTUHKAN]`, and EC rows with
basis `U`, is a proposal: confirm it, and mark tokens that the source calls provisional
as provisional.

A prototype is a visual reference, not production code. Do not carry over its mock
data, mock search or redirect tables, state-injection hooks, screen manifests, or
catalog and development routes.

## Find the gap

Inspect the repository once. The foundation is what this feature needs and the repo
lacks:

| Piece                                                                                 | Add a step when                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Tokens: one place defining color, type, spacing, and radius                           | `DESIGN.md` and the code define none and the screens use any |
| Shell: shared chrome these screens show (header, navigation, sidebar, footer, widths) | none exists and the design shows it                          |
| Components these screens use                                                          | a needed one is missing                                      |

Existing code wins. Reuse existing tokens, shell, and components; never rebuild or
restyle them.

## Turn the gap into build steps

Put foundation steps first, then screens: tokens, shell, components, screens. Each step
leaves the project working and ends with an observable `Done when`.

- **Size to the feature.** Define only the tokens its screens use. Make a shared
  component when it is used in two or more places here or the design names it a
  system component; otherwise keep it local to its screen. Add navigation entries only
  for pages that exist (no dead links), unless the packet requires the full navigation.
- **Copy values from the source.** When `DESIGN.md` exists, name its tokens by dotted
  path (`{colors.primary}`, `{spacing.md}`) and do not restate their values; the code
  implements them as CSS variables or the stack's equivalent. When a token the screens
  need is missing or wrong, list it under Open questions and hand off to `/design`:
  this skill and `/implement` never edit `DESIGN.md`. Without `DESIGN.md`, put a token
  table in the spec: token, value, source (file or frame). Never invent a palette.
- **Contrast.** For each text and background pair, in every theme, record the WCAG
  ratio: 4.5:1 for normal text, 3:1 for large text. Record the same, at 3:1, for a
  boundary or indicator that is the only visual cue identifying a control (an input's
  border, a focus ring). Decorative borders, and controls that also carry a visible
  text label, are exempt. A pair below its minimum is fixed with a different token
  (through `/design`) or listed under Open questions, never shipped silently. The
  `DESIGN.md` lint (`npx -y @google/design.md lint DESIGN.md`) already reports contrast
  for component token pairs; compute the rest. A brand color that passes as a
  fill can fail as text, so use separate fill and text tokens when it does. Compute it
  at implementation time with no dependency:

  ```
  node -e 'const l=c=>(c/=255)<=.03928?c/12.92:((c+.055)/1.055)**2.4,
  L=h=>{const n=parseInt(h.slice(1),16);return .2126*l(n>>16&255)+.7152*l(n>>8&255)+.0722*l(n&255)},
  r=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return(x+.05)/(y+.05)};
  console.log(r("#RRGGBB","#RRGGBB").toFixed(2))'
  ```

- **States.** Build the states the design shows for each component (default, hover,
  active, focus, disabled, loading, empty, error). Do not add states the design lacks.
- **Accessibility, where it applies.** Keyboard operation, a visible focus indicator,
  accessible names, headings and landmarks, meaning never carried by color alone, and
  `prefers-reduced-motion` honored when the design animates. Put each as an observable
  `Done when`, next to the existing label, association, announcement, and focus rules.
- **Responsive.** Use the design's breakpoints. `Done when` names the widths to check
  and that the page never scrolls sideways; wide tables and code scroll inside their
  own container.
- **Themes.** Only when the design has more than one. Redefine the tokens per theme;
  when the user's choice is remembered, apply it before first paint to avoid a flash.
- **Readable without JavaScript.** Only when the plans require it (content sites). Then
  the rendering approach must deliver the content as HTML; if section 5 does not settle
  that, ask.

## Downloads default to the browser

When a feature lets the user download or export a file, build it in the browser from
data the client already has: a `Blob`, an object URL, an anchor with `download`, then
revoke the URL. No new endpoint, no server-side file generation, no storage. Set the
MIME type and sanitize the filename; no sensitive data in the name.

Ask through `interview` before choosing a backend, recommending "in the browser", when
any of these holds: the data must not reach the browser or needs authorization the
browser cannot enforce, the file must be stored, shared by link, or audited, the size
may exceed what a browser can build, the format needs server-only tooling, or you are
unsure. If the user chooses a backend, record who may download, how that is authorized,
the size limit, and the error shape under Data / contracts. Never add one on your own.

## Evidence and spec sections

Follow `verification.uiEvidence`. Never start a dev server; ask the user to. A visual
claim needs a screenshot compared with the design frame, otherwise list it as not
verified; build output proves neither visual nor behavioral correctness. Add browser
tests only when a `Browser tests` command exists and they are proportionate.

In the spec:

- **Design reference:** the source, by path and frame number, plus the token source
  (`DESIGN.md`, or the file that holds them). Do not copy prototype source into
  `<skill-dir>/../reference/assets/` (images only).
- **Notes for the AI:** the prototype is a visual reference; do not port its mock data
  or tool scaffolding.
- **Open questions:** contrast failures, provisional tokens, conflicting sources.
- A prototype folder at the repo root that `## Repository layout` in `AGENTS.md` does
  not list draws a `/layout` audit warning. Tell the user to register it or move it;
  do not edit layout rules from here.

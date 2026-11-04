# UI conventions

Read before changing UI code. Index: [README.md](README.md).

## UI

Applies only when the project has a UI. These are defaults: keep or edit them.

- Colors, type scale, spacing, and radius are defined once as tokens (CSS variables or the stack's equivalent). Components use tokens, never literal values.
- Text and UI boundaries meet WCAG AA contrast in every theme: 4.5:1 for normal text, 3:1 for large text and for a boundary or indicator that is the only cue identifying a control.
- Interactive elements work by keyboard, show a visible focus indicator, and have accessible names. Meaning is never carried by color alone.
- Layout follows the design's breakpoints and the page never scrolls sideways; wide tables and code scroll inside their own container.
- Honor `prefers-reduced-motion` when anything animates.
- Downloads and exports are built in the browser from data the client already has (`Blob`, object URL, anchor with `download`, then revoke the URL). Add a backend only when the data must not reach the browser, needs authorization or storage, or needs server-only tooling, and ask before choosing it.
- A prototype or design-tool output is a visual reference, not production code. Do not carry over its mock data or tool scaffolding.

# Deriving the two plans from the four prototype files

Read this when the user provides (or the project contains) the output of the `plans-prototype` skill:

| File | What it holds |
| --- | --- |
| `01-PRD.md` | Summary, problem, goals (G) and non-goals, roles, target architecture, shell, module map and redirects, conflicts (C), requirements (FR-n with P0-P2, NFR-n), migration strategy, risks, open decisions (Q), success metrics |
| `02-user-flows.md` | Mermaid flows: navigation, auth, status lifecycles (enums copied from code), cross-module flows. Screens are referenced by their original numbers (`#120`) |
| `03-interface-designs.md` | Shell spec, flow-to-frame table, frame inventory with new routes |
| `04-edge-cases.md` | Rows `EC-XX-NN | scenario | expected behavior | frame | Sev | Basis`, with Sev K/T/S/R and Basis P (seen in the prototype) or U (proposed) |

A partial set is fine (a lone PRD is common). Say which files are missing and work from what exists. Never guess the content of a file the user mentioned but did not provide; ask for it.

## Contract check

`plans-prototype` guarantees the headings below. Before mapping anything, check each
file that was provided: a heading line (any level) should contain the text,
case-sensitive, and a number or letter in front of it is fine. If the content is
there under a similarly worded heading, use it and say which heading you used.
If it is not there, tell the user once and work from what exists. Never invent
the content of a missing section.

<!-- plans-prototype-contract:v1 -->
| Doc | Heading contains | Used for |
| --- | --- | --- |
| `01-PRD.md` | `Ringkasan` | problem and summary in CONTEXT.md |
| `01-PRD.md` | `Tujuan dan non-tujuan` | features, and what is deliberately not built |
| `01-PRD.md` | `Pengguna dan peran` | users in CONTEXT.md |
| `01-PRD.md` | `Requirement fungsional` | candidate features in CONTEXT.md Features (FR-n, P0 to P2) |
| `01-PRD.md` | `Requirement non-fungsional` | constraints and rollout readiness (NFR-n) |
| `01-PRD.md` | `Keputusan terbuka` | interview questions (Q-n) |
| `01-PRD.md` | `Metrik keberhasilan` | success metrics in the problem section |
| `02-user-flows.md` | `Daftar flow` | flow IDs for the Features trace |
| `02-user-flows.md` | `F0 -` | the navigation flow, always present |
| `03-interface-designs.md` | `Flow -> frame` | flow to frame mapping |
| `03-interface-designs.md` | `Inventaris frame` | frame inventory |
| `04-edge-cases.md` | `Kerjakan dulu (blocker desain)` | build order in CONTEXT.md Features |
| `04-edge-cases.md` | `Butuh keputusan produk sebelum didesain` | decisions to confirm |
<!-- /plans-prototype-contract -->

Files written before this contract may use older labels. Accept them with the same
meaning: `Blocker desain` for `Kerjakan dulu (blocker desain)`, `Butuh keputusan
produk` for `Butuh keputusan produk sebelum didesain`, and the decision markers
`[KEPUTUSAN]`, `[perlu keputusan]`, `[kebijakan perlu ditentukan]` for
`[KEPUTUSAN DIBUTUHKAN]`. With no `Daftar flow` heading, take the flow IDs from the
`F<n> -` headings. Sections that exist only for some project types
(`Masalah (kondisi saat ini)`, `Arsitektur target`, `Shell`, `Pemetaan modul`,
`Konflik yang harus diselesaikan`, `Strategi migrasi`, `Risiko dan trade-off`,
`Sitemap`, `Model konten`, `Funnel`) may be absent: skip their mapping rows.

## Facts versus decisions

The prototype files mix evidence with proposals. The plans are the user's decisions, so sort every item before using it:

- **Facts, carry over as written:** roles and enums that exist in code, route and screen numbers, measured counts, conflicts backed by screen numbers, edge cases with Basis P, anything marked **Wajib** (contradicts a policy written in the code).
- **Proposals, confirm before they become plan content:** anything marked **[ASUMSI]**, **[KEPUTUSAN DIBUTUHKAN]**, "Usulan", open decisions (Q1...), and edge cases with Basis U. Unconfirmed, they go into the plan as `TBD: <what is unknown>`, never as a requirement.

Confirm proposals with the `interview` skill: each open decision becomes a numbered question and the prototype recommendation becomes the recommended answer. Skip questions the files already settle. If the user's answer contradicts a file, the user wins, but show the contradiction once so the file can be fixed too.

## Mapping to CONTEXT.md sections 1-8

| Section | Fill from |
| --- | --- |
| 1. Problem | PRD summary and current-state problem (with its code evidence), success metrics (now to target) |
| 2. Users | PRD roles. Only roles seen in code; keep the "not a final list" note |
| 3. Features | PRD FR-n grouped by priority, goals and explicit non-goals (exclusions matter, keep them), sitemap and funnel when present, flow behavior (status enums and transitions, flow IDs), edge cases that change what a feature must do (Sev K and T first), resolved conflicts |
| 4. Data | Entities and ownership from the module map, content model, and lifecycles; single-source-of-truth decisions for duplicated data |
| 5. Tech | Target architecture, module rules, manifest contract, route namespaces and redirect table, risks and trade-offs |
| 6. Monetize | Not covered by prototype. Ask or leave `TBD` |
| 7. UI/UX | Shell spec (rail, second panel, layout modes, widths), responsive and accessibility rules from `03` |
| 8. Deployment | Migration strategy phases and "done when" criteria, NFRs about rollout |
| 9. Usage model and constraints | Only confirmed facts: **Wajib** policies, NFRs the user confirmed (security, compliance, scale). Never an unconfirmed assumption |

Do not paste the Mermaid diagrams or the frame inventory into the plan. Summarize in text with exact enum names and point to the file (for example "see `02-user-flows.md`, F3"). The detailed files stay the source for later `/feature` specs, so record in CONTEXT.md section 7 where they live (their path in the repo). If they were only attached to the chat and are not in the project, tell the user to add them to it (recommend `prototype/` at the repo root); until then the trace IDs on Features lines point nowhere.

## Mapping to CONTEXT.md Features

1. Take FR-n as the candidate features. Cut each to a feature-sized outcome; merge tiny FRs that ship together and keep large ones whole (splitting happens later at `/feature`).
2. Order by: P0 before P1 before P2, then dependencies (the shell and auth before modules that live inside them), then the migration strategy's phase order, then the "Kerjakan dulu (blocker desain)" list from `04`.
3. A consolidation project makes each module's migration into the shell a feature-sized item. Shared pieces the modules depend on (shell, single auth and account, shared primitives) are items too when users see them; pure scaffolding is not.
4. P1 and P2 work goes under a `## Post-MVP` heading when the user's MVP cut says so.
5. Add traceability at the end of the line so `/feature` can find the detail:
   `- [ ] 3. **Booking lifecycle** - request, approve, process refunds (FR-4, flow F3, EC-BK-01..04)`
6. Finish with the deployment readiness item.

## Pitfalls

- Numbers (frame counts, copies of the account page, screens per module) must match across both plans and the source files. If a count differs between two prototype files, flag it rather than picking one.
- `[KEPUTUSAN DIBUTUHKAN]` items that block build order (for example which module owns a duplicated feature) must be settled before the build plan is final. Park the rest as `TBD`.
- prototype documents are written in Indonesian by default; write the plan bodies in the user's language and keep the section headings in English.

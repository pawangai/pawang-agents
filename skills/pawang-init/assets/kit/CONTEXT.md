# Project Context

<!--
The single source of truth for what to build. You own sections 1-8 and the Features list: write them directly or develop them in any AI conversation, then run `/context` to validate and normalize (it numbers the features and adds checkboxes). Each work item's spec lives in `.pawang/specs/`; `/complete` only checks boxes here. Remove these comments once filled in.
-->

## 1. Problem

What problem does this project solve, and what is its main purpose?

## 2. Users

Who is this for? e.g. new programmers, college students, single people.

## 3. Data model

What is stored, as concrete models: real fields, types, and relationships, derived from the features that use them, not a vague list. Note anything sensitive. Lock shapes that later features depend on, and say so.

### <Model>

- `field` (type) - what it is
- relationship to <other model>

## 4. Stack

The stack this project uses, one line each on what it is for, e.g. **Hono** - API on Cloudflare Workers; **D1 + Drizzle** - storage; **Better Auth** - sessions.

Name the auth approach (Better Auth, Cloudflare Access, other) and each data store (database such as D1, Neon, or Supabase; object storage such as R2; key-value such as KV) and its ORM (Drizzle or other). `/auth` and `/data` use these choices.

## 5. UI/UX

One short paragraph on the look and feel, then the main routes or screens (`/<route>` - what is there). Tokens and rationale live in [DESIGN.md](DESIGN.md); run `/design` to create or update it. Write "No UI" for an API-only project.

## 6. Deployment

Target host if known (Cloudflare, Render, Vercel, Netlify). Include app type, build command, start command or output directory, env var names, database or storage needs, workers or cron jobs, health check path, and domain notes. For Cloudflare, note bindings (D1, R2, KV) and whether Cloudflare Access gates any hostname.

## 7. Usage model and constraints (optional)

Record only what is known and relevant: expected user count and scale; local, internal, or internet-facing; trusted or adversarial users; single-tenant or multi-tenant; required security, compliance, availability, or audit constraints; explicit non-requirements. Leave this unanswered when those facts are not established. Unknown does not mean enterprise, hostile, multi-tenant, or single-user.

## 8. Monetization (optional)

How will this make money? e.g. ads, memberships.

## Features

High level, one line each, in rough build order. Flag the headline feature. Scaffolding the app and prototyping its look are pre-build steps, not features. Shared UI foundation (tokens, shell, base components) is built inside the first feature that needs it. Do not renumber completed features; commit trailers and spec file names refer to these IDs.

- [ ] 1. **Feature one** - description
- [ ] 2. **Feature two** - description

## Open questions (optional)

TBDs and contradictions between the sections above. Resolve them in the sections, then run `/context` again. Delete this section when empty.

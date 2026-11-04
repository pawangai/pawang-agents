# Conventions

> Your conventions. Edit these once to match your stack. The defaults below
> assume a Hono API on Cloudflare Workers + TypeScript + Zod/OpenAPI + Drizzle ORM
> (D1 by default) + Better Auth or Cloudflare Access + Bun (package manager,
> script runner, and `bun test`) + Wrangler (dev, build check, deploy), with no Vite; change or trim anything
> that doesn't fit your project.
>
> Review this file and the Commands section of `AGENTS.md` against the real
> project stack before `/context`.

## Where each topic lives

| Read before | File |
|---|---|
| adding or changing an endpoint | [api.md](api.md) |
| changing schema, queries, R2, or KV | [database.md](database.md) |
| touching auth, sessions, or access policy | [auth.md](auth.md) |
| writing tests or declaring work done | [testing.md](testing.md) |
| changing UI code | [ui.md](ui.md) |

The sections below apply to every change.

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces or Zod-inferred types for all request bodies, API responses, and data models
- Use type inference where obvious, explicit types where helpful
- Type Worker bindings once (`Bindings`) and pass them through `Hono<{ Bindings: Bindings }>`; generate binding types from the Wrangler config when the project supports it

## File Organization

- App entry: `src/index.ts`
- Routes: `src/routes/[feature].ts`
- Zod and OpenAPI schemas: `src/schemas/[feature].ts`
- Services (business logic): `src/services/[feature].ts`
- Middleware: `src/middleware/[name].ts`
- DB schema: `src/db/schema/[table].ts`; client factory in `src/db/index.ts`
- Auth: `src/lib/auth.ts` (Better Auth) or `src/middleware/access.ts` (Cloudflare Access)
- Types: `src/types/[feature].ts`
- Lib/Utils: `src/lib/[utility].ts`
- Worker config: `wrangler.jsonc`; migrations in `drizzle/`; generated spec in `openapi.json`
- In a monorepo, import across packages through workspace aliases, never relative `../../` paths

## Naming

- Files: kebab-case (`order-items.ts`)
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces/Zod schemas: PascalCase for types, camelCase with a `Schema` suffix for Zod schemas (no `I` prefix)
- Routes: plural nouns, lowercase, kebab-case (`/v1/order-items`)

## Error Handling

- No empty `catch`; catch only where the code can add context or recover, otherwise let `app.onError` handle it
- Log errors once, at the boundary, with request context
- Return user-safe messages in `error.message`; never leak stack traces, SQL, or provider errors to the client
- Map validation failures to 400 or 422 with field-level detail from Zod

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.

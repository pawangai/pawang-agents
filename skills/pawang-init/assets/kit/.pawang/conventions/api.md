# API conventions

Hono API conventions. Read before adding or changing an endpoint. Index: [README.md](README.md).

## Hono API

- Hono on Cloudflare Workers; the entry file exports the app as the default `fetch` handler
- One router per feature, mounted in the entry file; handlers stay thin and call a service function
- Spec first: define each endpoint with `@hono/zod-openapi` (`createRoute`) before writing its handler. The generated `openapi.json` is the single source of truth for web, mobile, and QA clients. Adding the package needs explicit approval
- Validate every input at the boundary with Zod (params, query, headers, JSON body) and declare response schemas in the route definition
- Standard response shape: `{ success: true, data }` or `{ success: false, error: { code, message } }`, with correct HTTP status codes
- No breaking changes to a live contract; add a new version path (`/v1`, `/v2`) instead
- Centralize errors in `app.onError` and `app.notFound`; services throw typed errors, handlers do not build error responses by hand
- CORS with an explicit origin allow-list from env, never `*` on authenticated routes
- Read configuration from `c.env`, never at module scope; no hardcoded URLs, secrets, or account ids
- Workers runtime: no per-request state in module-level variables; use `c.executionCtx.waitUntil` for work that outlives the response; Node-only APIs need the `nodejs_compat` flag and approval
- External calls (`fetch`, provider SDKs): timeout via `AbortSignal.timeout`, retry with backoff only for idempotent calls, degrade gracefully when the dependency is non-critical
- Mutating endpoints accept an idempotency key where a retry could duplicate a side effect; rate-limit public endpoints
- Use the project logger with levels and structured metadata (`requestId`, `userId`, `error`); never log secrets or PII; no bare `console.log`

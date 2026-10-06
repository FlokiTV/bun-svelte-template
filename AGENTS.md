# Agent Instructions

Read this file before changing code. Read `PROJECT.md` whenever a task changes product behavior. For architectural changes, read the relevant ADR under `docs/adr/`.

## Fast context

- `ai/project.json`: compact machine-readable stack and constraints.
- `bun run context`: generates `.ai-context.md` with current modules, ADRs, env names and commands.
- `ai/examples/`: canonical code shapes. Copy patterns before inventing new ones.
- `ai/tasks/`: task templates with acceptance criteria.

## Core architecture

- `apps/web`: Svelte 5 + Rsbuild/Rspack in **static SPA mode**. No SSR. No backend code.
- `apps/api`: Bun + Elysia. All business rules and authorization belong here.
- `packages/contracts`: framework-neutral public TypeScript contracts.
- `packages/test-utils`: deterministic fixtures/helpers shared by tests only.
- PostgreSQL/Drizzle is available when a feature needs persistence.
- Frontend and API are independently deployable.

## Non-negotiable rules

1. Do not add SSR, server-rendered frontend routes, backend handlers, or Node-only runtime code to `apps/web`.
2. Do not make `apps/web` access PostgreSQL, secrets, Drizzle, API internals or Node-only modules.
3. Do not put business rules or authorization in Svelte components.
4. Every API input requires runtime validation at the transport boundary.
5. Every new API feature belongs under `apps/api/src/modules/<feature>`.
6. Prefer explicit, boring code over clever abstractions.
7. Keep modules small enough to understand locally.
8. Behavioral changes require tests. Security-sensitive fixes require regression tests.
9. Use Biome. Do not introduce ESLint or Prettier.
10. UI is mobile-first. Base styles target small screens.
11. Avoid adding dependencies unless platform APIs/current dependencies are insufficient.
12. Never serve the web app from Bun/Elysia.
13. Use stable error codes from `apps/api/src/core/errors.ts`; do not invent ad-hoc error envelopes.
14. Never log passwords, JWTs, cookies, authorization headers or secrets.
15. Do not modify an accepted architecture decision silently; add/supersede an ADR.
16. Do not claim completion while `bun run verify` is failing. If execution is impossible, state the exact blocker.
17. Runtime env access belongs only in `apps/api/src/config.ts` / `@vibe/config`; modules must not read `Bun.env` or `process.env`.
18. API routes must not import database clients directly. Use service/repository boundaries.
19. Do not use `console.*` in API source. Use the structured logger.
20. Use `fetchWithTimeout` or a dedicated client for external HTTP calls.
21. Never edit an already-applied migration to change behavior; create a new migration.
22. Protected OpenAPI operations must declare the `bearerAuth` security scheme.

## API module shape

Preferred shape:

```text
modules/example/
├── example.model.ts
├── example.service.ts
├── example.repository.ts   # only when persistence is needed
├── example.routes.ts
└── example.test.ts
```

- `model`: schemas and module-specific types.
- `service`: business rules, framework-light.
- `repository`: persistence only.
- `routes`: HTTP/WebSocket transport only.
- `test`: behavior and regressions.

Use `bun run gen:module <name>` to create and register a baseline module.

## Frontend shape

- Reusable UI: `src/lib/components`.
- API access: `src/lib/api`.
- Shared browser state: `src/lib/state` only when needed.
- Pages orchestrate components; avoid giant page components.
- Prefer native browser APIs and progressive enhancement.
- Use `bun run gen:component Name` when useful. Add a client router only when the product actually needs navigation.

## Error and observability contract

- API errors use `{ error: { code, message, requestId } }`.
- Every request receives/returns `x-request-id`.
- Logs are structured JSON and must be safe for production collection.

## JWT auth module

- The optional module is documented in `docs/AUTH.md`.
- Protected routes use the Elysia `auth: true` macro.
- Access tokens are not persisted in browser localStorage in the provided architecture.
- Roles/permissions belong in dedicated authorization code, not token parsing.

## Completion gate

Before handing work back, run:

```bash
bun run verify
```

`verify` checks architectural constraints, Biome, TypeScript, tests and builds.

For user-facing navigation or critical journeys, also run:

```bash
bun run test:e2e
```

Use `bun run doctor` when the environment or repository state is suspicious. Use `DOCTOR_DB=1 bun run doctor` when database connectivity matters. Read `docs/OPERATIONS.md` and `docs/SECURITY.md` before changing operational or security infrastructure.

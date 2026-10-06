# Architectural decisions

Accepted decisions now live as individual ADRs under `docs/adr/` so agents can read only the decision relevant to a task.

Current index:

- `0001-static-svelte.md` — Svelte frontend is static-only; no SSR.
- `0002-elysia-over-bun-router.md` — Elysia is the primary API framework on Bun.
- `0003-postgresql-drizzle.md` — PostgreSQL + Drizzle is the persistence baseline.
- `0004-jwt-auth.md` — the repository includes an optional self-hosted JWT auth module.
- `0005-contracts-boundary.md` — shared contracts stay framework-neutral.
- `0006-ai-completion-gate.md` — `bun run verify` is the objective completion gate.

Do not edit an accepted decision in place to justify a new architecture. Add a new ADR that explicitly supersedes the old one.

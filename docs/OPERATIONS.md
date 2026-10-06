# Operations

## Endpoints
- `GET /health`: liveness; does not depend on PostgreSQL.
- `GET /ready`: readiness; checks PostgreSQL when `DATABASE_URL` is configured.
- `GET /meta`: non-secret runtime metadata.
- `GET /openapi`: Scalar UI.
- `GET /openapi/json`: raw OpenAPI spec.

## Graceful shutdown
SIGINT and SIGTERM stop accepting new connections and close PostgreSQL before exit. `SHUTDOWN_TIMEOUT_MS` bounds the shutdown window.

## Local PostgreSQL
```bash
bun run db:up
bun run db:migrate
bun run db:seed
bun run db:down
bun run db:reset
```
`db:reset` destroys the local Docker volume. Do not point it at shared or production infrastructure.

`db:migrate` first ensures the `anon` and `authenticated` roles required by the initial security migration exist as `NOLOGIN` roles. Supabase already provides these roles; vanilla PostgreSQL requires a migration user that can create them on first setup.

## Supabase test database

Supabase is used only as a PostgreSQL provider in this template. Authentication remains the self-hosted JWT module in `apps/api`; the browser never talks directly to Supabase.

For a local Supabase stack (Docker required):

```bash
bun x supabase start
```

The default local database created by `supabase init` is:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Set that value in `apps/api/.env`, then apply and validate the Drizzle migrations:

```bash
bun run db:migrate
bun --filter '@vibe/api' db:check
```

Stop the local stack with:

```bash
bun x supabase stop
```

For Supabase Cloud, copy the project PostgreSQL connection string into `DATABASE_URL` and run the same `db:migrate` and `db:check` commands. Do not commit project credentials.

## CI database gate
The GitHub Actions `database` job starts PostgreSQL 17, performs a frozen install, applies all migrations from an empty database, checks connectivity, and runs the real auth repository flow (`test:db`). This catches migration/repository regressions that mocked unit tests cannot detect.

## Outbound HTTP
Use `fetchWithTimeout` from `apps/api/src/core/http-client.ts` for external services instead of raw long-running `fetch` calls.


## Dependency audit
The quality job runs `bun run audit:ci` and fails on high/critical advisories. Lower-severity tooling advisories are documented in `docs/SECURITY.md`.

## WebSocket baseline
`/ws` is an example endpoint. Connection count, maximum message bytes, and per-connection message rate are process-local controls configured through `WS_MAX_CONNECTIONS`, `WS_MAX_MESSAGE_BYTES`, `WS_MESSAGE_RATE_MAX`, and `WS_MESSAGE_RATE_WINDOW_MS`. Multi-instance deployments that require global enforcement need a shared coordination layer.

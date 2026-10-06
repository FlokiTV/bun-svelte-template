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

## Outbound HTTP
Use `fetchWithTimeout` from `apps/api/src/core/http-client.ts` for external services instead of raw long-running `fetch` calls.

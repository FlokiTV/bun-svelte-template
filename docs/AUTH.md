# JWT Authentication Module

The template includes an optional, self-hosted JWT authentication module under `apps/api/src/modules/auth`.

## Design

- Email/password credentials are stored in PostgreSQL.
- Passwords use Bun's asynchronous `Bun.password` API with Argon2id.
- Access tokens are short-lived JWTs sent as `Authorization: Bearer <token>`.
- Refresh tokens are longer-lived JWTs stored in an HttpOnly cookie.
- Refresh sessions are persisted in PostgreSQL so logout and refresh-token rotation can revoke them.
- Rotated refresh sessions belong to a session family. Replaying an already-rotated refresh token revokes active descendants in that family.
- Expired session rows are pruned periodically; the interval is configurable through `AUTH_SESSION_PRUNE_INTERVAL_SECONDS`.
- Access tokens remain stateless and are intentionally not checked against the database on every request.
- Refresh tokens rotate on every successful refresh.
- The browser helper keeps the access token in memory instead of localStorage.

## Endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

`/me` shows the canonical protected-route pattern:

```ts
.get("/me", ({ auth }) => ..., {
  auth: true,
})
```

## Required environment

Set a PostgreSQL connection and unique high-entropy secrets:

```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me-too
JWT_ISSUER=vibe-api:production
JWT_ACCESS_AUDIENCE=vibe-api:web
JWT_REFRESH_AUDIENCE=vibe-api:refresh
```

`iss` and `aud` are embedded in both token types and validated when tokens are consumed. Keep issuer/audience values environment-specific when multiple services or deployments share infrastructure.

Generate secrets with a cryptographically secure tool. Never commit real secrets.

## Defaults

```text
access token:  15 minutes
refresh token: 30 days
cookie:        HttpOnly, SameSite=Lax, Path=/api/v1/auth
```

Production HTTPS should set `AUTH_COOKIE_SECURE=true`.

## Database

The auth module adds:

```text
users
auth_sessions
```

Generate and apply a migration before using the endpoints. `db:migrate` prepares the `anon` and `authenticated` NOLOGIN roles only when they are absent, preserving compatibility with both vanilla PostgreSQL and Supabase security migrations:

```bash
bun --filter '@vibe/api' db:generate
bun --filter '@vibe/api' db:migrate
```

## Frontend

`apps/web/src/lib/auth/client.ts` provides a minimal framework-independent client for login, register, refresh, logout, `/me`, and authenticated fetches.

The client intentionally:

- keeps the access token only in memory;
- rejects authenticated requests whose URL origin differs from the configured API origin before attaching the Bearer token or cookies;
- coalesces concurrent `401` responses into a single refresh request, then retries each original request at most once;
- clears local auth state immediately on logout and prevents an in-flight refresh from restoring a token after logout;
- preserves the API error contract through `ApiError`, including HTTP status, stable error code, message, and request ID.

It deliberately does not provide login screens or product-specific session UI.

## Security notes

- Do not store the access token in localStorage in the provided pattern.
- Keep authenticated browser calls scoped to the configured API origin; do not bypass `authFetch` with ad-hoc Bearer handling.
- Keep refresh cookies HttpOnly and scoped to `/api/v1/auth`.
- Register/login/refresh/logout requests with a browser `Origin` header are accepted only when that origin is in the configured CORS allow-list; server-to-server requests without `Origin` remain supported.
- Restrict CORS to known `http`/`https` origins. Wildcards and origin values containing a path/query/fragment are rejected at startup.
- Use HTTPS in production.
- Add rate limits to register/login/refresh before exposing the application publicly.
- Add email verification, MFA, account suspension, password recovery, and audit controls as product requirements demand them; they are not silently assumed by this generic template.

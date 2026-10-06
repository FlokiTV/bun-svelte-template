# JWT Authentication Module

The template includes an optional, self-hosted JWT authentication module under `apps/api/src/modules/auth`.

## Design

- Email/password credentials are stored in PostgreSQL.
- Passwords use Bun's asynchronous `Bun.password` API with Argon2id.
- Access tokens are short-lived JWTs sent as `Authorization: Bearer <token>`.
- Refresh tokens are longer-lived JWTs stored in an HttpOnly cookie.
- Refresh sessions are persisted in PostgreSQL so logout and refresh-token rotation can revoke them.
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
```

Generate secrets with a cryptographically secure tool. Never commit real secrets.

## Defaults

```text
access token:  15 minutes
refresh token: 30 days
cookie:        HttpOnly, SameSite=Lax
```

Production HTTPS should set `AUTH_COOKIE_SECURE=true`.

## Database

The auth module adds:

```text
users
auth_sessions
```

Generate and apply a migration before using the endpoints:

```bash
bun --filter '@vibe/api' db:generate
bun --filter '@vibe/api' db:migrate
```

## Frontend

`apps/web/src/lib/auth/client.ts` provides a minimal framework-independent client for login, register, refresh, logout, `/me`, and authenticated fetches.

It deliberately does not provide login screens or product-specific session UI.

## Security notes

- Do not store the access token in localStorage in the provided pattern.
- Keep refresh cookies HttpOnly.
- Restrict CORS to known frontend origins.
- Use HTTPS in production.
- Add rate limits to register/login/refresh before exposing the application publicly.
- Add email verification, MFA, account suspension, password recovery, and audit controls as product requirements demand them; they are not silently assumed by this generic template.

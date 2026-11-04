# SaaS launch readiness — not a release authorization

This repository is still a **product-agnostic SaaS foundation**. The deployment
reference is for a single Bun API, static Svelte frontend, Caddy TLS and an
**externally managed PostgreSQL**. Do not open paid sign-ups based solely on CI.

## Implemented and tested

- API authentication with short-lived Bearer JWTs, HttpOnly refresh cookie,
  replay protection, session revocation, and cross-tab coordination.
- `/account` browser interface for sign-in, development-only registration (production signups default to closed), session restoration
  on reload and logout; protected account identity only, **no business features**.
- Static frontend; `/api/v1` requests use the same HTTPS origin in the reference deployment.
- Reference Docker stages and Caddy reverse proxy; the API isn't exposed
  directly to the public network.
- `/health`, `/ready`, error sanitation, rate limiting, security headers,
  test isolation and CI with PostgreSQL integration and Playwright.
- Operational backup helper in `deploy/backup-postgres.sh`.

## Blockers before public / paid access

- [ ] Define in `PROJECT.md` the SaaS problem, customer, core workflow,
      MVP scope, data model, tenancy boundary and authorization model.
- [ ] Implement and test the actual product feature(s), onboarding, account
      management and support contact; currently `/account` is a starter UI.
- [ ] Decide billing model, payment provider, prices, tax, invoice/refund flows
      and access entitlement enforcement. No payment integration exists yet.
- [ ] Decide identity lifecycle: transactional email provider, email
      verification, secure password reset and abuse prevention (CAPTCHA,
      invitations or equivalent). Public registration should remain closed
      until these decisions are implemented.
- [ ] Write/review privacy notice, terms, retention/deletion requests, data
      processor contracts, DPA and lawful basis under applicable law (including
      LGPD where relevant). No legal approval is implied by this checklist.
- [ ] Select production host, domain, DNS, PostgreSQL provider, uptime
      monitoring, log/alert destination, abuse controls and support channel.
- [ ] Enable encrypted offsite backups and point-in-time recovery at the
      database provider. Perform a real test restore and document RPO/RTO.
- [ ] Verify production secret management, HTTPS, API origin, CORS, cookies,
      deployment rollback, dependency patches and retention of audit logs.
- [ ] Run a staging review with representative accounts, mobile usability,
      accessibility and realistic load before inviting paying customers.

## Single-instance deployment reference (after blockers above)

The repository's example `deploy/compose.yaml` assumes a single machine with
Docker Compose v2, inbound ports 80/443, a managed PostgreSQL reachable from
the API and a real domain with DNS pointing to the host. It **does not**
provision backups, monitoring, managed database or a billing platform.

1. Make a **private**, untracked `deploy/.env.production` based on
   `deploy/.env.production.example`; set `SITE_DOMAIN`, real
   `DATABASE_URL`, `CORS_ORIGINS=https://<actual-site-domain>`, two
   independent long random JWT secrets, an environment-specific issuer and
   audiences, and `AUTH_COOKIE_SECURE=true`. Never commit these values.
2. Protect the database with managed backups, restricted network access,
   least-privileged credentials and TLS. Take a snapshot/backup before migrations.
3. Build the images and check config, without starting them:
   `docker compose -f deploy/compose.yaml --env-file deploy/.env.production build`
   and `docker compose -f deploy/compose.yaml --env-file deploy/.env.production config`.
4. Apply migrations **once** against the intended production database after a
   reviewed backup:
   `docker compose -f deploy/compose.yaml --env-file deploy/.env.production run --rm api bun run db:migrate`.
   Note: role-creation migrations may require elevated first-setup privileges;
   application runtime credentials should then use the smallest permissions.
5. Start the stack using
   `docker compose -f deploy/compose.yaml --env-file deploy/.env.production up -d`.
   Caddy provides public HTTPS and proxies `/api/v1/*` to the internal API.
6. Confirm the API is healthy inside the private network and verify
   `https://<actual-site-domain>/`, `/account`, sign-in/out, reload, browser
   cookie flags, CSP/CORS, mobile layout, redirects and unauthorized responses.
   Only move public traffic after backups, alerts, error monitoring and a rollback
   procedure have been exercised.
7. For rollback, retain the previous image tag and database backup; never
   assume every migration can be reversed safely. Restore only through a
   documented incident process.

## Backup and recovery

- The included helper `bash deploy/backup-postgres.sh /secure/backups` uses
  `DATABASE_URL` from the environment and requires PostgreSQL CLI tools.
  It writes a private custom-format dump, validates its catalogue, and creates
  a SHA-256 manifest. This is **not** a complete backup system.
- Schedule encrypted offsite retention with your selected provider and review
  access controls. Logical backups alone do not replace PITR.
- Regularly restore to a **new, disposable, isolated staging database**
  (never overwrite production during routine tests). Verify migrations, number
  of records, auth login and service readiness. Record last successful restore,
  RPO, RTO and recovery contact in the operations notebook.
- Never run `db:reset` or `test:db` against production; database integration
  tests are explicitly guarded for isolated `*_test` databases.

## Operational notes

- The bundled rate limiter and WebSocket quotas use process-local memory;
  scaling to multiple API instances requires shared enforcement.
- Access JWTs are stateless until expiration; password/session revocation is
  not an immediate invalidation of already-issued access tokens.
- The IndexedDB lock fallback has a timed lease. A tab suspended past expiry
  may lose ownership; native Web Locks remains preferable.
- Every `push` runs CI, **not production deployment**. No secrets were
  provisioned and no site was published as part of this task.

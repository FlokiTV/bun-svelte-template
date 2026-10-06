# Observability

The API emits structured JSON logs and an `x-request-id` response header.

Every request should be traceable by request ID. Do not log passwords, JWTs, cookies, document bodies or other secrets.

For production, pipe stdout/stderr into the hosting provider's log collector. A vendor-specific SDK is intentionally not included in the base template.


Operational probes live at `/health` and `/ready`. `/health` must remain dependency-free; `/ready` may fail when required dependencies are unavailable. Runtime metadata is exposed at `/meta` and must never contain secrets.

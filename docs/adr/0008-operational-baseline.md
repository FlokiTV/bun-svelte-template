# ADR 0007 — Operational baseline

## Status
Accepted.

## Decision
The template includes liveness/readiness endpoints, graceful shutdown, request/body limits, structured logs, request IDs, security headers, configurable CORS, a process-local rate-limit baseline, outbound HTTP timeouts, OpenAPI validation and secret scanning.

## Consequences
The default rate-limit store is process-local and intentionally simple. A horizontally scaled production system that requires shared rate limits must replace the store with an external implementation. This infrastructure is a baseline, not a distributed systems abstraction.

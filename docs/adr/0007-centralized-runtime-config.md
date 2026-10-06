# ADR 0006 — Centralized runtime configuration

## Status
Accepted.

## Decision
Runtime environment variables are parsed once through `@vibe/config` and `apps/api/src/config.ts`. Application modules must import the validated immutable config object and must not read `Bun.env` or `process.env` directly.

## Consequences
- invalid production configuration fails at startup;
- secrets and defaults are easier to audit;
- agents cannot silently invent new environment access patterns.

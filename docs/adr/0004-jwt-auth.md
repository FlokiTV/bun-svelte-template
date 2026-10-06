# 0004 — Optional JWT authentication module

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

Provide a reusable local JWT module with short-lived access tokens and rotating refresh sessions. Do not require an external auth provider.

## Consequences

Product-specific authorization remains separate from generic authentication.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

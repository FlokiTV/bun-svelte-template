# 0005 — Framework-neutral shared contracts

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

Share public TypeScript contracts through packages/contracts. Do not import Elysia internals into the web app.

## Consequences

Frontend remains replaceable and backend framework coupling does not leak across the boundary.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

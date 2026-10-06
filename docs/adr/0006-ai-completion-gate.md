# 0006 — Deterministic AI completion gate

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

A coding task is not complete until `bun run verify` passes, or the handoff explicitly explains why a command could not run.

## Consequences

Agents have an objective feedback loop rather than relying on visual confidence or prose claims.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

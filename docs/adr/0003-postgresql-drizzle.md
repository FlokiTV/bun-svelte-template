# 0003 — PostgreSQL with Drizzle

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

Use PostgreSQL as the primary relational store and Drizzle as the typed SQL layer when persistence is needed.

## Consequences

Provider lock-in is minimized; SQL remains visible and migrations are explicit.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

# 0002 — Elysia over raw Bun routing

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

Use Elysia for the main API to make validation, OpenAPI, macros and module conventions explicit.

## Consequences

There is small framework overhead, but route contracts are easier for humans and agents to understand and test.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

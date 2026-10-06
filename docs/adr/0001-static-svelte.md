# 0001 — Static Svelte frontend

Status: Accepted

## Context

This repository is optimized for small, independently understandable changes made by humans and coding agents.

## Decision

Use Svelte 5 as a client-only static SPA built with Rsbuild/Rspack. No frontend SSR or server endpoints are allowed.

## Consequences

The frontend can be hosted on a CDN independently. Dynamic product data comes from the API.

## Alternatives

Alternatives may be reconsidered only with a new ADR that supersedes this one.

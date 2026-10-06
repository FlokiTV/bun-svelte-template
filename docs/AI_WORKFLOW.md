# Workflow for agents / vibe coding

## Before editing

Read, in order:

1. `AGENTS.md`
2. `ai/project.json`
3. `PROJECT.md` if product behavior changes
4. target module + its tests
5. relevant ADR for architecture-sensitive changes

Use `bun run context` if the repository is unfamiliar.

## Task shape

Prefer explicit acceptance criteria. Templates live in `ai/tasks/`.

Good request:

```text
Implement POST /api/v1/widgets.
Acceptance criteria:
- validates name 1..120 chars
- returns stable error envelope
- service behavior has tests
- OpenAPI metadata is present
- no new dependency
- bun run verify passes
```

## Work loop

1. inspect local module and nearest canonical example;
2. write/change contract and tests;
3. implement the smallest behavior;
4. run the narrow test;
5. run `bun run verify`;
6. report what changed and any unresolved risk.

## Architecture drift prevention

- Use generators instead of hand-creating standard structure when possible.
- Do not add a second state library, validation library, formatter or routing strategy without a concrete need.
- Do not duplicate contracts across web/API.
- If an accepted decision must change, add an ADR rather than silently bypassing it.

## Completion definition

"Looks correct" is not completion. The objective gate is `bun run verify`.

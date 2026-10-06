Follow `AGENTS.md` and `ai/project.json`.

Key rules:
- Svelte frontend is static-only, mobile-first, and contains no server routes.
- Bun/Elysia is the only application backend.
- Validate API inputs at runtime.
- Use stable API error codes and the standard error envelope.
- Keep feature modules explicit and testable.
- Use Biome, not ESLint/Prettier.
- Run `bun run verify` before considering a task complete.

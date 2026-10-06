# Changelog

## Unreleased

### Frontend toolchain
- Frontend migrado de SvelteKit/Vite para Svelte 5 + Rsbuild/Rspack em SPA client-only.
- Tailwind CSS 4 integrado pelo plugin oficial do Rsbuild.
- Testes web migrados de Vitest para Rstest, reutilizando a configuração Rsbuild/Rspack.
- Build continua gerando `build/index.html` e `build/200.html` para fallback de SPA.
- Biome permanece como formatter/linter canônico.

## 1.0.0

Primeira versão estável do template.

### Base
- Svelte 5 + SvelteKit estático, Tailwind CSS e Biome.
- Bun + Elysia com OpenAPI/Scalar e WebSocket.
- PostgreSQL + Drizzle disponíveis sem obrigar uso no projeto inicial.
- Autenticação JWT self-hosted opcional com access/refresh token.

### AI-first / vibe coding
- `AGENTS.md`, `PROJECT.md`, `ai/project.json`, tarefas e exemplos canônicos.
- ADRs para decisões arquiteturais.
- Geradores de módulo, componente, página e evento.
- `bun run context`, `bun run doctor` e `bun run verify`.
- Verificação automática de limites arquiteturais.

### Operação e segurança
- Configuração de ambiente centralizada e validada.
- CORS, security headers, limite de body e rate limiting base.
- Health, readiness e metadata endpoints.
- Request ID, logs estruturados e catálogo central de erros.
- Graceful shutdown e helper de HTTP externo com timeout.
- PostgreSQL local via Docker Compose, migrations e seed.
- Secret scan e validação OpenAPI integrados ao gate de verificação.

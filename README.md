# Bun + Svelte Vibe Coding Template v1.0

Template enxuto para projetos construídos com forte uso de agentes/IA, sem acoplar o frontend ao backend.

## Stack

### Frontend
- Svelte 5
- SvelteKit
- `adapter-static`
- Tailwind CSS 4
- TypeScript
- Biome
- Vitest + Svelte Testing Library
- Playwright
- **Zero SSR**
- **Mobile first**

### Backend
- Bun
- Elysia
- OpenAPI + Scalar
- TypeScript
- `bun:test`
- WebSocket pronto para extensão
- PostgreSQL + Drizzle disponíveis, sem obrigar uso
- Configuração de runtime validada e centralizada
- Health/readiness, graceful shutdown e segurança operacional básica
- Módulo JWT self-hosted opcional (email/senha, access + refresh)

### Organização
- Bun workspaces
- Contratos compartilhados sem acoplar o frontend ao Elysia
- Arquivos de contexto para agentes (`AGENTS.md`, docs e instruções por ferramenta)

## Filosofia

O objetivo deste template não é trazer um produto pronto. Ele define trilhos fortes para que humanos e agentes adicionem funcionalidades sem transformar o projeto em uma mistura de padrões.

Princípios:

- frontend estático e independente;
- backend explícito e modular;
- contratos previsíveis;
- validação na borda da API;
- testes próximos das features;
- baixa quantidade de dependências;
- performance mobile tratada como requisito;
- contexto de arquitetura legível por IA.

## Estrutura

```text
.
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── db/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── example/
│   │       │   ├── health/
│   │       │   └── realtime/
│   │       ├── app.ts
│   │       └── index.ts
│   │
│   └── web/
│       ├── src/
│       │   ├── lib/
│       │   └── routes/
│       └── static/
│
├── packages/
│   ├── config/
│   ├── contracts/
│   └── test-utils/
│
├── ai/
│   ├── examples/
│   ├── tasks/
│   └── project.json
│
├── docs/
│   └── adr/
├── scripts/
├── tests/e2e/
├── AGENTS.md
└── biome.json
```

## Começando

Requer Bun instalado.

```bash
bun install
```

O primeiro `bun install` gera `bun.lock`. **Commit esse lockfile**; a CI passa a usar `--frozen-lockfile` automaticamente quando ele existe.

Copie os arquivos de ambiente:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Suba frontend e API juntos:

```bash
bun run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- OpenAPI: `http://localhost:3000/openapi`
- OpenAPI JSON: `http://localhost:3000/openapi/json`

## Comandos

```bash
bun run dev
bun run dev:web
bun run dev:api

bun run context
bun run doctor
bun run architecture:check
bun run verify

bun run lint
bun run format
bun run check
bun run test
bun run test:e2e
bun run build
bun run openapi:check
bun run secrets:check

bun run db:up
bun run db:migrate
bun run db:seed
bun run db:down
bun run db:reset
```

## Gerar módulo de API

```bash
bun run gen:module billing
```

O gerador cria a estrutura canônica e registra o módulo em `apps/api/src/modules/index.ts`.

O objetivo do gerador é reduzir decisões repetitivas para agentes.

## Frontend estático

`apps/web` não usa SSR.

O build:

```bash
bun --filter '@vibe/web' build
```

gera arquivos estáticos em:

```text
apps/web/build/
```

O `adapter-static` gera um fallback `200.html`. Em `static/_redirects` há uma regra compatível com hosts que entendem o formato de redirects para SPA.

Não crie:

```text
+page.server.ts
+server.ts
hooks.server.ts
form actions
```

neste frontend.


## Autenticação JWT opcional

O template agora inclui um módulo self-hosted em `apps/api/src/modules/auth`. Ele usa:

- `Bun.password` / Argon2id para senha;
- JWT de acesso curto via Bearer;
- JWT de refresh em cookie HttpOnly;
- rotação de refresh token;
- sessões revogáveis em PostgreSQL;
- macro Elysia `auth: true` para rotas protegidas;
- cliente web mínimo em `apps/web/src/lib/auth/client.ts`.

Ele não traz telas de login nem políticas específicas do produto. Para usar, configure `DATABASE_URL`, gere a migration e defina secrets próprios. Veja `docs/AUTH.md`.

## Banco de dados

O template já inclui Drizzle + Postgres.js, mas a aplicação inicial não depende de banco.

Quando precisar:

```bash
DATABASE_URL=postgresql://...
```

Adicione schemas em:

```text
apps/api/src/db/schema/
```

E use:

```bash
bun --filter '@vibe/api' db:generate
bun --filter '@vibe/api' db:migrate
```

## Melhor caminho para vibe coding

Antes de pedir mudanças a um agente:

1. Faça-o ler `AGENTS.md`.
2. Aponte o módulo relevante.
3. Dê um critério de aceite verificável.
4. Peça teste junto com a implementação.
5. Exija `bun run verify` no fim.

Veja `docs/AI_WORKFLOW.md`.

## Removendo o exemplo

O módulo `example` existe apenas para mostrar o padrão esperado. Pode ser removido quando o primeiro módulo real for criado.


## AI-first workflow

This template includes deterministic guardrails for coding agents:

```bash
bun run context             # generate compact repository context
bun run doctor              # diagnose environment/architecture
bun run architecture:check  # enforce hard boundaries
bun run verify              # architecture + lint + types + tests + builds
```

Canonical task templates and code examples live under `ai/`. Accepted architectural decisions live under `docs/adr/`. A task should not be considered complete until `bun run verify` passes (or the handoff states the exact reason it could not run).

Generators:

```bash
bun run gen:module billing
bun run gen:component UserCard
bun run gen:page settings/profile
bun run gen:event notification.created
```


## Baseline operacional v1.0

O template fecha a infraestrutura genérica com:

- Scalar em `/openapi` e spec em `/openapi/json`;
- Bearer JWT declarado no OpenAPI;
- `GET /health`, `GET /ready` e `GET /meta`;
- CORS por allow-list;
- security headers;
- limite global de body no Bun/Elysia;
- rate limiting por rota (`rateLimit: "default" | "auth"`);
- timeout para HTTP externo;
- graceful shutdown;
- PostgreSQL local via Docker Compose;
- secret scanning;
- validação do OpenAPI no `verify`;
- configuração de ambiente centralizada em `@vibe/config`.

A partir desta versão, funcionalidades como filas, Redis, storage, e-mail, pagamentos e analytics entram apenas quando o produto exigir.

Veja `docs/OPERATIONS.md` e `docs/SECURITY.md`.

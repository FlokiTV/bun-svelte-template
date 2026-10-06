# Arquitetura

## Fronteiras

```text
Browser
  │
  │ static HTML/CSS/JS
  ▼
apps/web (Svelte)
  │
  │ HTTP / WebSocket
  ▼
apps/api (Bun + Elysia)
  │
  ├── PostgreSQL (quando necessário)
  └── serviços externos
```

O frontend nunca é servido pela API.

## apps/web

Responsabilidades:
- apresentação;
- interação;
- estado de UI;
- navegação;
- consumo da API;
- experiência mobile.

Não é responsabilidade do frontend:
- autorização;
- regra de negócio;
- acesso a secrets;
- acesso ao banco;
- validação de segurança.

O frontend é uma SPA estática construída por SvelteKit com `ssr = false`.

## apps/api

Responsabilidades:
- contratos HTTP/WebSocket;
- validação;
- regras de negócio;
- autorização quando existir;
- persistência;
- integrações;
- observabilidade.

Cada feature deve ser um módulo explícito.

## packages/contracts

Contém tipos compartilhados que representam o contrato entre consumidor e servidor.

Regras:
- não importar Svelte;
- não importar Elysia;
- não importar Drizzle;
- não colocar lógica de negócio;
- importações no frontend devem preferencialmente ser `import type`.

## Banco

Drizzle/PostgreSQL são infraestrutura, não domínio.

Repositories podem ser adicionados quando um módulo realmente precisar de persistência. Não crie uma camada repository genérica apenas por padrão.

## Realtime

O template expõe `/ws` como exemplo mínimo.

Eventos reais devem ter protocolo explícito:

```ts
type ServerEvent =
  | { type: "notification.created"; payload: ... }
  | { type: "resource.updated"; payload: ... };
```

Evite JSON sem discriminador `type`.

## Optional JWT authentication

The reusable auth module lives in `apps/api/src/modules/auth`. See `docs/AUTH.md`. Product-specific authorization remains outside this generic module.


## Operational boundaries

- Runtime configuration is parsed centrally through `@vibe/config`.
- `/health` is liveness; `/ready` is dependency readiness.
- External HTTP calls should use bounded timeouts.
- API source uses structured logging and request IDs.
- Route-level rate limiting is available as a macro; its default store is process-local.

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

O frontend é uma SPA client-only construída com Svelte 5 e Rsbuild, usando Rspack em desenvolvimento e produção. `apps/web/rsbuild.config.ts` gera artefatos estáticos em `build/`; o build duplica `index.html` como `200.html` para fallback SPA e `static/_redirects` aponta rotas desconhecidas para esse fallback. Não existe runtime de frontend no servidor.

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

Importações internas do frontend usam `#lib/*`, declarado no TypeScript e no Rsbuild/Rspack.

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

O template expõe `/ws` como exemplo mínimo, não como infraestrutura de produto pronta. O endpoint reutiliza a allow-list de Origin do CORS e aplica limites process-local de conexões, tamanho de mensagem e mensagens por janela. Deploys multi-instância que precisem de limites globais devem usar coordenação compartilhada.

Eventos reais devem ter protocolo explícito:

```ts
type ServerEvent =
  | { type: "notification.created"; payload: ... }
  | { type: "resource.updated"; payload: ... };
```

Evite JSON sem discriminador `type`.

## Optional JWT authentication

The reusable auth module lives in `apps/api/src/modules/auth`. Refresh sessions are persisted as rotation families so replay can revoke active descendants, while access tokens remain stateless and are scoped by issuer/audience. See `docs/AUTH.md`. Product-specific authorization remains outside this generic module.


## Operational boundaries

- Runtime configuration is parsed centrally through `@vibe/config`.
- `/health` is liveness; `/ready` is dependency readiness.
- External HTTP calls should use bounded timeouts.
- API source uses structured logging and request IDs.
- Route-level rate limiting is available as a macro; its default store is process-local.

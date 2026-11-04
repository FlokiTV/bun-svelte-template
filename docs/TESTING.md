# Testes

## API

Use `bun:test`.

Teste a aplicação Elysia com `app.handle()` sem abrir porta de rede.

Prioridades:
- validação;
- status HTTP;
- regras de negócio;
- erros;
- autorização quando adicionada.

## Frontend

Use:
- Rstest para componentes/utilidades, reutilizando a configuração Rsbuild/Rspack;
- Svelte Testing Library para comportamento de UI;
- Playwright para fluxos completos.

Teste comportamento, não detalhes internos.

O CLI do Rstest usa Node.js: mantenha **Node 24.21.0** (fixado na CI) ou uma versão compatível com o `jsdom@30.1.2` (Node `^22.22.2 || ^24.15.0 || >=26`). Node 22.12.0 não é suportado e falha ao importar `undici@8.12.2` por ausência de `createZstdDecompress` em `node:zlib`. Isso não exige Node para executar a aplicação, apenas para o runner de testes.

## PostgreSQL integration (isolated)

`bun --filter '@vibe/api' test:db` is intentionally separate from the regular test suite. It requires `NODE_ENV=test`, explicit matching `DATABASE_URL` and `TEST_DATABASE_URL`, and a dedicated PostgreSQL database whose name ends in `_test` (for example `vibe_test`). Never point this test at a production or shared database. It checks `current_database()` before executing tests and deletes only its own UUID-generated user, never truncates shared tables.

The CI database job creates and migrates an ephemeral `vibe_test` database. Regression cases include replay, logout with an already-rotated cookie, and concurrent refresh/logout.

## E2E

O Playwright tem projetos:
- desktop Chromium;
- mobile Chromium.

O mobile não é teste secundário; é parte do gate de qualidade para interfaces críticas.


## Gate completo

`bun run verify` executa arquitetura, secret scan, Biome, TypeScript, testes, validação do OpenAPI e builds.

O OpenAPI é tratado como contrato verificável: `bun run openapi:check` deve confirmar uma spec não vazia e o esquema Bearer JWT.

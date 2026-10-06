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
- Vitest para componentes/utilidades;
- Svelte Testing Library para comportamento de UI;
- Playwright para fluxos completos.

Teste comportamento, não detalhes internos.

## E2E

O Playwright tem projetos:
- desktop Chromium;
- mobile Chromium.

O mobile não é teste secundário; é parte do gate de qualidade para interfaces críticas.


## Gate completo

`bun run verify` executa arquitetura, secret scan, Biome, TypeScript, testes, validação do OpenAPI e builds.

O OpenAPI é tratado como contrato verificável: `bun run openapi:check` deve confirmar uma spec não vazia e o esquema Bearer JWT.

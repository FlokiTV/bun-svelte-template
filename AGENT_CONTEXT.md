# Agent Context

- Última atualização: 2026-10-06T08:57:30-03:00
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes do board, sempre commitando as mudanças e testando tudo antes de avançar.

## Board e card
- Board: board_4bc8a982-5a76-4ded-8544-6c66bcfcc27c — bun-svelte-template — Auth hardening & review follow-up
- Status: active
- Card atual: task_60211eee-ee09-4ff9-906b-1ce1542d2dd1 — 02 — Restringir authFetch à origin confiável da API — in_progress.

## Terminais gerenciados
- Nenhum terminal ativo/relevante deste workspace nesta rodada.

## Estado atual
A revisão técnica confirmou arquitetura geral consistente, Git limpo em main...origin/main e guardrails de arquitetura/secret scan funcionais.
Achados priorizados:
- authFetch pode anexar Bearer token a origin externa se usado com URL arbitrária.
- requests 401 concorrentes podem disparar múltiplos refreshes contra uma rotação single-use de refresh token.
- logout precisa limpar estado local de forma robusta mesmo sob falha de rede e coordenar refresh em voo.
- auth usa parsing de erro próprio e perde status/code/requestId do contrato ApiError.
- cobertura frontend/E2E de auth é insuficiente para os fluxos críticos.
- users.email declara UNIQUE e índice explícito potencialmente redundante.
- ambiente local não está reproduzível: projeto fixa Bun 1.4.2, máquina executa 1.4.0, node_modules raiz ausente e workspaces parcialmente instalados.

Board criado com a seguinte ordem:
1. Restaurar baseline determinístico do workspace.
2. Restringir authFetch à origin confiável da API.
3. Implementar refresh JWT single-flight no cliente.
4. Endurecer logout e ciclo de estado local.
5. Unificar erros de auth com o contrato ApiError.
6. Ampliar cobertura de autenticação no frontend e E2E.
7. Remover índice redundante de users.email com migration nova, após confirmação.
8. Gate final, documentação e readiness do template.

## Arquivos alterados
- AGENT_CONTEXT.md — sincronizado com execução e validações.
- apps/api/package.json — peers/tipos explícitos para o linker isolado: @sinclair/typebox e bun-types.
- bun.lock — importador da API atualizado; versões existentes preservadas.
- apps/web/src/lib/auth/client.ts — authFetch falha fechado para origins diferentes da API configurada.
- apps/web/src/lib/auth/client.test.ts — regressões para origin externa, relativa, default e VITE_API_URL customizada.

## Validações
Card 01 — baseline determinístico:
- Bun 1.4.2 executado de forma isolada via bunx, sem alterar instalação global.
- bun install --frozen-lockfile: PASS após limpeza das árvores node_modules stale.
- bun run doctor: PASS; avisos apenas .env ausente, Docker ausente e DB check opcional não executado.
- bun run verify: PASS — architecture, secrets, Biome, typecheck, API 19/19, web 1/1, OpenAPI 11 paths e builds.
- bun run test:e2e: PASS — mobile-chromium e desktop-chromium, 2/2.
- Playwright Chromium 1243 instalado localmente na máquina para viabilizar o E2E.
- Causa do baseline quebrado: workspaces com node_modules stale e dependências de peer/tipos implícitas sob o linker isolado do Bun 1.4.2.

Card 02 — trusted origin:
- testes web: 5/5 PASS.
- bun run verify: PASS.
- bun run test:e2e: 2/2 PASS.
- authFetch rejeita origin externa antes de anexar Authorization ou credentials.

## Bloqueios
- Nenhum bloqueio atual. Baseline reproduzível restaurado e gates verdes.

## Próximo passo exato
Commitar e fechar o card 02; iniciar o card 03 para implementar refresh JWT single-flight com teste concorrente determinístico.

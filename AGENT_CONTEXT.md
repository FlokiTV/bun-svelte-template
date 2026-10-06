# Agent Context

- Última atualização: 2026-10-06T08:57:30-03:00
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes do board, sempre commitando as mudanças e testando tudo antes de avançar.

## Board e card
- Board: board_4bc8a982-5a76-4ded-8544-6c66bcfcc27c — bun-svelte-template — Auth hardening & review follow-up
- Status: active
- Card atual: task_0a4c5acd-2d55-4cbe-b89e-63cf819d5451 — 05 — Unificar erros de auth com o contrato ApiError — in_progress.

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
- apps/web/src/lib/auth/client.test.ts — regressões para origin, refresh, logout e ApiError.
- apps/web/src/lib/api/request.ts — readJsonResponse compartilhado para preservar ApiError.

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

Card 05 — ApiError compartilhado:
- auth reutiliza readJsonResponse da camada HTTP; parsing duplicado removido.
- erros padronizados preservam status/code/message/requestId.
- corpo inválido cai em HTTP_ERROR com x-request-id.
- authFetch continua decidindo refresh a partir do status 401 bruto.
- testes web: 12/12 PASS.
- bun run verify: PASS.
- bun run test:e2e: 2/2 PASS.

Card 04 — logout hardening:
- logout limpa token local antes do request remoto e também em finally.
- falha de rede e HTTP remoto são propagadas sem restaurar auth local.
- logout invalida gerações de auth; refresh em voo não pode repopular o token depois da saída.
- testes web: 10/10 PASS.
- bun run verify: PASS.
- bun run test:e2e: 2/2 PASS.
- authFetch rejeita origin externa antes de anexar Authorization ou credentials.

Card 03 — refresh single-flight:
- 2 requests 401 concorrentes compartilham exatamente 1 refresh HTTP.
- ambos fazem um único retry com o access token rotacionado.
- falha de refresh limpa auth local e devolve o 401 original sem loop.
- testes web: 7/7 PASS.
- bun run verify: PASS.
- bun run test:e2e: 2/2 PASS.

## Bloqueios
- Nenhum bloqueio atual. Baseline reproduzível restaurado e gates verdes.

## Próximo passo exato
Commitar e fechar o card 05; iniciar o card 06 para ampliar cobertura do auth, incluindo um E2E de cliente em browser sem exigir UI de login ou banco real.

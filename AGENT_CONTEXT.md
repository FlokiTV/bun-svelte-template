# Agent Context

- Última atualização: 2026-10-06
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes da segunda revisão técnica, sempre commitando e testando, e publicar o resultado final em origin/main.

## Board e card
- Board: board_0d8d387a-ee3a-41f9-9a3a-d7e25085d0a6 — bun-svelte-template — Security & production hardening v2
- Status: active
- Card atual: task_2bb2d769-8c58-4e2c-9e2e-bcc5ac4eaa28 — 01 — Corrigir remoção do refresh cookie — in_progress.

## Estado de partida
- main sincronizada com origin/main.
- Board anterior concluído com authFetch trusted-origin, refresh single-flight, logout local hardening, ApiError compartilhado, cobertura E2E e migration 0001.
- CI remota do push anterior: PASS.
- Segunda revisão confirmou bug de remoção do refresh cookie: cookie criado em Path=/api/v1/auth, mas cookie.remove() emite deleção em Path=/.
- Segunda revisão também identificou: CI sem PostgreSQL real, necessidade de Origin/CSRF para SameSite=None, lifecycle/replay de sessões, JWT iss/aud, WebSocket público sem hardening específico, falta de durationMs, bun audit ausente da CI e upgrades pendentes.

## Ordem do board v2
1. Corrigir remoção do refresh cookie.
2. Validar CORS e proteção Origin/CSRF.
3. Endurecer lifecycle/replay de auth_sessions.
4. Adicionar issuer/audience aos JWTs.
5. Endurecer WebSocket.
6. Adicionar durationMs à observabilidade.
7. CI com PostgreSQL real e migrations.
8. Audit + upgrades patch/minor.
9. Upgrades major deliberados.
10. Documentação, gate final e push.

## Regra de execução
Cada card termina com testes/gates relevantes verdes e commit próprio antes de avançar.

## Próximo passo exato
Centralizar set/clear do refresh cookie com Path=/api/v1/auth, adicionar regressões HTTP para logout/refresh inválido, executar verify/E2E e commitar o card 01.

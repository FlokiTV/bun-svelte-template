# Agent Context

- Última atualização: 2026-10-06
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes da segunda revisão técnica, sempre commitando e testando, e publicar o resultado final em origin/main.

## Board e card
- Board: board_0d8d387a-ee3a-41f9-9a3a-d7e25085d0a6 — bun-svelte-template — Security & production hardening v2
- Status: active
- Card atual: task_4f3d414b-8ea2-4f2d-992e-b4c757e9215c — 02 — Validar CORS e adicionar proteção Origin/CSRF — concluindo.

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
Commitar e fechar o card 02; iniciar lifecycle/replay de auth_sessions com migration incremental no card 03.


### Card 01 — refresh cookie deletion
- set/clear centralizados em auth.cookie.ts.
- criação e deleção usam Path=/api/v1/auth.
- regressões HTTP confirmam Max-Age=0 + Path correto em logout e refresh inválido.
- auth integration test: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.


### Card 02 — CORS e Origin/CSRF
- CORS_ORIGINS normalizado para origins http/https e rejeita wildcard/path/query/fragment/protocolo inválido.
- refresh/logout rejeitam Origin não permitido com 403 antes de usar refresh cookie.
- clientes sem Origin continuam compatíveis.
- testes focados config + auth: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.

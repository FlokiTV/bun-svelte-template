# Agent Context

- Última atualização: 2026-10-06
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes da segunda revisão técnica, sempre commitando e testando, e publicar o resultado final em origin/main.

## Board e card
- Board: board_0d8d387a-ee3a-41f9-9a3a-d7e25085d0a6 — bun-svelte-template — Security & production hardening v2
- Status: active
- Card atual: task_4b38b849-c404-4826-92d0-b99299a90f87 — 04 — Adicionar issuer e audience aos JWTs — concluindo.

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
Commitar e fechar o card 04; iniciar hardening do WebSocket público no card 05.


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


### Card 03 — auth session lifecycle/replay
- auth_sessions ganhou family_id, índice de family e índice expires_at.
- migration 0002 faz backfill family_id=id antes de SET NOT NULL; migrations anteriores intactas.
- replay de sessão já rotacionada revoga todos os descendentes ativos da família.
- pruning remove somente sessões cujo expires_at já passou; rotina periódica configurável no runtime.
- repository real validado contra PGlite: rotate/replay/prune PASS.
- migration 0002 validada em PGlite com sessão preexistente.
- drizzle generate: nenhuma mudança adicional; drizzle check: PASS.
- auth integration test: PASS.
- bun run verify: PASS.
- E2E teve um primeiro flake por dev:web exit code 9; rerun isolado: 4/4 PASS.


### Card 04 — JWT issuer/audience
- access e refresh tokens incluem iss/aud explícitos.
- defaults derivam de APP_NAME + environment e audiences distintas para web/refresh.
- jose verify e type guards validam issuer/audience.
- testes cobrem claims corretos e issuer/audience incorretos.
- testes focados auth/config: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.

# Agent Context

- Última atualização: 2026-10-06
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes da segunda revisão técnica, sempre commitando e testando, e publicar o resultado final em origin/main.

## Board e card
- Board: board_0d8d387a-ee3a-41f9-9a3a-d7e25085d0a6 — bun-svelte-template — Security & production hardening v2
- Status: active
- Card atual: task_3b8ab543-ac5a-4665-8a4d-a870f5f40a5a — 07 — CI com PostgreSQL real e migrations — aguardando CI remota.

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
Commitar/push do card 07, confirmar o job database em PostgreSQL 17 real e então iniciar supply-chain/audit do card 08.

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


### Card 05 — WebSocket hardening
- /ws reutiliza a allow-list de Origin.
- limites process-local configuráveis: conexões, bytes por mensagem e mensagens por janela.
- handshake real com Origin permitido: PASS; Origin malicioso: rejeitado.
- testes unitários de limiter: PASS.
- integração real WebSocket: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.


### Card 06 — durationMs
- timing monotônico armazenado por Request via WeakMap.
- http.request.finished inclui requestId + durationMs.
- logs de validação/falha também incluem durationMs.
- testes focados: PASS; log real observado com durationMs.
- svelte-check local exigiu NODE_OPTIONS com heap explícito devido pressão de memória externa; 0 erros/0 warnings.
- bun run verify com heap explícito: PASS.
- bun run test:e2e: 4/4 PASS.


### Card 07 — CI PostgreSQL real
- workflow ganhou job database com postgres:17-alpine e healthcheck.
- job aplica todas as migrations do zero, executa db:check e test:db.
- test:db usa app/repository reais e cobre register, /me, refresh rotation, replay family revocation, login, logout e refresh pós-logout.
- teste DB incluído no typecheck, mas não no bun test padrão; roda explicitamente via test:db.
- YAML parse: PASS (jobs database/e2e/quality).
- drizzle-kit check: PASS.
- API typecheck: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.
- validação PostgreSQL 17 real será confirmada pelo GitHub Actions após o push deste commit.


### Card 07 — PostgreSQL real
- job database na CI com postgres:17-alpine, healthcheck e frozen install.
- CI aplica todas as migrations, roda db:check e test:db.
- teste DB explícito usa repository/Drizzle real, sem mock.
- fluxo validado localmente via PostgreSQL wire-compatible temporário: register -> me -> refresh -> replay revoga família -> descendant rejeitado -> login -> logout -> refresh rejeitado.
- apps/api/tsconfig.json inclui tests/**/*.ts.
- drizzle-kit check: PASS; YAML CI: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.

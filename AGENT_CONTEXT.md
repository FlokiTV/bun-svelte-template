# Agent Context

- Última atualização: 2026-11-04
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
"Vamos matar tudo": preparar fundação do template para lançamento SaaS sem inventar produto, provedor de cobrança, domínio ou credenciais. Implementar telas de acesso/área privada e referência de deploy/segurança/backup, testes e CI. Não executar deploy real nem criar agendamentos sem configuração concreta.

## Board e card
- Board atual: board_c4d6626e-b0c1-4caf-be14-6debb28a87c1 — SaaS launch readiness (active).
- Card técnico concluído: task_9f6b8f54-40b5-4656-a130-a33064f8ac99 (done, 5/5). Card de lançamento comercial bloqueado: task_7f7c60d8-9f6f-4f6f-b6d0-262a887ea0e8 (blocked por falta de definição do produto e provedores).
- Board anterior: board_faa0649d-e9dd-4914-b095-5d7882232d17 — IndexedDB auth cross-tab fallback (done; CI 41874711286 SUCCESS).
- Board anterior: board_ed4e58d7-34ba-4d52-922b-dc4694e6dfc5 — DB isolation & auth races (done; CI 41870016977 SUCCESS).
- Board de remediação undici: board_e94c8eca-d9d4-4cbc-b6b6-248243dadc98 (done).
- Board histórico de migração Rspack: board_5be0dd95-c8a7-45a4-ab34-b90610aaef5e (done).

## SaaS launch readiness — 2026-11-04
- Pedido: "vamos matar tudo" após auditoria mostrar que repositório é template, não SaaS. Objetivo operacional: implementar somente fundação genérica sem inventar o produto nem fazer deploy real.
- Board: board_c4d6626e-b0c1-4caf-be14-6debb28a87c1 (active). Card técnico: task_9f6b8f54-40b5-4656-a130-a33064f8ac99 (done); card comercial: task_7f7c60d8-9f6f-4f6f-b6d0-262a887ea0e8 (blocked).
- Terminais gerenciados: nenhum iniciado nesta rodada.
- Produto ainda não foi definido pelo usuário. PROJECT.md atualizado com lacunas explícitas; não afirmar SaaS pronto para clientes pagos.
- UI implementada: AccountPortal.svelte em /account com login, cadastro em dev, restauração de sessão por cookie, logout, erros acessíveis e exibição de identidade da conta; landing inicial preservada.
- Produção: AUTH_REGISTRATION_ENABLED default false em NODE_ENV=production, com opt-in explícito; frontend ocultará cadastro sem PUBLIC_REGISTRATION_ENABLED=true; backend é autoridade. JWT secrets rejeitam placeholders REPLACE_*; API URL same-origin em build prod.
- Infra de referência: deploy/Dockerfile, Caddyfile, compose.yaml e start-api.ts com obrigatoriedade de NODE_ENV=production e DATABASE_URL; site HTTPS, API internalizada. Exemplo de env sem segredos reais, backup-postgres.sh e docs/LAUNCH.md de go-live, backup/restore, LGPD, identidade, pagamentos e suporte; nenhuma instalação no provedor foi executada.
- CI: commits 136f2ae e ddd5487 em origin/main; primeira CI 41903347351 encontrou bug de import no script de produção. Corrigido. CI final https://github.com/FlokiTV/bun-svelte-template/actions/runs/41904063900 COMPLETED SUCCESS nos quatro jobs (quality, database PostgreSQL 17, e2e 20/20 e container Docker/Caddy/Compose/preflight). Nenhum deploy realizado.
- O job container valida builds Docker web/api, Caddy, Compose e fail-closed para DB ausente usando segredos sintéticos.
- Validações locais: bun run verify PASS Node24 (37 API, 13 web, lint, types, OpenAPI, builds), Playwright E2E 20/20 PASS mobile+desktop, audit:ci PASS zero high/critical, git diff --check PASS. Docker indisponível localmente.
- Bloqueios de lançamento: produto/caso de uso/tenancy/permissões, fornecedor de email/recovery, provedor de pagamentos e planos, política LGPD/termos, DNS/hosting/PostgreSQL managed/backup restore e observabilidade precisam de decisões e credenciais reais.
- Próximo passo exato: pedir definição do que o SaaS faz e para quem, depois escolher provedores de email, cobrança, domínio e infraestrutura, implementar funcionalidades/permissões/recuperação, validar restore real e homologar antes do go-live. Nenhuma automação deve ser criada.

## Fallback IndexedDB para autenticação — 2026-11-04
- Pedido atual: fallback multitab IndexedDB quando Web Locks API não está disponível, preservando Web Locks como primeira opção. Não criar automação (cancelada a pedido do usuário).
- Board: board_faa0649d-e9dd-4914-b095-5d7882232d17 (done); card: task_17368146-8478-44a4-be85-7f8ca36139c8 (done, 5/5).
- Terminais gerenciados: nenhum iniciado para este trabalho.
- Implementado: apps/web/src/lib/auth/indexeddb-lock.ts: reivindicação atômica por transaction readwrite com owner nonce, prazo de 30s, renovação a cada 3s e liberação condicional ao dono. Uma aba encerrada deixa lease que expira. Se nem Web Locks nem IndexedDB funcionarem, operações de cookie falham com erro em vez de solicitar refresh sem coordenação. Tokens nunca vão para IndexedDB/localStorage.
- Integração: apps/web/src/lib/auth/coordinator.ts seleciona Web Locks se suportado, IndexedDB caso contrário; demais fluxos client.ts permanecem intactos. Teste jsdom usa simulação do mecanismo Web Locks, enquanto E2E executa lock IndexedDB real.
- Testes: Playwright original expandido para os dois modos, incluindo refresh concorrente, refresh/logout, recuperação de lock de aba encerrada e armazenamento indisponível; 16/16 E2E PASS no desktop e mobile com workers=2. Primeira tentativa em 4 workers teve timeout intermitente de hook dev (15/16); configuração limitada a 2 workers e rerun 16/16 PASS.
- Arquivos: indexeddb-lock.ts novo, coordinator.ts, src/test/setup.ts, tests/e2e/auth-client.spec.ts, playwright.config.ts, docs/AUTH.md, docs/TESTING.md, AGENT_CONTEXT.md.
- Limitação: heartbeat via timer pode não rodar se aba for suspensa por mais tempo que o prazo da lease; a exclusão nativa Web Locks permanece superior. Backend protege sessão contra replay.
- Validações finais: bun run verify PASS com Node 24.21.0 (36 API, 13 web, TypeScript/Svelte, OpenAPI, builds, Biome, arquitetura e secret scan); Playwright 16/16 PASS com workers=2 (desktop/mobile); bun run audit:ci PASS (0 high/critical), git diff --check PASS.
- Publicação: commit 7b67e8b publicado em origin/main. CI https://github.com/FlokiTV/bun-svelte-template/actions/runs/41874711286 COMPLETED SUCCESS (quality, database PostgreSQL 17, e2e 16/16 em dois workers). Board/card encerrados; nenhuma automação criada.
- Próximo passo exato: nenhum; fallback IndexedDB entregue, documentado e validado.

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
Alterações locais prontas para revisão/commit. Se publicar, conferir a CI remota com Node 24.21.0, PostgreSQL 17 e todos os gates. Nesta máquina, PostgreSQL real não estava disponível, portanto test:db não foi executado.

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
- primeira CI PostgreSQL 17 falhou em 0000 porque PostgreSQL vanilla não possui roles Supabase anon/authenticated.
- correção: db:migrate prepara anon/authenticated como NOLOGIN somente quando ausentes, sem editar migration aplicada.
- verify/E2E após a correção: PASS; CI 37483860228 passou database, quality e e2e.


### Card 07 — PostgreSQL real
- job database na CI com postgres:17-alpine, healthcheck e frozen install.
- CI aplica todas as migrations, roda db:check e test:db.
- teste DB explícito usa repository/Drizzle real, sem mock.
- fluxo validado localmente via PostgreSQL wire-compatible temporário: register -> me -> refresh -> replay revoga família -> descendant rejeitado -> login -> logout -> refresh rejeitado.
- apps/api/tsconfig.json inclui tests/**/*.ts.
- drizzle-kit check: PASS; YAML CI: PASS.
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.


### Card 08 — supply-chain e patches/minors
- CI executa bun run audit:ci e bloqueia advisories high/critical.
- upgrades aplicados: Biome 2.5.15, jsdom 30.1.2, Svelte 5.57.2, Vite 8.3.3 e Vitest 5.0.3.
- Biome 2.5.15 exigiu apenas atualização de schema e formatação determinística em dois arquivos Svelte/package manifests.
- bun install --frozen-lockfile: PASS.
- bun run audit:ci: PASS; 2 advisories abaixo do threshold.
- exceções documentadas em docs/SECURITY.md: cookie@0.6.0 low (SvelteKit 2) e esbuild@0.18.20 moderate (Drizzle Kit tooling).
- bun run verify: PASS.
- bun run test:e2e: 4/4 PASS.


### Card 09 — majors deliberados
- SvelteKit atualizado de 2.70.3 para 3.0.1.
- adapter-static atualizado de 3.0.10 para 4.0.0.
- configuração do adapter migrou de svelte.config.js para sveltekit({ adapter }) em vite.config.ts conforme o novo modelo.
- aliases internos migraram de $lib para package imports #lib.
- tsconfig web migrou para extends "$app/tsconfig".
- architecture/doctor atualizados para validar vite.config.ts e fallback 200.html.
- frontend check: 0 erros/0 warnings; testes 13/13 PASS; build estático PASS.
- architecture:check PASS; doctor sem bloqueios; audit:ci PASS.
- advisory cookie@0.6.0 foi eliminado pelo SvelteKit 3; resta apenas esbuild moderado na cadeia de tooling Drizzle.
- TypeScript 7 adiado: SvelteKit 3.0.1 declara peer TypeScript ^6.0.0 e svelte-check 4.7.6 declara ^5 || ^6; manter TS 6.0.3 evita combinação oficialmente não suportada.
- script web check usa svelte-check diretamente sob Bun 1.4.2; não há requisito explícito de Node.
- verify/E2E locais completos ficaram impedidos nesta máquina por pagefile/heap do Windows, apesar de checks isolados passarem; CI 37489072909 passou quality, database e e2e.


### Card 10 — documentação e gates finais
- docs/AUTH.md alinhado com session families/replay, pruning, JWT iss/aud, cookie Path e Origin enforcement.
- docs/SECURITY.md alinhado com CORS validado, replay protection, JWT scoping, durationMs, WebSocket limits e advisory restante.
- docs/OPERATIONS.md documenta migration compatibility roles, CI PostgreSQL 17, audit e limites WebSocket.
- docs/ARCHITECTURE.md documenta SvelteKit 3, adapter-static no Vite, fallback 200.html e package imports #lib.
- bun install --frozen-lockfile com Bun 1.4.2: PASS.
- doctor: PASS sem bloqueios; avisos locais apenas .env/Docker/DB opcional ausentes.
- audit:ci: PASS; somente 1 advisory abaixo do threshold.
- architecture:check: PASS.
- openapi:check: PASS, 11 paths.
- drizzle-kit check: PASS.
- lint: PASS.
- build config/contracts/API/web: PASS.
- CI 37489975385: PASS — quality (doctor + audit + verify), database (PostgreSQL 17 + migrations + db:check + test:db) e e2e.
- main sincronizada com origin/main após o commit 92f6030; working tree limpo antes desta sincronização final de contexto.


## Follow-up da revisão final

### 01 — Error handling global
- onError agora é registrado antes dos plugins/rotas montados via .use().
- validações em rotas montadas retornam ErrorResponse estável 422.
- exceções internas retornam INTERNAL_ERROR sanitizado sem vazar mensagens internas.
- teste auth integrado: PASS.
- API typecheck: PASS.
- commit: 142a573.

### 02 — Origin em entrypoints auth
- register/login/refresh/logout validam browser Origin contra CORS_ORIGINS.
- clientes server-to-server sem Origin continuam suportados.
- POST simple cross-site application/x-www-form-urlencoded em login: 403.
- browser Origin permitido: PASS.
- teste auth integrado: PASS.
- API typecheck: PASS.
- commit: 7aa4b4b.

### 03 — CI supply-chain
- runners fixados em ubuntu-24.04.
- actions/checkout v6 pinado em d23441a48e516b6c34aea4fa41551a30e30af803.
- oven-sh/setup-bun v2 pinado em 0c5077e51419868618aeaa5fe8019c62421857d6.
- YAML validado.
- commit: aa53f72.

### 04 — Bun-only frontend check
- svelte-check validado diretamente sob Bun 1.4.2.
- removida chamada explícita a node do script @vibe/web check.
- svelte-check: 0 erros/0 warnings.
- commit: 7f3a944.


### 05 — Gates finais
- auth integration focado: PASS, 2 testes / 47 expects.
- bun install --frozen-lockfile com Bun 1.4.2: PASS.
- doctor: PASS; apenas avisos locais não bloqueantes de .env/Docker/DB opcional.
- audit:ci: PASS; 1 advisory abaixo do threshold high.
- bun run verify: PASS; API/web 32 testes, 0 falhas.
- bun run test:e2e: PASS 4/4.
- openapi:check: PASS, 11 paths.
- bun run build: PASS.
- drizzle-kit check: PASS.
- YAML da CI: PASS; database/e2e/quality usam ubuntu-24.04.


### Fechamento do follow-up
- board board_8b411807-cef3-420a-bfab-e89932cb0e44: done 5/5.
- commit técnico final: cd61e32.
- push autorizado executado para origin/main.
- CI 37522476396: PASS — quality, database (PostgreSQL 17 + migrations + test:db) e e2e.
- validação local pós-push: frozen install PASS; doctor PASS; audit:ci PASS; verify PASS (32/32); E2E 4/4; drizzle-kit check PASS.


## Migração para Rspack — 2026-10-06
- decisão atual supersede a implementação SvelteKit/Vite descrita historicamente acima;
- web agora é Svelte 5 client-only com Rsbuild 2.2.12 e Rspack subjacente;
- @rsbuild/plugin-svelte 2.0.1 e @rsbuild/plugin-tailwindcss 2.0.3;
- build gera build/index.html + build/200.html e preserva static/_redirects;
- Vite, Vitest, SvelteKit e adapter-static removidos do grafo instalado do frontend;
- testes web migrados para Rstest 0.12.3 + adapter-rsbuild; 13/13 PASS;
- svelte-check: 0 erros / 0 warnings;
- Biome 2.5.15 permanece formatter/linter canônico.


### Gates finais da migração Rspack
- bun install --frozen-lockfile (Bun 1.4.2): PASS; 172 installs / 288 packages.
- doctor: PASS; confirma frontend bundler=Rspack e rsbuild.config.ts.
- architecture:check: PASS.
- Biome lint: PASS em 103 arquivos.
- audit:ci: PASS; nenhum high/critical.
- audit completo: 1 advisory moderate de esbuild <=0.24.2, exclusivamente via drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils; não pertence ao frontend.
- bun pm why @rspack/core: @rspack/core 2.2.8 via @rsbuild/core 2.2.12.
- bun pm why vite: nenhum pacote instalado.
- bun pm why @sveltejs/kit: nenhum pacote instalado.
- web Rstest: 13/13 PASS.
- svelte-check: 0 erros / 0 warnings.
- bun run verify: PASS; API 32/32, web 13/13, OpenAPI 11 paths e builds completos.
- bun run test:e2e: PASS 4/4 no dev server Rsbuild/Rspack.
- build web: PASS; build/index.html + build/200.html + assets Rspack.
- hook __vibeAuthClient de E2E: 0 ocorrências no bundle de produção.
- drizzle-kit check: PASS.
- TypeScript 7 continua adiado; único outdated, enquanto svelte-check atual permanece no baseline TS 6.
- commits da migração até aqui: 3e05c69, b5b537f, 7b66e21, 3e7a5f9.


### Publicação da migração Rspack
- push para origin/main executado no commit e211933.
- CI 37529736481: PASS.
- quality: doctor + audit:ci + verify PASS.
- database: PostgreSQL 17 + frozen install + migrations + db:check + test:db PASS.
- e2e: Playwright no Rsbuild dev server PASS.
- main sincronizada com origin/main após a publicação técnica.

## Proteção DB test e corridas de autenticação — 2026-11-04
- Pedido atual: implementar isolamento de testes PostgreSQL e corrigir corridas refresh/logout e multitab; criar regressões e validar tudo.
- Board: board_ed4e58d7-34ba-4d52-922b-dc4694e6dfc5 (done); card: task_f3e319fb-510a-411d-a5f3-db2fe0cc5dee (done, 6/6).
- Estado de partida: main com alterações pré-existentes em bun.lock, CI, README, docs/TESTING.md e AGENT_CONTEXT.md da remediação undici. Todas preservadas.
- Terminais gerenciados: nenhum para esta tarefa.
- Decisões: test:db agora exige NODE_ENV=test, TEST_DATABASE_URL explícita igual a DATABASE_URL e nome *_test, confirma current_database() e limpa somente usuário criado pelo teste; CI usa PostgreSQL 17 banco vibe_test. Removido TRUNCATE global.
- Concorrência backend: refresh/replay/logout adquirem mesmo pg_advisory_xact_lock transacional derivado de familyId. Logout de cookie antigo revoga a família inteira, inclusive descendentes recém rotacionados.
- Concorrência frontend: Web Locks serializam operações de cookie entre abas do mesmo origin; logout sinalizado por BroadcastChannel e storage para invalidar access token das demais abas. Fallback sem Web Locks preserva single-flight local, sem garantia de serialização cross-tab em navegadores antigos.
- Arquivos desta tarefa: apps/api/tests/test-db-safety.ts e .test.ts, auth.postgres.integration.ts, auth.repository.ts, auth.routes.ts, auth.routes.integration.test.ts, core/rate-limit.ts (reset para testes), apps/web/src/lib/auth/coordinator.ts, client.ts, src/test/setup.ts, tests/e2e/auth-client.spec.ts, CI, docs/AUTH.md, TESTING.md, OPERATIONS.md e este AGENT_CONTEXT.md.
- Validações: bun run verify PASS com Node 24 temporário no PATH: 36 API, 13 web, TypeScript/Svelte, arquitetura, secret scan, Biome, OpenAPI e builds. Playwright 8/8 PASS desktop/mobile, incluindo duas regressões multitab. bun run audit:ci PASS, frozen install PASS, drizzle-kit check PASS, CI YAML PASS, git diff --check PASS. Execução deliberada de test:db sem TEST_DATABASE_URL falhou antes de acessar banco (fail-closed comprovado).
- Publicação 1: commit c057aa2 enviado para origin/main; GitHub Actions run 41862200097 concluído em failure: quality PASS, e2e PASS, database FAIL por HTTP 429 (rate limit) no teste PostgreSQL concorrente em apps/api/tests/auth.postgres.integration.ts:200. O runner PostgreSQL 17 funcionou, mas a regressão de concorrência não chegou ao assert de revogação.
- Correção atual autorizada ("continua"): resetar somente buckets de rate limit entre fases independentes do teste PostgreSQL, usando a seam resetRateLimitBucketsForTests já existente e import dinâmico somente APÓS o guard de database isolado. Não alterar limites de produção. Não criar automações; usuário cancelou a anterior.
- Publicação 2: commit 151db4a enviado para origin/main, resetando contador apenas entre fases independentes do teste PostgreSQL. Workflow GitHub Actions https://github.com/FlokiTV/bun-svelte-template/actions/runs/41870016977 concluiu SUCCESS: quality PASS, database PostgreSQL 17 vibe_test PASS (1 teste, 23 assertions), e2e PASS. Corridas refresh/logout e replay foram exercitadas em PostgreSQL real.
- Validação local após patch: bun run verify PASS (36 testes API, 13 web, lint, arquitetura, types, OpenAPI e builds); Playwright 8/8 PASS; Biome patch PASS; git diff --check PASS.
- Estado final: alterações produtivas e de regressão publicadas, board/card concluídos. O usuário cancelou a automação anterior; não ativar nem criar novo monitoramento.
- Próximo passo exato: nenhum para as etapas 1 e 2; se necessário, apenas revisar os commits e a CI já verde.

## Correção de advisories undici — 2026-11-04
- Pedido atual: corrigir quatro advisories high de undici transitivo de jsdom, manter compatibilidade e executar auditoria e todos os testes.
- Board: board_e94c8eca-d9d4-4cbc-b6b6-248243dadc98 (done).
- Card: task_088f1b56-26fc-48fd-b9a6-08afde1d6cfb (done, checklist 5/5).
- Terminais gerenciados: nenhum iniciado para esta tarefa.
- Estado: git inicialmente limpo; jsdom@30.1.2 exigia undici@^8.11.2 e lock continha 8.11.2. Atualizado para undici@8.12.2, sem alterar dependências diretas nem mudar a arquitetura. Bun local 1.4.0, projeto/CI Bun 1.4.2.
- Compatibilidade: Rstest usa Node pelo shebang. Node local 22.12.0 fica abaixo de jsdom 30 (mínimo 22.22.2) e não expõe createZstdDecompress; testes falharam ao carregar sem Node atualizado. Testes passaram em Node 24.21.0 temporário, sem trocar instalação global. CI quality/e2e agora fixam Node 24.21.0 via setup-node v6.3.0 pinado.
- Arquivos alterados: bun.lock, .github/workflows/ci.yml, README.md, docs/TESTING.md, AGENT_CONTEXT.md. Sem commit e sem push.
- Validações: audit:ci PASS, zero high/critical em 230 pacotes; bun audit completo registra só 1 moderate preexistente de esbuild 0.18.20 via drizzle-kit. bun install --frozen-lockfile PASS. bun run verify PASS com Node 24.21.0 no PATH: 32 API + 13 web, lint, types, OpenAPI 11 rotas, builds. test:e2e 4/4 PASS (desktop/mobile). doctor PASS com avisos Docker/.env. YAML CI parse PASS e git diff --check PASS.
- Bloqueios: ausência de Docker/.env/DATABASE_URL e banco de testes descartável impediu a execução segura de apps/api test:db local; job CI PostgreSQL 17 existe, mas nova execução remota não foi disparada.
- Próximo passo exato: revisar diff, commit/push quando autorizado e observar jobs quality/database/e2e na CI.

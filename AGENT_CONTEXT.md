# Agent Context

- Última atualização: 2026-09-30T20:53:00-03:00
- Pasta de trabalho: C:\Users\Dz\Desktop\bun-svelte-vibecode-template

## Pedido atual do usuário
Revisar o template, testar o fluxo real em execução, preparar um banco Supabase de teste e validar o template. Depois, testar todas as requisições e fluxos relevantes.

## Board e card
- Board: board_a2bc0b21-72f7-437d-a648-2e072c87b8be — bun-svelte-vibecode-template
- Card: task_abc47f20-2d47-4c34-ac04-9bb1a8531c94 — concluído.

## Trabalho concluído
- Dependências instaladas e bun.lock gerado.
- Baseline Biome normalizado e configuração migrada.
- Biome ignora artefatos gerados (.svelte-kit/build/dist/coverage/playwright-report/test-results), tornando verify idempotente.
- Corrigida tipagem do scripts/db-local.ts.
- Corrigida compatibilidade do auth JWT com @elysiajs/jwt 1.4.2.
- Corrigido acesso seguro ao refresh cookie.
- Corrigido logging de erros Elysia.
- Corrigido Playwright localhost versus 127.0.0.1.
- Corrigido .gitignore para versionar migrations Drizzle.
- Supabase CLI inicializado em supabase/config.toml.
- Migration Drizzle gerada em apps/api/drizzle/0000_brainy_solo.sql.
- Migration endurecida para Supabase com RLS e REVOKE para anon/authenticated.
- docs/OPERATIONS.md e apps/api/.env.example documentam Supabase local/cloud.
- Adicionado teste HTTP completo permanente em apps/api/src/modules/auth/auth.routes.integration.test.ts.
- Adicionada cobertura permanente de GET /ready e 404 em apps/api/src/core/ops.routes.test.ts.

## Supabase de teste
- Projeto: bun-svelte-vibecode-template-test
- Project ref: wdtsykjsosdcnmnmfydz
- Região: sa-east-1
- Custo informado: US$ 0/mês
- Status: ACTIVE_HEALTHY
- Migration initial_auth_schema aplicada com sucesso.
- Tabelas public.users e public.auth_sessions criadas.
- RLS ativo nas duas tabelas.
- anon e authenticated sem DML.
- FK auth_sessions.user_id -> users.id com ON DELETE CASCADE validada.
- Fluxo de persistência real validado via SQL no Supabase:
  - criação de usuário
  - bloqueio de email duplicado
  - criação de sessão
  - rotação de sessão
  - rejeição de replay de sessão revogada
  - revogação de sessão no logout
  - cascade cleanup
- O teste limpou os dados: 0 usuários e 0 sessões de validação restantes.
- Advisor de performance: sem achados.
- Advisor de segurança: apenas INFO rls_enabled_no_policy, esperado porque Data API está deliberadamente bloqueada para estas tabelas.

## Cobertura HTTP/API
Rotas OpenAPI confirmadas:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- POST /api/v1/example/echo
- GET /api/v1/health/
- GET /health
- GET /ready
- GET /meta
- WS /ws

Auth HTTP real via Elysia app.handle:
- register válido
- register inválido -> 422
- email duplicado -> 409
- senha incorreta -> 401
- login válido
- email case-insensitive
- /me sem Bearer -> 401
- /me com Bearer inválido -> 401
- /me com Bearer válido -> 200
- refresh válido
- refresh token rotacionado
- replay do refresh antigo -> 401
- logout -> 200
- refresh após logout -> 401
- cookie HttpOnly, SameSite=Lax e Path=/api/v1/auth validados

Realtime:
- API real iniciada na porta 3000.
- WebSocket ws://localhost:3000/ws testado pela rede.
- connection.ready recebido.
- echo de "ping" recebido corretamente.
- servidor temporário encerrado após o teste.

## Validações finais
- bun run verify: PASS
  - architecture: PASS
  - secrets: PASS
  - lint: PASS
  - typecheck: PASS
  - API tests: 19 pass / 0 fail / 69 asserts
  - web Vitest: 1 pass
  - OpenAPI: 11 paths válidos
  - builds: PASS
- bun run test:e2e: PASS
  - mobile-chromium: PASS
  - desktop-chromium: PASS

## Observações
- A integração Supabase não fornece a senha/DATABASE_URL do Postgres e bloqueou a tentativa de provisionar um login PostgreSQL dedicado. Portanto, o runtime local da API não foi conectado diretamente ao Postgres hospedado nesta rodada.
- Mesmo assim, o comportamento HTTP completo foi testado com o repositório isolado mantendo o contrato real, enquanto a máquina de estados de persistência/constraints foi testada separadamente no Supabase real.
- Esta cópia do workspace não contém .git, então não houve commit/push.
- package.json declara Bun 1.4.2; o PC executou Bun 1.3.14. Verify e E2E passaram mesmo assim.

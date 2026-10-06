# Agent Context

- Última atualização: 2026-10-06T08:57:30-03:00
- Pasta de trabalho: D:\DEV\bun-svelte-template

## Pedido atual do usuário
Executar todos os ajustes do board, sempre commitando as mudanças e testando tudo antes de avançar.

## Board e card
- Board: board_4bc8a982-5a76-4ded-8544-6c66bcfcc27c — bun-svelte-template — Auth hardening & review follow-up
- Status: active
- Card atual: task_e7d9a6c3-e9a1-4394-9f50-f2add39df746 — 01 — Restaurar baseline determinístico do workspace — in_progress.

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
- AGENT_CONTEXT.md — sincronizado com o novo board e o plano atual.
- Nenhum arquivo de código foi alterado.

## Validações
Revisão anterior desta rodada:
- git status --short --branch: main...origin/main, limpo.
- bun --version: 1.4.0; packageManager do projeto: bun@1.4.2.
- bun run verify: architecture PASS, secrets PASS, interrompido no lint por dependências locais ausentes.
- bun.lock contém as dependências transitivas que faltam localmente, compatível com instalação incompleta e não necessariamente lockfile defeituoso.
- Checks/testes/builds parciais também bloquearam por dependências ausentes nos node_modules locais.

## Bloqueios
- Nenhum bloqueio de planejamento.
- Para implementação/validação confiável, primeiro restaurar o ambiente com Bun 1.4.2 e instalação frozen coerente com bun.lock.

## Próximo passo exato
Restaurar o baseline determinístico com Bun 1.4.2 e instalação frozen; rodar doctor/verify/E2E, registrar o resultado e commitar antes de avançar para o card 02.

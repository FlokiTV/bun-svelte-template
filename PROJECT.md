# Product Context — definição necessária antes do lançamento

Este repositório continua sendo uma **fundação genérica para SaaS**, não um
produto comercial especificado. Não inventar fluxos de negócio nem monetização.

## Objetivo do produto

**Pendente de definição pelo proprietário:** que problema o SaaS resolve,
para quem e com qual resultado verificável.

## Usuários e regras de acesso

- Perfil de cliente e fluxo principal: **a definir**.
- Um usuário por conta vs. empresas/equipes com múltiplos usuários: **a definir**.
- Autorização, isolamento entre clientes (tenancy) e papéis: **a definir**.
- Retenção, exclusão e portabilidade de dados: **a definir**.

## Escopo implementado

- Módulo opcional JWT, autenticação e banco PostgreSQL com testes reais.
- Interface inicial de conta em `/account`: entrar, registrar em desenvolvimento,
  restaurar sessão por cookie HttpOnly e sair.
- API e frontend independentes com teste de qualidade, browser e referência de
  implantação single-instance em `deploy/`.
- Cadastro público **fechado por padrão em produção**.

## Escopo ainda não implementado

- [ ] Valor principal do SaaS (fluxo de negócio específico e modelo de dados).
- [ ] Área de trabalho do cliente, permissões e isolamento entre contas/empresas.
- [ ] Verificação de e-mail, recuperação de senha, antispam e suporte.
- [ ] Assinaturas/cobrança, impostos, notas, planos e enforcement dos limites.
- [ ] Termos, aviso de privacidade, processo de exclusão e revisão LGPD.
- [ ] Domínio, hosting, DNS, observabilidade, backups externos e restore ensaiado.

## Regra de lançamento

**Nenhum usuário pagante ou cadastro público até que `docs/LAUNCH.md` seja
revisado, os bloqueios acima sejam resolvidos e a infraestrutura seja validada
com o provedor real.**

## Critérios de qualidade

- Mobile first e acessibilidade nos fluxos principais.
- Validação no servidor, testes E2E, banco real em CI e proteção de segredos.
- Uma revisão de segurança e operacional antes do primeiro cliente.

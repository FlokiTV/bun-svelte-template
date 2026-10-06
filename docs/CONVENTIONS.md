# Convenções

## TypeScript

- `strict` ligado.
- Evite `any`.
- Não use `as unknown as X` para silenciar modelagem ruim.
- Tipos públicos devem ter nomes claros.
- IDs são `string` por padrão.

## API

Versão base:

```text
/api/v1
```

Rotas em plural quando representam recursos:

```text
/api/v1/projects
/api/v1/projects/:id
```

Respostas de erro devem ser previsíveis:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request"
  }
}
```

## Módulos

Evite classes quando funções/objetos resolvem.

Um módulo começa pequeno:

```text
feature.model.ts
feature.service.ts
feature.routes.ts
feature.test.ts
```

Adicione repository, jobs ou adapters somente quando aparecer necessidade real.

## Svelte

- Svelte 5.
- Preferir runes atuais.
- Componentes pequenos.
- Props explícitas.
- Não esconder requests dentro de componentes puramente visuais.
- Não transformar cada valor em store global.

## Tailwind

Mobile first:

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

O estilo sem prefixo é a experiência mobile.

## Dependências

Antes de adicionar uma lib, pergunte:
- browser já resolve?
- Bun já resolve?
- Svelte já resolve?
- Elysia já resolve?

Se sim, evite a dependência.

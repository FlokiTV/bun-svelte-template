# Performance mobile

Performance é requisito, não etapa final.

## Orçamento inicial

Metas de partida, ajustáveis conforme o produto:

- JS inicial: idealmente abaixo de 70 KB gzip; evitar ultrapassar 100 KB sem justificativa.
- Carregar rotas/features pesadas sob demanda.
- Não adicionar bibliotecas grandes para tarefas pequenas.
- Imagens e vídeos devem ter variantes adequadas ao dispositivo.
- `loading="lazy"` fora da viewport.
- Evitar listas infinitas mantendo centenas de elementos pesados no DOM.

## Regras

- O frontend é estático.
- Nenhuma dependência backend deve parar no bundle web.
- Imports de contratos devem usar `import type` quando possível.
- Prefira CSS/Tailwind a soluções CSS-in-JS com runtime.
- Testar em viewport mobile realista.
- Evitar trabalho caro em scroll.
- WebSocket não deve disparar re-render global desnecessário.

## Medição

Antes de otimizar, medir:
- tamanho de chunks;
- LCP;
- INP;
- CLS;
- requests na primeira navegação;
- memória durante scroll longo.

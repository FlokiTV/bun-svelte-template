<script lang="ts">
import { onMount } from "svelte";
import { getHealth } from "$lib/api/client";
import ApiStatus from "$lib/components/ApiStatus.svelte";

let apiState = $state<"loading" | "online" | "offline">("loading");
let latencyMs = $state<number | undefined>(undefined);

onMount(() => {
  const controller = new AbortController();

  void (async () => {
    const startedAt = performance.now();

    try {
      await getHealth(controller.signal);
      latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      apiState = "online";
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        apiState = "offline";
      }
    }
  })();

  return () => controller.abort();
});
</script>

<svelte:head>
  <title>Vibe Template</title>
  <meta
    name="description"
    content="Svelte estático + Bun/Elysia, preparado para desenvolvimento assistido por IA."
  >
</svelte:head>

<main class="min-h-dvh px-4 py-8 sm:px-6 md:py-14">
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-8">
    <header class="flex flex-col gap-5">
      <div
        class="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs
          font-medium text-white/60"
      >
        Bun + Svelte · static first
      </div>

      <div class="max-w-3xl">
        <h1 class="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Um template com trilhos fortes para vibe coding.
        </h1>

        <p class="mt-4 max-w-2xl text-pretty text-base leading-7 text-white/55 sm:text-lg">
          Frontend estático e mobile-first, API Bun/Elysia independente, contratos explícitos,
          testes e contexto de arquitetura para agentes.
        </p>
      </div>
    </header>

    <ApiStatus state={apiState} {latencyMs} />

    <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
      {#each [
   ["Frontend", "Svelte 5 + Tailwind 4, sem SSR."],
   ["Backend", "Bun + Elysia + OpenAPI."],
   ["Qualidade", "Biome, testes unitários e Playwright."],
 ] as item}
        <article class="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 class="font-medium text-white">{item[0]}</h2>
          <p class="mt-2 text-sm leading-6 text-white/50">{item[1]}</p>
        </article>
      {/each}
    </section>

    <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Próximo passo</p>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
        Remova o módulo <code class="text-white">example</code>, descreva a primeira feature com
        critérios de aceite e peça ao agente para seguir <code class="text-white">AGENTS.md</code>.
      </p>
    </section>
  </div>
</main>

<script lang="ts">
type State = "loading" | "online" | "offline";

let {
  state,
  latencyMs,
}: {
  state: State;
  latencyMs: number | undefined;
} = $props();

const labels: Record<State, string> = {
  loading: "Verificando API…",
  online: "API online",
  offline: "API indisponível",
};
</script>

<div
  class="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5
    px-4 py-3"
  aria-live="polite"
>
  <div class="flex min-w-0 items-center gap-3">
    <span
      class={[
  "size-2.5 shrink-0 rounded-full",
  state === "online" && "bg-emerald-400",
  state === "loading" && "bg-amber-300",
  state === "offline" && "bg-red-400",
]}
    ></span>

    <span class="truncate text-sm font-medium text-white">{labels[state]}</span>
  </div>

  {#if state === "online" && latencyMs !== undefined}
    <span class="text-xs tabular-nums text-white/50">{latencyMs} ms</span>
  {/if}
</div>

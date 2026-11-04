<script lang="ts">
import type { AuthSessionResponse } from "@vibe/contracts";
import { onMount } from "svelte";
import { ApiError } from "#lib/api/errors";
import { login, logout, refreshAccessToken, register } from "#lib/auth/client";

const registrationEnabled =
  import.meta.env.DEV || import.meta.env.PUBLIC_REGISTRATION_ENABLED === "true";
type User = AuthSessionResponse["user"];
type Mode = "login" | "register";

let mode = $state<Mode>("login");
let email = $state("");
let password = $state("");
let user = $state<User | null>(null);
let checking = $state(true);
let busy = $state(false);
let errorMessage = $state("");
let successMessage = $state("");

onMount(() => {
  let mounted = true;
  void (async () => {
    try {
      const session = await refreshAccessToken();
      if (mounted) user = session.user;
    } catch {
      // No refresh cookie is the normal first-visit state.
    } finally {
      if (mounted) checking = false;
    }
  })();
  return () => {
    mounted = false;
  };
});

function changeMode(next: Mode) {
  mode = next;
  password = "";
  errorMessage = "";
  successMessage = "";
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "E-mail ou senha incorretos.";
    if (error.status === 409) return "Este e-mail já está cadastrado.";
    if (error.status === 429) return "Muitas tentativas. Tente novamente mais tarde.";
    if (error.status === 422) return "Confira os dados informados.";
  }
  return "Não foi possível concluir a solicitação. Tente novamente.";
}

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (busy || checking) return;
  busy = true;
  errorMessage = "";
  successMessage = "";
  try {
    const session =
      mode === "login" ? await login(email, password) : await register(email, password);
    user = session.user;
    password = "";
  } catch (error) {
    errorMessage = errorText(error);
  } finally {
    busy = false;
  }
}

async function signOut() {
  if (busy) return;
  busy = true;
  errorMessage = "";
  successMessage = "";
  try {
    await logout();
    successMessage = "Sessão encerrada.";
  } catch {
    // Logout invalidates local access immediately even if the API is offline.
    successMessage = "Acesso local encerrado. A revogação remota não foi confirmada.";
  } finally {
    user = null;
    password = "";
    mode = "login";
    busy = false;
  }
}
</script>

<main class="min-h-dvh px-4 py-8 sm:px-6 sm:py-16">
  <div class="mx-auto max-w-4xl">
    <a
      href="/"
      class="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
    >
      <span aria-hidden="true">←</span>
      Voltar
    </a>

    <div class="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-14">
      <section>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Acesso seguro
        </p>
        <h1 class="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Sua conta,<br>sob controle.
        </h1>
        <p class="mt-5 max-w-sm text-sm leading-7 text-white/60">
          Sessões protegidas por cookies HttpOnly, renovação de acesso e logout em todas as abas.
          Seus tokens de acesso não são guardados no armazenamento do navegador.
        </p>
        <p class="mt-8 text-xs leading-6 text-white/40">
          Esta é uma área de conta demonstrativa. O produto, a cobrança e as funcionalidades
          comerciais serão definidos antes da abertura ao público.
        </p>
      </section>

      <section
        class="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/15 sm:p-8"
        aria-label="Área de autenticação"
      >
        {#if checking}
          <div role="status" class="py-16 text-center text-sm text-white/70">
            Verificando sua sessão…
          </div>
        {:else if user}
          <div class="flex items-center gap-3">
            <div
              class="grid size-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"
              aria-hidden="true"
            >
              ✓
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                Conectado
              </p>
              <h2 class="text-xl font-semibold">Área da conta</h2>
            </div>
          </div>
          <dl class="mt-8 space-y-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div>
              <dt class="text-xs text-white/50">E-mail</dt>
              <dd class="mt-1 break-all text-sm font-medium">{user.email}</dd>
            </div>
            <div>
              <dt class="text-xs text-white/50">Identificador da conta</dt>
              <dd class="mt-1 break-all font-mono text-xs text-white/70">{user.id}</dd>
            </div>
          </dl>
          {#if successMessage}
            <p role="status" class="mt-5 text-sm text-emerald-300">{successMessage}</p>
          {/if}
          <button
            type="button"
            disabled={busy}
            onclick={signOut}
            class="mt-8 w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
          >
            {busy ? "Encerrando…" : "Sair da conta"}
          </button>
        {:else}
          <fieldset class="flex gap-2 rounded-xl bg-black/25 p-1" aria-label="Tipo de acesso">
            <button
              type="button"
              aria-pressed={mode === "login"}
              onclick={() => changeMode("login")}
              class={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/10 ${mode === "login" ? "bg-white/15" : ""}`}
            >
              Entrar
            </button>
            {#if registrationEnabled}
              <button
                type="button"
                aria-pressed={mode === "register"}
                onclick={() => changeMode("register")}
                class={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/10 ${mode === "register" ? "bg-white/15" : ""}`}
              >
                Criar conta
              </button>
            {/if}
          </fieldset>
          <h2 class="mt-8 text-2xl font-semibold">
            {mode === "login" ? "Boas-vindas de volta" : "Crie sua conta"}
          </h2>
          <p class="mt-2 text-sm text-white/55">
            {mode === "login"
              ? "Entre com seu e-mail e sua senha."
              : "Use uma senha com pelo menos 8 caracteres."}
          </p>
          <form class="mt-7 space-y-5" onsubmit={submit}>
            <div>
              <label for="auth-email" class="mb-2 block text-sm font-medium">E-mail</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                autocomplete="email"
                required
                bind:value={email}
                placeholder="voce@exemplo.com"
                class="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
              >
            </div>
            <div>
              <label for="auth-password" class="mb-2 block text-sm font-medium">Senha</label>
              <input
                id="auth-password"
                type="password"
                name="password"
                autocomplete={mode === "login" ? "current-password" : "new-password"}
                required
                minlength="8"
                bind:value={password}
                class="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
              >
            </div>
            {#if errorMessage}
              <p
                role="alert"
                class="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
              >
                {errorMessage}
              </p>
            {/if}
            {#if successMessage}
              <p role="status" class="text-sm text-emerald-300">{successMessage}</p>
            {/if}
            <button
              type="submit"
              disabled={busy}
              class="w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? "Aguarde…" : mode === "login" ? "Entrar na conta" : "Criar minha conta"}
            </button>
          </form>
          <p class="mt-6 text-xs leading-6 text-white/40">
            Não reutilize senhas. A recuperação de acesso por e-mail ainda não foi ativada.
          </p>
        {/if}
      </section>
    </div>
  </div>
</main>

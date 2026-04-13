<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

const canSubmit = computed(() => {
  return email.value.trim().length > 0 && password.value.trim().length > 0 && !isLoading.value
})

const handleLogin = async () => {
  if (!canSubmit.value) return

  isLoading.value = true
  error.value = ''

  const result = await authStore.login(email.value, password.value)

  if (result.success) {
    router.push('/')
  } else {
    error.value = result.error || 'Erro ao fazer login'
  }

  isLoading.value = false
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
    <div class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/35 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-orange-300/28 blur-3xl"></div>

    <div class="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <section class="hidden min-h-[calc(100vh-4rem)] rounded-[2rem] border border-emerald-200/60 bg-[linear-gradient(160deg,rgba(6,95,70,0.98),rgba(5,150,105,0.92)_58%,rgba(16,185,129,0.88))] p-10 text-emerald-50 shadow-2xl shadow-emerald-900/25 lg:flex lg:flex-col lg:justify-between">
        <div>
          <span class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/90">
            Norte MT Sistemas
          </span>
          <h1 class="mt-8 max-w-xl text-4xl font-bold leading-tight tracking-tight">
            Atendimento WhatsApp com ritmo de operação, não de planilha.
          </h1>
          <p class="mt-5 max-w-lg text-sm leading-6 text-emerald-100/90">
            Centralize conversas, automações e time em uma experiência única, rápida e preparada para operação diária.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/80">Conversas</p>
            <p class="mt-1 text-2xl font-bold">+1.2k</p>
            <p class="mt-1 text-xs text-emerald-100/70">Fluxo ativo no dia</p>
          </div>
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/80">SLA médio</p>
            <p class="mt-1 text-2xl font-bold">04m</p>
            <p class="mt-1 text-xs text-emerald-100/70">Tempo de resposta</p>
          </div>
          <div class="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p class="text-xs uppercase tracking-[0.14em] text-emerald-100/80">Equipe</p>
            <p class="mt-1 text-2xl font-bold">18</p>
            <p class="mt-1 text-xs text-emerald-100/70">Agentes online</p>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] border border-slate-200/70 bg-white/90 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/20 sm:p-8">
        <div class="mb-8">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-lg font-bold text-white shadow-lg shadow-emerald-600/25">
            NM
          </div>
          <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Entrar na plataforma</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Acesse sua operação e acompanhe o atendimento em tempo real.
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div
            v-if="error"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/80 dark:bg-rose-900/25 dark:text-rose-300"
          >
            {{ error }}
          </div>

          <div class="space-y-1.5">
            <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-900/40"
              placeholder="seu@email.com"
            />
          </div>

          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="w-full rounded-2xl border border-slate-300/80 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-emerald-900/40"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 mr-2 my-2 rounded-xl px-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:from-emerald-700 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="isLoading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isLoading ? 'Validando acesso...' : 'Entrar agora' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isSidebarOpen = ref(false)
const isLoading = ref(true)
const isDarkMode = ref(false)
const searchQuery = ref('')
const viewportWidth = ref(1280)
const searchInputRef = ref<HTMLInputElement | null>(null)

const isMobile = computed(() => viewportWidth.value < 1024)

const navItems = computed(() => {
  const userRole = authStore.user?.role || ''

  if (userRole === 'agent' || userRole === 'viewer') {
    return [{ label: 'Fila de Conversas', to: '/operator/tickets' }]
  }

  const baseItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Conversas', to: '/tickets' },
    { label: 'Instancias', to: '/instances' },
    { label: 'Automacoes', to: '/flows' },
    { label: 'Configuracoes', to: '/settings' },
  ]

  if (userRole === 'admin' || userRole === 'manager') {
    return [...baseItems, { label: 'Admin • Usuarios', to: '/admin/users' }]
  }

  return baseItems
})

const filteredNavItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return navItems.value
  }

  return navItems.value.filter((item) => item.label.toLowerCase().includes(query))
})

const pageMeta = computed(() => {
  const metaByPath: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Dashboard', subtitle: 'Visao geral da operacao em tempo real' },
    '/tickets': { title: 'Conversas', subtitle: 'Fila de atendimento e historico de tickets' },
    '/operator/tickets': { title: 'Fila de Conversas', subtitle: 'Atendimento operacional e resposta ao cliente' },
    '/instances': { title: 'Instancias', subtitle: 'Conexoes ativas e status do WhatsApp' },
    '/flows': { title: 'Automacoes', subtitle: 'Fluxos, regras e jornadas de atendimento' },
    '/settings': { title: 'Configuracoes', subtitle: 'Preferencias da conta e da equipe' },
    '/admin/users': { title: 'Admin • Usuarios', subtitle: 'Gestao de acesso, permissao e status da equipe' },
  }

  return metaByPath[route.path] || {
    title: 'Painel Norte MT',
    subtitle: 'Operacao omnichannel em tempo real',
  }
})

const isAuthRoute = computed(() => route.path === '/login' || route.path === '/register')
const userName = computed(() => authStore.user?.name || 'Usuario')
const userRole = computed(() => authStore.user?.role || 'Perfil')

const applyTheme = (enabled: boolean) => {
  document.documentElement.classList.toggle('dark', enabled)
}

const syncViewport = () => {
  viewportWidth.value = window.innerWidth
}

const handleShortcutFocusSearch = (event: KeyboardEvent) => {
  if (event.key !== '/' || isAuthRoute.value) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }

  event.preventDefault()
  searchInputRef.value?.focus()
}

const setThemeFromStorage = () => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  isDarkMode.value = savedTheme ? savedTheme === 'dark' : prefersDark
  applyTheme(isDarkMode.value)
}

onMounted(async () => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  window.addEventListener('keydown', handleShortcutFocusSearch)

  setThemeFromStorage()
  isSidebarOpen.value = !isMobile.value

  await authStore.fetchUser()
  isLoading.value = false
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  window.removeEventListener('keydown', handleShortcutFocusSearch)
  document.body.style.overflow = ''
})

watch(isDarkMode, (value) => {
  localStorage.setItem('theme', value ? 'dark' : 'light')
  applyTheme(value)
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) {
      isSidebarOpen.value = false
    }
  }
)

watch([isSidebarOpen, isMobile], ([sidebarOpen, mobile]) => {
  document.body.style.overflow = mobile && sidebarOpen ? 'hidden' : ''
})

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const isActive = (target: string) => route.path === target
</script>

<template>
  <div class="min-h-screen text-slate-900 dark:text-slate-100">
    <router-view v-if="isAuthRoute" />

    <div
      v-else-if="isLoading"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/95 dark:bg-slate-950/95"
    >
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
          <svg class="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.042.767 3.903 2.038 5.317l1.962-2.026z" />
          </svg>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Carregando Norte MT...</p>
      </div>
    </div>

    <div v-else class="relative flex min-h-screen overflow-hidden p-2 md:p-4">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_48%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_44%)]"></div>

      <button
        v-if="isMobile && isSidebarOpen"
        class="fixed inset-0 z-20 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Fechar menu lateral"
        @click="closeSidebar"
      ></button>

      <aside
        :class="[
          'fixed inset-y-2 left-2 z-30 flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white/92 shadow-2xl shadow-slate-200/40 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/20 md:inset-y-4 md:left-4',
          isMobile
            ? isSidebarOpen
              ? 'w-72 translate-x-0'
              : 'pointer-events-none w-72 -translate-x-[110%]'
            : isSidebarOpen
              ? 'w-64'
              : 'w-16'
        ]"
      >
        <div class="flex h-16 items-center justify-between border-b border-slate-200/70 px-4 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/25">
              <span class="text-sm font-bold tracking-[0.18em]">NM</span>
            </div>
            <div v-if="isSidebarOpen" class="leading-tight">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">Norte MT</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Control Center</p>
            </div>
          </div>
        </div>

        <div v-if="isSidebarOpen" class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          Navegacao principal para operacao, atendimento e configuracao.
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <RouterLink
            v-for="item in filteredNavItems"
            :key="item.to"
            :to="item.to"
            :title="item.label"
            :aria-label="item.label"
            :class="[
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.to)
                ? 'bg-gradient-to-r from-emerald-500/12 to-orange-400/12 text-emerald-700 ring-1 ring-emerald-400/30 dark:text-emerald-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            ]"
            @click="isMobile ? closeSidebar() : undefined"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span v-if="isSidebarOpen" class="whitespace-nowrap">{{ item.label }}</span>
          </RouterLink>
          <p v-if="!filteredNavItems.length" class="px-3 pt-3 text-xs text-slate-500 dark:text-slate-400">
            Nenhum item encontrado para "{{ searchQuery }}".
          </p>
        </nav>

        <div class="border-t border-slate-200/70 p-4 dark:border-slate-800">
          <div v-if="isSidebarOpen" class="text-center text-xs text-slate-500 dark:text-slate-400">
            © 2026 Norte MT Sistemas
          </div>
        </div>
      </aside>

      <div :class="['relative z-10 flex min-h-screen flex-1 flex-col transition-all duration-300', isSidebarOpen ? 'md:ml-64' : 'md:ml-16']">
        <header class="sticky top-2 z-20 mx-2 mt-2 flex min-h-16 items-center justify-between rounded-3xl border border-slate-200/70 bg-white/86 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/82 md:mx-4 md:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <button
              class="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              :aria-label="isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'"
              @click="toggleSidebar"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div class="hidden min-w-0 md:block">
              <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ pageMeta.title }}</p>
              <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ pageMeta.subtitle }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="hidden xl:block">
              <label class="relative block w-80">
                <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  ref="searchInputRef"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar menu (/)"
                  aria-label="Buscar item de menu"
                  class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-emerald-900/30"
                />
              </label>
            </div>

            <button
              class="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              :aria-label="isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'"
              @click="toggleDarkMode"
            >
              <svg v-if="isDarkMode" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20">
                {{ userName.charAt(0).toUpperCase() }}
              </div>
              <div class="hidden md:block">
                <p class="text-sm font-medium text-slate-900 dark:text-white">{{ userName }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ userRole }}</p>
              </div>
            </div>

            <button
              class="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              @click="handleLogout"
            >
              Sair
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <div class="mx-auto w-full max-w-7xl rounded-[2rem] border border-white/60 bg-white/78 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/72 md:p-6">
            <Transition name="page" mode="out-in">
              <router-view :key="route.fullPath" />
            </Transition>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

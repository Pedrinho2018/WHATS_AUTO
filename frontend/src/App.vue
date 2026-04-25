<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useDisplay } from 'vuetify'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const theme = useTheme()
const display = useDisplay()

const drawer = ref(false)
const isDarkMode = ref(false)
const searchQuery = ref('')

const isAuthRoute = computed(() => route.path === '/login')
const isMobile = computed(() => display.mdAndDown.value)
const userName = computed(() => authStore.user?.name || 'Usuario')

const navItems = computed(() => {
  const role = authStore.user?.role || ''

  if (role === 'agent' || role === 'viewer') {
    return [{ label: 'Fila de Conversas', to: '/operator/queue', icon: 'mdi-forum-outline' }]
  }

  const items = [
    { label: 'Dashboard', to: '/', icon: 'mdi-view-dashboard-outline' },
    { label: 'Conversas', to: '/tickets', icon: 'mdi-chat-processing-outline' },
    { label: 'Instancias', to: '/instances', icon: 'mdi-cellphone-link' },
    { label: 'Fluxos', to: '/builder', icon: 'mdi-sitemap' },
    { label: 'Configuracoes', to: '/settings', icon: 'mdi-cog-outline' },
  ]

  if (role === 'admin' || role === 'manager') {
    items.push({ label: 'Usuarios', to: '/admin/users', icon: 'mdi-account-group-outline' })
  }

  return items
})

const filteredNavItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return navItems.value
  return navItems.value.filter((item) => item.label.toLowerCase().includes(query))
})

const pageMeta = computed(() => {
  const map: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Dashboard', subtitle: 'Visao geral da operacao' },
    '/tickets': { title: 'Conversas', subtitle: 'Fila de atendimento e historico' },
    '/operator/queue': { title: 'Fila de Conversas', subtitle: 'Atendimento operacional' },
    '/instances': { title: 'Instancias', subtitle: 'Conectividade e status' },
    '/builder': { title: 'Fluxos', subtitle: 'Construtor de automacoes' },
    '/settings': { title: 'Configuracoes', subtitle: 'Preferencias da operacao' },
    '/admin/users': { title: 'Usuarios', subtitle: 'Controle de acesso da equipe' },
  }

  return map[route.path] || { title: 'Painel Norte MT', subtitle: 'Operacao em tempo real' }
})

const applyTheme = (enabled: boolean) => {
  document.documentElement.classList.toggle('dark', enabled)
  theme.global.name.value = enabled ? 'norteMtDark' : 'norteMtLight'
}

const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDarkMode.value = savedTheme ? savedTheme === 'dark' : prefersDark
  applyTheme(isDarkMode.value)
}

watch(isDarkMode, (value) => {
  localStorage.setItem('theme', value ? 'dark' : 'light')
  applyTheme(value)
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) {
      drawer.value = false
    }
  }
)

onMounted(() => {
  initTheme()
  drawer.value = !isMobile.value
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <v-app :class="['app-shell', { 'is-auth': isAuthRoute }]">
    <v-main>
      <router-view v-if="isAuthRoute" />

      <template v-else>
        <v-navigation-drawer
          v-model="drawer"
          :temporary="isMobile"
          class="app-drawer"
          color="surface"
          width="284"
        >
          <div class="brand-block">
            <v-avatar color="primary" size="38">
              <span class="text-subtitle-2 font-weight-bold">NM</span>
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">Norte MT</div>
              <div class="text-caption text-medium-emphasis">Whats Auto</div>
            </div>
          </div>

          <v-text-field
            v-model="searchQuery"
            class="mx-4 mb-2"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            placeholder="Buscar"
          />

          <v-list class="px-3" density="compact" nav>
            <v-list-item
              v-for="item in filteredNavItems"
              :key="item.to"
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.label"
              class="app-nav-item"
              rounded="lg"
              color="primary"
            />
          </v-list>
        </v-navigation-drawer>

        <v-app-bar class="app-topbar" color="surface" elevation="0">
          <v-app-bar-nav-icon @click="drawer = !drawer" />

          <v-toolbar-title>
            <div class="text-subtitle-1 font-weight-bold text-truncate">{{ pageMeta.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ pageMeta.subtitle }}</div>
          </v-toolbar-title>

          <v-spacer />

          <v-btn
            class="mr-2"
            :icon="isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            @click="isDarkMode = !isDarkMode"
          />

          <v-menu location="bottom end">
            <template #activator="{ props }">
              <v-btn v-bind="props" class="user-menu" variant="text">
                <v-avatar color="primary" size="30">
                  <span class="text-caption font-weight-bold">{{ userName.slice(0, 1).toUpperCase() }}</span>
                </v-avatar>
                <span class="ml-2 d-none d-sm-inline">{{ userName }}</span>
                <v-icon class="ml-1" icon="mdi-chevron-down" size="18" />
              </v-btn>
            </template>

            <v-list density="compact" min-width="220">
              <v-list-item :title="userName" :subtitle="authStore.user?.role || 'usuario'" prepend-icon="mdi-account-circle-outline" />
              <v-divider />
              <v-list-item title="Sair" prepend-icon="mdi-logout" @click="handleLogout" />
            </v-list>
          </v-menu>
        </v-app-bar>

        <v-container class="app-container" fluid>
          <Transition mode="out-in" name="page">
            <router-view :key="route.fullPath" />
          </Transition>
        </v-container>

        <v-footer app class="app-footer" color="transparent">
          <div class="text-caption text-medium-emphasis">© 2026 Norte MT Sistemas • v2026.04</div>
        </v-footer>
      </template>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-shell {
  background: rgb(var(--v-theme-background));
}

.app-drawer {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 16px;
}

.app-nav-item {
  margin-bottom: 4px;
}

.app-topbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.app-container {
  max-width: 1440px;
  padding: 24px;
}

.app-footer {
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
  padding-inline: 24px;
}

.user-menu {
  text-transform: none;
}

@media (max-width: 960px) {
  .app-container {
    padding: 16px;
  }
}
</style>

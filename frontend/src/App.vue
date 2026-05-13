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
    { label: 'Onboarding', to: '/onboarding', icon: 'mdi-rocket-launch-outline' },
    { label: 'Conversas', to: '/tickets', icon: 'mdi-chat-processing-outline' },
    { label: 'Instancias', to: '/instances', icon: 'mdi-cellphone-link' },
    { label: 'Templates', to: '/templates', icon: 'mdi-message-text-outline' },
    { label: 'Fluxos', to: '/builder', icon: 'mdi-sitemap' },
    { label: 'Diagnostico', to: '/diagnostics', icon: 'mdi-stethoscope' },
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
    '/onboarding': { title: 'Onboarding', subtitle: 'Implantacao guiada de cliente' },
    '/tickets': { title: 'Conversas', subtitle: 'Fila de atendimento e historico' },
    '/operator/queue': { title: 'Fila de Conversas', subtitle: 'Atendimento operacional' },
    '/instances': { title: 'Instancias', subtitle: 'Conectividade e status' },
    '/builder': { title: 'Fluxos', subtitle: 'Construtor de automacoes' },
    '/diagnostics': { title: 'Diagnostico', subtitle: 'Eventos operacionais e saude' },
    '/settings': { title: 'Configuracoes', subtitle: 'Preferencias da operacao' },
    '/templates': { title: 'Templates', subtitle: 'Mensagens padronizadas da equipe' },
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
          class="app-drawer glass-drawer"
          width="284"
        >
          <div class="brand-block">
            <div class="logo-wrapper">
              <v-avatar class="gradient-avatar" size="38">
                <span class="text-subtitle-2 font-weight-bold">NM</span>
              </v-avatar>
            </div>
            <div>
              <div class="text-subtitle-2 font-weight-bold gradient-text">Norte MT</div>
              <div class="text-caption text-medium-emphasis">Whats Auto</div>
            </div>
          </div>

          <div class="search-wrapper">
            <v-text-field
              v-model="searchQuery"
              class="modern-search"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              placeholder="Buscar"
            />
          </div>

          <v-list class="px-3" density="compact" nav>
            <v-list-item
              v-for="item in filteredNavItems"
              :key="item.to"
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.label"
              class="app-nav-item"
              rounded="lg"
            />
          </v-list>

          <div class="drawer-footer">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="text-caption">Sistema Online</span>
            </div>
          </div>
        </v-navigation-drawer>

        <v-app-bar class="app-topbar glass-topbar" elevation="0">
          <v-app-bar-nav-icon class="menu-icon" @click="drawer = !drawer" />

          <v-toolbar-title>
            <div class="text-subtitle-1 font-weight-bold text-truncate">{{ pageMeta.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ pageMeta.subtitle }}</div>
          </v-toolbar-title>

          <v-spacer />

          <v-btn
            class="theme-toggle mr-2"
            :icon="isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            @click="isDarkMode = !isDarkMode"
          />

          <v-menu location="bottom end">
            <template #activator="{ props }">
              <v-btn v-bind="props" class="user-menu" variant="text">
                <v-avatar class="gradient-avatar" size="30">
                  <span class="text-caption font-weight-bold">{{ userName.slice(0, 1).toUpperCase() }}</span>
                </v-avatar>
                <span class="ml-2 d-none d-sm-inline">{{ userName }}</span>
                <v-icon class="ml-1" icon="mdi-chevron-down" size="18" />
              </v-btn>
            </template>

            <v-list class="user-dropdown" density="compact" min-width="220">
              <v-list-item :title="userName" :subtitle="authStore.user?.role || 'usuario'" prepend-icon="mdi-account-circle-outline" />
              <v-divider />
              <v-list-item class="logout-item" title="Sair" prepend-icon="mdi-logout" @click="handleLogout" />
            </v-list>
          </v-menu>
        </v-app-bar>

        <v-container class="app-container" fluid>
          <Transition mode="out-in" name="page">
            <router-view :key="route.fullPath" />
          </Transition>
        </v-container>

        <v-footer app class="app-footer" color="transparent">
          <div class="text-caption text-medium-emphasis footer-content">
            © 2026 Norte MT Sistemas • v2026.04
          </div>
        </v-footer>
      </template>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-shell {
  background: rgb(var(--v-theme-background));
}

.glass-drawer {
  background: var(--glass-background) !important;
  backdrop-filter: var(--glass-blur);
  border-right: 1px solid rgba(var(--v-border-color), 0.1);
}

:deep(.glass-drawer .v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.logo-wrapper {
  position: relative;
}

.gradient-avatar {
  background: var(--gradient-brand) !important;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 102, 204, 0);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(0, 102, 204, 0.3);
  }
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-wrapper {
  padding: 0 16px 12px;
}

.modern-search {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: var(--border-radius-md);
}

:deep(.modern-search .v-field) {
  background: rgba(var(--v-theme-surface), 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--v-border-color), 0.1);
  transition: all 0.3s ease;
}

:deep(.modern-search .v-field:hover) {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: var(--shadow-sm);
}

:deep(.modern-search .v-field--focused) {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.app-nav-item {
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

:deep(.app-nav-item .v-list-item__overlay) {
  transition: opacity 0.3s ease;
}

:deep(.app-nav-item:hover .v-list-item__overlay) {
  opacity: 0.08;
}

:deep(.app-nav-item--active) {
  background: var(--gradient-brand) !important;
  color: white;
}

:deep(.app-nav-item--active .v-list-item__overlay) {
  opacity: 0;
}

.drawer-footer {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success-500);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
}

.glass-topbar {
  background: var(--glass-background) !important;
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

.menu-icon {
  transition: transform 0.3s ease;
}

.menu-icon:hover {
  transform: rotate(90deg);
}

.theme-toggle {
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  transform: rotate(180deg);
}

.user-menu {
  text-transform: none;
  transition: all 0.3s ease;
}

.user-menu:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.user-dropdown {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-xl);
}

.logout-item:hover {
  background: rgba(var(--v-theme-error), 0.08);
}

.app-container {
  max-width: 1440px;
  padding: 24px;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.app-footer {
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
  padding-inline: 24px;
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 960px) {
  .app-container {
    padding: 16px;
  }
}

@media (prefers-color-scheme: dark) {
  .glass-drawer {
    background: rgba(18, 18, 18, 0.7) !important;
  }

  .glass-topbar,
  .app-footer {
    background: rgba(18, 18, 18, 0.7) !important;
  }
}
</style>

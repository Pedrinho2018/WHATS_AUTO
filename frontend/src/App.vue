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
const helpDialog = ref(false)

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
    { label: 'Construtor de Fluxos', to: '/builder', icon: 'mdi-sitemap' },
    { label: 'Configuracoes', to: '/settings', icon: 'mdi-cog-outline' },
  ]

  if (role === 'admin' || role === 'manager') {
    items.push({ label: 'Admin • Usuarios', to: '/admin/users', icon: 'mdi-account-group-outline' })
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
    '/builder': { title: 'Construtor de Fluxos', subtitle: 'Gerencie sua arvore de conversacao visualmente' },
    '/settings': { title: 'Configuracoes', subtitle: 'Preferencias da operacao' },
    '/admin/users': { title: 'Admin • Usuarios', subtitle: 'Controle de acesso da equipe' },
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
  <v-app>
    <v-main>
      <router-view v-if="isAuthRoute" />

      <template v-else>
        <v-navigation-drawer
          v-model="drawer"
          :temporary="isMobile"
          color="surface"
          elevation="2"
          rounded="xl"
        >
          <v-list-item class="py-3" prepend-avatar="/favicon.svg" title="Norte MT" subtitle="Control Center" />

          <v-divider class="my-2" />

          <v-list density="comfortable" nav>
            <v-list-item
              v-for="item in filteredNavItems"
              :key="item.to"
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.label"
              rounded="xl"
              color="primary"
            />
          </v-list>

          <template #append>
            <div class="pa-3">
              <v-btn block color="secondary" prepend-icon="mdi-lifebuoy" variant="tonal" @click="helpDialog = true">
                Central de Ajuda
              </v-btn>
            </div>
          </template>
        </v-navigation-drawer>

        <v-app-bar color="surface" elevation="1" rounded="xl">
          <v-app-bar-nav-icon @click="drawer = !drawer" />

          <v-toolbar-title>
            <div class="text-subtitle-1 font-weight-bold">{{ pageMeta.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ pageMeta.subtitle }}</div>
          </v-toolbar-title>

          <v-spacer />

          <v-text-field
            v-model="searchQuery"
            class="mr-3"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            rounded="pill"
            style="max-width: 320px;"
            variant="outlined"
            placeholder="Buscar menu"
          />

          <v-btn
            class="mr-2"
            :icon="isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            @click="isDarkMode = !isDarkMode"
          />

          <v-chip class="mr-2" color="primary" prepend-icon="mdi-account-circle" variant="tonal">
            {{ userName }}
          </v-chip>

          <v-btn prepend-icon="mdi-logout" variant="text" @click="handleLogout">
            Sair
          </v-btn>
        </v-app-bar>

        <v-container class="py-6" fluid>
          <v-sheet border class="pa-4 pa-md-6" color="surface" rounded="xl">
            <Transition mode="out-in" name="page">
              <router-view :key="route.fullPath" />
            </Transition>
          </v-sheet>
        </v-container>

        <v-footer app class="px-6" color="transparent">
          <div class="text-caption text-medium-emphasis">© 2026 Norte MT Sistemas • v2026.04</div>
        </v-footer>

        <v-dialog v-model="helpDialog" max-width="620">
          <v-card rounded="xl">
            <v-card-title class="text-h6">Guia rapido da interface</v-card-title>
            <v-card-text>
              <v-list lines="two">
                <v-list-item title="Navegacao" subtitle="Use o menu lateral para alternar entre as telas essenciais do sistema." />
                <v-list-item title="Fluxo recomendado" subtitle="1) Conectar instancias 2) Atender conversas 3) Monitorar indicadores no dashboard." />
                <v-list-item title="Perfis" subtitle="Admin e manager acessam gestao completa; agent e viewer atuam na fila operacional." />
              </v-list>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" variant="flat" @click="helpDialog = false">Entendi</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </template>
    </v-main>
  </v-app>
</template>

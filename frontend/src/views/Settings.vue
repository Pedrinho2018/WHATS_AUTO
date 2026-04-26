<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue3-toastify'
import { useAuthStore } from '../stores/auth'
import { UiSectionHeader } from '../components/ui'

const authStore = useAuthStore()

const storageKey = 'whatsauto-settings-toggles'
const savedAtKey = 'whatsauto-settings-toggles-saved-at'

const toggles = ref([
  { nome: 'Receber alerta de fila alta', ativo: true, icon: 'mdi-bell-ring' },
  { nome: 'Distribuicao automatica de tickets', ativo: true, icon: 'mdi-robot' },
  { nome: 'Modo silencio fora do horario', ativo: false, icon: 'mdi-moon-waning-crescent' },
])

const lastSavedAt = ref('')

const activeToggles = computed(() => toggles.value.filter((item) => item.ativo).length)

onMounted(() => {
  const rawToggles = localStorage.getItem(storageKey)
  const savedAt = localStorage.getItem(savedAtKey)

  if (rawToggles) {
    try {
      const parsed = JSON.parse(rawToggles)
      if (Array.isArray(parsed)) {
        toggles.value = parsed
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }

  if (savedAt) {
    lastSavedAt.value = savedAt
  }
})

const saveSettings = () => {
  const formatted = dayjs().format('DD/MM/YYYY HH:mm')
  localStorage.setItem(storageKey, JSON.stringify(toggles.value))
  localStorage.setItem(savedAtKey, formatted)
  lastSavedAt.value = formatted
  toast.success('Preferências salvas com sucesso.')
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <UiSectionHeader title="Configuracoes" subtitle="Ajustes da sua operacao e preferencias da equipe." compact />

      <div class="stats-badge glass">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ activeToggles }} de {{ toggles.length }} automações ativas</span>
      </div>
    </div>
    
    <div class="settings-grid">
      <div class="account-card glass">
        <div class="card-header">
          <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 class="card-title gradient-text">Conta</h2>
        </div>

        <div class="account-details">
          <div class="detail-item">
            <div class="detail-label">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Empresa
            </div>
            <div class="detail-value">{{ authStore.company?.name || 'Nao informado' }}</div>
          </div>

          <div class="detail-item">
            <div class="detail-label">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Plano
            </div>
            <div class="detail-value">
              <span class="plan-badge">{{ authStore.company?.plan || 'Nao informado' }}</span>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-label">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Subdominio
            </div>
            <div class="detail-value">{{ authStore.company?.subdomain || 'Nao informado' }}</div>
          </div>

          <div v-if="lastSavedAt" class="detail-item">
            <div class="detail-label">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Último ajuste
            </div>
            <div class="detail-value time-value">{{ lastSavedAt }}</div>
          </div>
        </div>
      </div>

      <div class="automations-card glass">
        <div class="card-header">
          <div class="header-left">
            <svg class="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 class="card-title gradient-text">Automacoes</h2>
          </div>
          <button
            type="button"
            class="btn-save gradient-btn"
            @click="saveSettings"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Salvar preferências
          </button>
        </div>

        <div class="toggles-list">
          <div 
            v-for="(item, index) in toggles" 
            :key="item.nome" 
            class="toggle-item"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="toggle-info">
              <div class="toggle-icon" :class="{ 'toggle-active': item.ativo }">
                <svg v-if="item.ativo" class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span class="toggle-name">{{ item.nome }}</span>
            </div>

            <button
              type="button"
              class="toggle-button"
              :class="{ 'toggle-button-active': item.ativo }"
              @click="item.ativo = !item.ativo"
            >
              <span class="toggle-slider" :class="{ 'toggle-slider-active': item.ativo }"></span>
              <span class="toggle-label">{{ item.ativo ? 'Ativo' : 'Inativo' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fade-in 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .page-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-radius: var(--border-radius-md);
  width: fit-content;
}

.glass {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
  transition: all 0.3s ease;
}

.glass:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  box-shadow: var(--shadow-lg);
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-md {
  width: 1.5rem;
  height: 1.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 1280px) {
  .settings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.account-card,
.automations-card {
  padding: 1.5rem;
  animation: slide-up 0.6s ease-out backwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.automations-card {
  animation-delay: 0.1s;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--gradient-brand);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  white-space: nowrap;
}

.gradient-btn:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.3);
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
}

.detail-item:hover {
  background: rgba(var(--v-theme-surface), 0.5);
  border-color: rgba(var(--v-border-color), 0.25);
  transform: translateX(4px);
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.detail-value {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  padding-left: 1.5rem;
}

.plan-badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  background: var(--gradient-brand);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  box-shadow: var(--shadow-sm);
}

.time-value {
  font-family: 'Courier New', monospace;
  font-size: 0.8125rem;
}

.toggles-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: rgba(var(--v-theme-surface), 0.3);
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: var(--border-radius-md);
  transition: all 0.3s ease;
  animation: slide-in 0.5s ease-out backwards;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toggle-item:hover {
  background: rgba(var(--v-theme-surface), 0.5);
  border-color: rgba(var(--v-border-color), 0.25);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.toggle-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-sm);
  color: rgba(var(--v-theme-on-surface), 0.5);
  transition: all 0.3s ease;
}

.toggle-active {
  background: var(--gradient-brand);
  border-color: transparent;
  color: white;
  box-shadow: 0 0 12px rgba(var(--color-primary-500), 0.4);
}

.toggle-name {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
}

.toggle-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem 0.375rem 2.5rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-button:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
}

.toggle-button-active {
  background: rgba(var(--color-success-500), 0.15);
  border-color: var(--color-success-500);
  color: var(--color-success-700);
}

.toggle-slider {
  position: absolute;
  left: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  background: rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.toggle-slider-active {
  left: calc(100% - 1.75rem);
  background: var(--color-success-500);
  box-shadow: 0 0 8px var(--color-success-500);
}

.toggle-label {
  min-width: 3.5rem;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7);
  }

  .detail-item,
  .toggle-item {
    background: rgba(30, 30, 30, 0.5);
  }
}
</style>

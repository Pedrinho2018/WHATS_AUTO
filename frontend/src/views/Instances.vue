<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { UiCard, UiSectionHeader } from '../components/ui'

interface Instance {
  id: number
  name: string
  phone?: string
  evolution_instance: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  qr_code?: string
  pairing_code?: string
  last_connected_at?: string
  updated_at?: string
}

const authStore = useAuthStore()
const instances = ref<Instance[]>([])
const loading = ref(true)
const actionLoadingById = ref<Record<number, boolean>>({})
const qrCodeById = ref<Record<number, string>>({})
const pairingCodeById = ref<Record<number, string>>({})
const qrMessageById = ref<Record<number, string>>({})

const form = ref({
  name: '',
  evolution_instance: '',
  phone: '',
})

const canManage = computed(() => ['admin', 'manager'].includes(authStore.user?.role || ''))

const statusLabel: Record<Instance['status'], string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  connecting: 'Conectando',
  error: 'Erro',
}

const statusDescription: Record<Instance['status'], string> = {
  connected: 'Número pronto para enviar e receber mensagens.',
  disconnected: 'Número sem sessão ativa. Gere um QR Code para conectar.',
  connecting: 'Aguardando leitura do QR Code ou pareamento.',
  error: 'A instância precisa de atenção antes de operar.',
}

const statusSummary = computed(() => {
  const total = instances.value.length
  const connected = instances.value.filter((instance) => instance.status === 'connected').length
  const connecting = instances.value.filter((instance) => instance.status === 'connecting').length
  const disconnected = instances.value.filter((instance) => instance.status === 'disconnected').length
  const error = instances.value.filter((instance) => instance.status === 'error').length

  return { total, connected, connecting, disconnected, error }
})

const formatDateTime = (value?: string): string => {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'Sem registro'
}

const getLastSyncLabel = (instance: Instance): string => {
  return formatDateTime(instance.updated_at || instance.last_connected_at)
}

const normalizeStatus = (value: unknown): Instance['status'] => {
  const status = String(value || '').toLowerCase()

  if (status.includes('open') || status.includes('connected')) {
    return 'connected'
  }

  if (status.includes('connect') || status.includes('pair')) {
    return 'connecting'
  }

  if (status.includes('close') || status.includes('disconnect')) {
    return 'disconnected'
  }

  return 'error'
}

const normalizeQrCode = (value: unknown): string => {
  const raw = String(value || '').trim()

  if (!raw) {
    return ''
  }

  if (raw.startsWith('data:image/')) {
    if (raw.startsWith('data:image/png;base64,QR_')) {
      return ''
    }

    return raw
  }

  const compact = raw.replace(/\s+/g, '')
  const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 100
  if (looksLikeBase64) {
    return `data:image/png;base64,${compact}`
  }

  return raw
}

const normalizePairingCode = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  if (raw.startsWith('data:image/')) {
    return ''
  }

  return raw
}

const loadInstances = async () => {
  try {
    const { data } = await api.get('/instances')
    instances.value = data

    const nextQrCodes = { ...qrCodeById.value }
    const nextPairingCodes = { ...pairingCodeById.value }
    for (const instance of data as Instance[]) {
      const normalized = normalizeQrCode(instance.qr_code)
      if (normalized) {
        nextQrCodes[instance.id] = normalized
      }

      const normalizedPairing = normalizePairingCode(instance.pairing_code)
      if (normalizedPairing) {
        nextPairingCodes[instance.id] = normalizedPairing
      }
    }
    qrCodeById.value = nextQrCodes
    pairingCodeById.value = nextPairingCodes

    await syncInstancesWithRevolution(data as Instance[])
  } finally {
    loading.value = false
  }
}

const syncInstancesWithRevolution = async (items: Instance[]) => {
  const nextInstances = await Promise.all(
    items.map(async (instance) => {
      try {
        const encodedName = encodeURIComponent(instance.evolution_instance)
        const { data } = await api.get(`/revolution/instances/${encodedName}/status`)
        const nextStatus = normalizeStatus(data?.status ?? data?.state ?? data?.connectionStatus ?? data?.instance?.status)

        if (nextStatus === 'error' && (qrCodeById.value[instance.id] || pairingCodeById.value[instance.id])) {
          return { ...instance, status: 'connecting' as const }
        }

        return nextStatus === instance.status ? instance : { ...instance, status: nextStatus }
      } catch {
        return instance
      }
    })
  )

  instances.value = nextInstances
}

const createInstance = async () => {
  if (!form.value.name || !form.value.evolution_instance) {
    return
  }

  await api.post('/instances', {
    name: form.value.name,
    evolution_instance: form.value.evolution_instance,
    phone: form.value.phone || undefined,
  })

  form.value = { name: '', evolution_instance: '', phone: '' }
  await loadInstances()
}

const setActionLoading = (id: number, value: boolean) => {
  actionLoadingById.value = {
    ...actionLoadingById.value,
    [id]: value,
  }
}

const fetchQrCode = async (instance: Instance) => {
  setActionLoading(instance.id, true)
  try {
    const encodedName = encodeURIComponent(instance.evolution_instance)
    const { data } = await api.get(`/revolution/instances/${encodedName}/qrcode`)
    const normalized = normalizeQrCode(data.qrCode)
    const pairingCode = normalizePairingCode(data.pairingCode || data.code)

    qrCodeById.value = {
      ...qrCodeById.value,
      [instance.id]: normalized,
    }

    pairingCodeById.value = {
      ...pairingCodeById.value,
      [instance.id]: pairingCode,
    }

    qrMessageById.value = {
      ...qrMessageById.value,
      [instance.id]: normalized || pairingCode
        ? ''
        : 'QR Code e PIN indisponíveis no momento. Se a instância já estiver conectada, desconecte na Evolution e gere um novo pareamento.',
    }
  } finally {
    setActionLoading(instance.id, false)
  }
}

const connectInstance = async (instance: Instance) => {
  setActionLoading(instance.id, true)
  try {
    const { data } = await api.post(`/instances/${instance.id}/connect`)
    const qrCode = normalizeQrCode(data?.revolution?.qrCode || data?.qr_code)
    const pairingCode = normalizePairingCode(data?.revolution?.pairingCode || data?.revolution?.code || data?.pairing_code)

    if (qrCode) {
      qrCodeById.value = {
        ...qrCodeById.value,
        [instance.id]: qrCode,
      }

      qrMessageById.value = {
        ...qrMessageById.value,
        [instance.id]: '',
      }
    }

    if (pairingCode) {
      pairingCodeById.value = {
        ...pairingCodeById.value,
        [instance.id]: pairingCode,
      }
    }

    await loadInstances()
  } finally {
    setActionLoading(instance.id, false)
  }
}

onMounted(async () => {
  await loadInstances()
})
</script>

<template>
  <div class="instances-page">
    <UiSectionHeader title="Instancias WhatsApp" subtitle="Gerencie conexoes e disponibilidade dos numeros." />

    <div class="status-overview">
      <div class="overview-tile glass">
        <span class="overview-label">Total</span>
        <strong>{{ statusSummary.total }}</strong>
      </div>
      <div class="overview-tile glass overview-connected">
        <span class="overview-label">Conectadas</span>
        <strong>{{ statusSummary.connected }}</strong>
      </div>
      <div class="overview-tile glass overview-connecting">
        <span class="overview-label">Pareando</span>
        <strong>{{ statusSummary.connecting }}</strong>
      </div>
      <div class="overview-tile glass overview-disconnected">
        <span class="overview-label">Desconectadas</span>
        <strong>{{ statusSummary.disconnected }}</strong>
      </div>
      <div class="overview-tile glass overview-error">
        <span class="overview-label">Com erro</span>
        <strong>{{ statusSummary.error }}</strong>
      </div>
    </div>

    <div v-if="canManage" class="create-instance-card glass">
      <h2 class="card-title gradient-text">Conectar novo numero</h2>
      <div class="form-grid">
        <input 
          v-model="form.name" 
          class="form-input" 
          placeholder="Nome da instância" 
        />
        <input 
          v-model="form.evolution_instance" 
          class="form-input" 
          placeholder="ID Evolution (instanceName)" 
        />
        <input 
          v-model="form.phone" 
          class="form-input" 
          placeholder="Telefone (opcional)" 
        />
        <button class="btn-create gradient-btn" @click="createInstance">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Salvar Instância
        </button>
      </div>
    </div>

    <UiCard v-if="loading" class="loading-card">
      <div class="loading-content">
        <div class="spinner"></div>
        Carregando instâncias...
      </div>
    </UiCard>
    
    <div v-else class="instances-grid">
      <div 
        v-for="(instance, index) in instances" 
        :key="instance.id" 
        class="instance-card glass"
        :style="{ animationDelay: `${index * 0.1}s` }"
      >
        <div class="instance-header">
          <div class="instance-info">
            <h3 class="instance-name">{{ instance.name }}</h3>
            <div class="status-indicator">
              <span 
                class="status-dot"
                :class="{
                  'status-connected': instance.status === 'connected',
                  'status-disconnected': instance.status === 'disconnected',
                  'status-connecting': instance.status === 'connecting',
                  'status-error': instance.status === 'error'
                }"
              ></span>
              <span class="status-label">{{ statusLabel[instance.status] }}</span>
            </div>
            <p class="status-description">{{ statusDescription[instance.status] }}</p>
          </div>
          <span 
            class="status-badge"
            :class="{
              'badge-connected': instance.status === 'connected',
              'badge-disconnected': instance.status === 'disconnected',
              'badge-connecting': instance.status === 'connecting',
              'badge-error': instance.status === 'error'
            }"
          >
            {{ statusLabel[instance.status] }}
          </span>
        </div>

        <div class="instance-details">
          <div class="detail-row">
            <svg class="icon-sm text-medium-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="detail-text">{{ instance.evolution_instance }}</span>
          </div>
          <div class="detail-row">
            <svg class="icon-sm text-medium-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span class="detail-text">{{ instance.phone || 'Sem telefone configurado' }}</span>
          </div>
          <div class="detail-row">
            <svg class="icon-sm text-medium-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="detail-text">Última sincronização: {{ getLastSyncLabel(instance) }}</span>
          </div>
          <div class="detail-row">
            <svg class="icon-sm text-medium-emphasis" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="detail-text">Última conexão: {{ formatDateTime(instance.last_connected_at) }}</span>
          </div>
        </div>

        <div v-if="canManage" class="instance-actions">
          <button
            class="btn-connect gradient-btn"
            :disabled="actionLoadingById[instance.id]"
            @click="connectInstance(instance)"
          >
            <div v-if="actionLoadingById[instance.id]" class="spinner-sm"></div>
            <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ actionLoadingById[instance.id] ? 'Conectando...' : 'Conectar na Evolution' }}
          </button>

          <button
            class="btn-qr"
            :disabled="actionLoadingById[instance.id]"
            @click="fetchQrCode(instance)"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Buscar QR Code
          </button>
        </div>

        <div v-if="qrCodeById[instance.id]" class="qr-code-panel">
          <div class="panel-header">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span class="panel-title">QR Code</span>
          </div>
          <img
            v-if="qrCodeById[instance.id].startsWith('data:image')"
            :src="qrCodeById[instance.id]"
            alt="QR Code da instância"
            class="qr-code-image"
          />
          <p v-else class="qr-code-text">{{ qrCodeById[instance.id] }}</p>
        </div>

        <div v-if="pairingCodeById[instance.id]" class="pairing-code-panel">
          <div class="panel-header">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span class="panel-title">PIN de pareamento</span>
          </div>
          <p class="pairing-code">{{ pairingCodeById[instance.id] }}</p>
        </div>

        <div v-if="qrMessageById[instance.id]" class="warning-message">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {{ qrMessageById[instance.id] }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instances-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.create-instance-card {
  padding: 1.5rem;
}

.status-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .status-overview {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.overview-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 5.5rem;
  padding: 1rem;
}

.overview-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.overview-tile strong {
  font-size: 1.75rem;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}

.overview-connected {
  border-color: rgba(var(--v-theme-success), 0.35);
}

.overview-connecting {
  border-color: rgba(var(--v-theme-primary), 0.35);
}

.overview-disconnected,
.overview-error {
  border-color: rgba(var(--v-theme-warning), 0.35);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.form-input {
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.form-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.form-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
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
}

.gradient-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.gradient-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-card {
  padding: 2rem;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  border-top-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.instances-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .instances-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .instances-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.instance-card {
  padding: 1.25rem;
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

.instance-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.instance-info {
  flex: 1;
}

.instance-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 0.5rem 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

.status-connected {
  background: var(--color-success-500);
  box-shadow: 0 0 8px var(--color-success-500);
}

.status-disconnected {
  background: var(--color-error-500);
}

.status-connecting {
  background: var(--color-primary-500);
  animation: pulse-dot 1s ease-in-out infinite;
}

.status-error {
  background: var(--color-warning-500);
}

.status-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.status-description {
  max-width: 28rem;
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-connected {
  background: rgba(var(--color-success-500), 0.15);
  color: var(--color-success-700);
}

.badge-disconnected {
  background: rgba(var(--color-error-500), 0.15);
  color: var(--color-error-700);
}

.badge-connecting {
  background: rgba(var(--color-primary-500), 0.15);
  color: var(--color-primary-700);
}

.badge-error {
  background: rgba(var(--color-warning-500), 0.15);
  color: var(--color-warning-700);
}

.instance-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.text-medium-emphasis {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.detail-text {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.instance-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.btn-connect {
  width: 100%;
}

.btn-qr {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-qr:hover:not(:disabled) {
  background: rgba(var(--v-theme-surface), 0.8);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.btn-qr:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.qr-code-panel,
.pairing-code-panel {
  padding: 1rem;
  background: rgba(var(--v-theme-surface), 0.3);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-md);
  margin-top: 1rem;
  animation: fade-in 0.5s ease-out;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.qr-code-image {
  display: block;
  max-height: 14rem;
  margin: 0 auto;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-md);
}

.qr-code-text {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  word-break: break-all;
}

.pairing-code {
  font-family: 'Courier New', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  color: rgb(var(--v-theme-on-surface));
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: var(--border-radius-md);
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(var(--color-warning-500), 0.1);
  border: 1px solid rgba(var(--color-warning-500), 0.3);
  border-radius: var(--border-radius-md);
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-warning-700);
}

@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7);
  }

  .qr-code-panel,
  .pairing-code-panel {
    background: rgba(30, 30, 30, 0.5);
  }

  .warning-message {
    background: rgba(var(--color-warning-500), 0.15);
    color: var(--color-warning-300);
  }
}
</style>

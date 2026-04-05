<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Instance {
  id: number
  name: string
  phone?: string
  evolution_instance: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  qr_code?: string
  pairing_code?: string
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
  <div class="space-y-5">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Instâncias WhatsApp</h1>
    <p class="text-gray-600 dark:text-gray-400 mt-2">Gerencie conexoes e disponibilidade dos numeros.</p>

    <div v-if="canManage" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Conectar novo numero</h2>
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input v-model="form.name" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder="Nome da instância" />
        <input v-model="form.evolution_instance" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder="ID Evolution (instanceName)" />
        <input v-model="form.phone" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder="Telefone (opcional)" />
        <button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="createInstance">
          Salvar Instância
        </button>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Carregando instâncias...
    </div>
    
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="instance in instances" :key="instance.id" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ instance.name }}</h3>
          <span class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="instance.status === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'"
          >
            {{ statusLabel[instance.status] }}
          </span>
        </div>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ instance.evolution_instance }}</p>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ instance.phone || 'Sem telefone configurado' }}</p>

        <button
          v-if="canManage"
          class="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          :disabled="actionLoadingById[instance.id]"
          @click="connectInstance(instance)"
        >
          {{ actionLoadingById[instance.id] ? 'Conectando...' : 'Conectar na Evolution' }}
        </button>

        <button
          v-if="canManage"
          class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          :disabled="actionLoadingById[instance.id]"
          @click="fetchQrCode(instance)"
        >
          Buscar QR Code
        </button>

        <div v-if="qrCodeById[instance.id]" class="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">QR Code</p>
          <img
            v-if="qrCodeById[instance.id].startsWith('data:image')"
            :src="qrCodeById[instance.id]"
            alt="QR Code da instância"
            class="mx-auto max-h-56 rounded"
          />
          <p v-else class="break-all text-xs text-slate-600 dark:text-slate-300">{{ qrCodeById[instance.id] }}</p>
        </div>

        <div v-if="pairingCodeById[instance.id]" class="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">PIN de pareamento</p>
          <p class="font-mono text-sm font-semibold tracking-widest text-slate-800 dark:text-slate-100">{{ pairingCodeById[instance.id] }}</p>
        </div>

        <p v-if="qrMessageById[instance.id]" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
          {{ qrMessageById[instance.id] }}
        </p>
      </div>
    </div>
  </div>
</template>
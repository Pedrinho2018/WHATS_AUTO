<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

interface Instance {
  id: number
  name: string
  evolution_instance: string
  phone?: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  qr_code?: string
}

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const createdCompanyId = ref<number | null>(null)
const instances = ref<Instance[]>([])
const selectedInstanceId = ref<number | null>(null)
const qrCode = ref('')
const testPhone = ref('')
const testText = ref('Mensagem de teste enviada pelo WHATS_AUTO.')

const companyForm = ref({
  name: '',
  subdomain: '',
  email: '',
  phone: '',
  plan: 'basic',
})

const adminForm = ref({
  name: '',
  email: '',
  password: '',
})

const instanceForm = ref({
  name: '',
  evolution_instance: '',
  phone: '',
})

const selectedInstance = computed(() => instances.value.find((item) => item.id === selectedInstanceId.value))
const currentCompanyReady = computed(() => Boolean(authStore.company?.id && authStore.user?.role === 'admin'))
const hasConnectedInstance = computed(() => instances.value.some((item) => item.status === 'connected'))

const onboardingSteps = computed(() => [
  {
    title: 'Empresa',
    done: Boolean(createdCompanyId.value || authStore.company?.id),
    detail: createdCompanyId.value ? `Empresa criada: #${createdCompanyId.value}` : authStore.company?.name || 'Cadastre ou confirme a empresa',
  },
  {
    title: 'Admin',
    done: Boolean(createdCompanyId.value ? adminForm.value.email : authStore.user?.role === 'admin'),
    detail: createdCompanyId.value ? adminForm.value.email || 'Crie o admin do cliente' : authStore.user?.email || 'Usuario admin',
  },
  {
    title: 'WhatsApp',
    done: hasConnectedInstance.value || Boolean(qrCode.value),
    detail: hasConnectedInstance.value ? 'Instancia conectada' : 'Conecte uma instancia',
  },
  {
    title: 'Teste',
    done: false,
    detail: 'Envie uma mensagem de validacao',
  },
])

const loadInstances = async () => {
  const { data } = await api.get('/instances')
  instances.value = Array.isArray(data) ? data : []
  selectedInstanceId.value = instances.value[0]?.id || null
}

const createCompany = async () => {
  saving.value = true
  try {
    const { data } = await api.post('/admin/companies', {
      ...companyForm.value,
      phone: companyForm.value.phone || undefined,
    })
    createdCompanyId.value = data.id
    toast.success('Empresa cadastrada.')
  } finally {
    saving.value = false
  }
}

const createClientAdmin = async () => {
  if (!createdCompanyId.value) {
    toast.warning('Cadastre a empresa antes de criar o admin.')
    return
  }

  saving.value = true
  try {
    await api.post('/admin/users', {
      ...adminForm.value,
      company_id: createdCompanyId.value,
      role: 'admin',
    })
    toast.success('Usuario admin criado.')
  } finally {
    saving.value = false
  }
}

const createInstance = async () => {
  saving.value = true
  try {
    await api.post('/instances', {
      ...instanceForm.value,
      phone: instanceForm.value.phone || undefined,
    })
    instanceForm.value = { name: '', evolution_instance: '', phone: '' }
    await loadInstances()
    toast.success('Instancia cadastrada.')
  } finally {
    saving.value = false
  }
}

const connectSelectedInstance = async () => {
  if (!selectedInstance.value) return

  saving.value = true
  try {
    const { data } = await api.post(`/instances/${selectedInstance.value.id}/connect`)
    qrCode.value = data?.revolution?.qrCode || data?.qr_code || ''
    await loadInstances()
    toast.success('Pareamento iniciado.')
  } finally {
    saving.value = false
  }
}

const sendTestMessage = async () => {
  if (!selectedInstance.value || !testPhone.value.trim()) {
    toast.warning('Selecione a instancia e informe o telefone de teste.')
    return
  }

  saving.value = true
  try {
    await api.post('/revolution/messages/text', {
      instanceName: selectedInstance.value.evolution_instance,
      to: testPhone.value.replace(/\D/g, ''),
      text: testText.value,
    })
    toast.success('Mensagem de teste enviada.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await loadInstances()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="onboarding-page">
    <div class="page-heading">
      <div>
        <p class="text-caption text-medium-emphasis mb-1">Implantacao</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold">Onboarding do cliente</h1>
      </div>
      <v-chip :color="currentCompanyReady ? 'success' : 'warning'" variant="tonal">
        {{ currentCompanyReady ? 'Conta pronta' : 'Revisar acesso' }}
      </v-chip>
    </div>

    <v-row dense>
      <v-col v-for="step in onboardingSteps" :key="step.title" cols="12" md="3">
        <v-card border elevation="0" class="step-card">
          <v-card-text>
            <v-icon :color="step.done ? 'success' : 'warning'" :icon="step.done ? 'mdi-check-circle-outline' : 'mdi-circle-outline'" />
            <strong>{{ step.title }}</strong>
            <span>{{ step.detail }}</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="loading" type="article, actions" />

    <template v-else>
      <v-row dense>
        <v-col cols="12" lg="6">
          <v-card border elevation="0">
            <v-card-title class="section-title">1. Cadastrar empresa</v-card-title>
            <v-card-text class="form-stack">
              <v-text-field v-model="companyForm.name" label="Nome da empresa" variant="outlined" hide-details="auto" />
              <v-text-field v-model="companyForm.subdomain" label="Subdominio" variant="outlined" hide-details="auto" />
              <v-text-field v-model="companyForm.email" label="Email comercial" variant="outlined" hide-details="auto" />
              <v-text-field v-model="companyForm.phone" label="Telefone" variant="outlined" hide-details="auto" />
              <v-select
                v-model="companyForm.plan"
                :items="['basic', 'professional', 'enterprise']"
                label="Plano"
                variant="outlined"
                hide-details="auto"
              />
              <v-btn color="primary" :loading="saving" @click="createCompany">Cadastrar empresa</v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="6">
          <v-card border elevation="0">
            <v-card-title class="section-title">2. Criar usuario admin</v-card-title>
            <v-card-text class="form-stack">
              <v-text-field v-model="adminForm.name" label="Nome do admin" variant="outlined" hide-details="auto" />
              <v-text-field v-model="adminForm.email" label="Email do admin" variant="outlined" hide-details="auto" />
              <v-text-field v-model="adminForm.password" label="Senha inicial" type="password" variant="outlined" hide-details="auto" />
              <v-alert v-if="!createdCompanyId" color="info" variant="tonal" density="compact">
                Primeiro cadastre a empresa para vincular o admin.
              </v-alert>
              <v-btn color="primary" :disabled="!createdCompanyId" :loading="saving" @click="createClientAdmin">
                Criar admin
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" lg="6">
          <v-card border elevation="0">
            <v-card-title class="section-title">3. Conectar WhatsApp da conta atual</v-card-title>
            <v-card-text class="form-stack">
              <v-alert color="warning" variant="tonal" density="compact">
                A conexao abaixo vale para a empresa logada. Para novo cliente, entre com o admin criado.
              </v-alert>
              <v-text-field v-model="instanceForm.name" label="Nome da instancia" variant="outlined" hide-details="auto" />
              <v-text-field v-model="instanceForm.evolution_instance" label="ID Evolution" variant="outlined" hide-details="auto" />
              <v-text-field v-model="instanceForm.phone" label="Telefone" variant="outlined" hide-details="auto" />
              <div class="d-flex ga-2">
                <v-btn variant="tonal" :loading="saving" @click="createInstance">Cadastrar instancia</v-btn>
                <v-btn color="primary" :disabled="!selectedInstance" :loading="saving" @click="connectSelectedInstance">Gerar QR Code</v-btn>
              </div>
              <v-select
                v-model="selectedInstanceId"
                :items="instances"
                item-title="name"
                item-value="id"
                label="Instancia"
                variant="outlined"
                hide-details="auto"
              />
              <img v-if="qrCode.startsWith('data:image')" :src="qrCode" class="qr-image" alt="QR Code" />
              <pre v-else-if="qrCode" class="qr-text">{{ qrCode }}</pre>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="6">
          <v-card border elevation="0">
            <v-card-title class="section-title">4. Testar mensagem</v-card-title>
            <v-card-text class="form-stack">
              <v-text-field v-model="testPhone" label="Telefone de teste com DDI/DDD" variant="outlined" hide-details="auto" />
              <v-textarea v-model="testText" label="Mensagem" rows="4" variant="outlined" hide-details="auto" />
              <v-btn color="success" :disabled="!selectedInstance" :loading="saving" @click="sendTestMessage">
                Enviar teste
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.onboarding-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.step-card span,
.step-card strong {
  display: block;
}

.step-card strong {
  margin-top: 8px;
}

.step-card span {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.82rem;
  margin-top: 2px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qr-image {
  width: min(240px, 100%);
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
}

.qr-text {
  white-space: pre-wrap;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface-variant), 0.35);
}
</style>

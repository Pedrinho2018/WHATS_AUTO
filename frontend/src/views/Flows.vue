<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import WorkflowBuilder from '../components/workflow/WorkflowBuilder.vue'
import {
  EMPTY_WORKFLOW_MODEL,
  getBlockDefinition,
  type WorkflowBlockType,
  type WorkflowModel,
} from '../components/workflow/types'

interface Flow {
  id: number
  name: string
  description?: string
  trigger_type: 'keyword' | 'greeting' | 'menu' | 'webhook' | 'schedule'
  is_active: boolean
  trigger_config?: Record<string, unknown>
  settings?: {
    sector?: string
    assignedAgentIds?: number[]
    source?: 'internal' | 'typebot'
    typebotUrl?: string | null
    typebotPublicId?: string | null
  }
}

interface User {
  id: number
  name: string
  role: string
}

const authStore = useAuthStore()
const flows = ref<Flow[]>([])
const agents = ref<User[]>([])
const loading = ref(true)
const savingWorkspace = ref(false)
const loadingWorkspace = ref(false)
const workspaceNotice = ref('')
const selectedFlowId = ref<number | null>(null)
const workspaceDraft = ref<WorkflowModel>({ ...EMPTY_WORKFLOW_MODEL })
const workspaceBase = ref<WorkflowModel>({ ...EMPTY_WORKFLOW_MODEL })

const canManage = computed(() => ['admin', 'manager'].includes(authStore.user?.role || ''))

const form = ref({
  name: '',
  description: '',
  source: 'internal' as 'internal' | 'typebot',
  typebot_url: '',
  trigger_type: 'keyword' as Flow['trigger_type'],
  sector: 'Geral',
  assignedAgentIds: [] as number[],
})

const getFlowSource = (flow: Flow | null): 'internal' | 'typebot' => {
  if (!flow) {
    return 'internal'
  }

  return flow.settings?.source === 'typebot' ? 'typebot' : 'internal'
}

const isWorkflowModel = (value: unknown): value is WorkflowModel => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const model = value as { nodes?: unknown; connections?: unknown }
  return Array.isArray(model.nodes) && Array.isArray(model.connections)
}

const normalizeWorkflowModel = (value: unknown): WorkflowModel => {
  if (!isWorkflowModel(value)) {
    return { ...EMPTY_WORKFLOW_MODEL }
  }

  return {
    nodes: modelNodes(value.nodes),
    connections: modelConnections(value.connections),
  }
}

const modelNodes = (nodes: unknown[]): WorkflowModel['nodes'] => {
  return nodes
    .map((node) => {
      if (!node || typeof node !== 'object') {
        return null
      }

      const data = node as { id?: unknown; type?: unknown; label?: unknown; category?: unknown; actionId?: unknown; x?: unknown; y?: unknown }
      if (
        typeof data.id !== 'string' ||
        typeof data.type !== 'string' ||
        typeof data.label !== 'string' ||
        typeof data.x !== 'number' ||
        typeof data.y !== 'number'
      ) {
        return null
      }

      const definition = getBlockDefinition(data.type as WorkflowBlockType)
      if (!definition) {
        return null
      }

      const validActionId = typeof data.actionId === 'string' && definition.actions.some((action) => action.id === data.actionId) ? data.actionId : null

      return {
        id: data.id,
        type: definition.type,
        label: data.label,
        category: definition.category,
        actionId: validActionId || definition.actions[0]?.id || null,
        x: data.x,
        y: data.y,
      }
    })
    .filter((node): node is WorkflowModel['nodes'][number] => Boolean(node))
}

const modelConnections = (connections: unknown[]): WorkflowModel['connections'] => {
  return connections
    .map((connection) => {
      if (!connection || typeof connection !== 'object') {
        return null
      }

      const data = connection as { id?: unknown; fromNodeId?: unknown; toNodeId?: unknown }
      if (typeof data.id !== 'string' || typeof data.fromNodeId !== 'string' || typeof data.toNodeId !== 'string') {
        return null
      }

      return {
        id: data.id,
        fromNodeId: data.fromNodeId,
        toNodeId: data.toNodeId,
      }
    })
    .filter((connection): connection is WorkflowModel['connections'][number] => Boolean(connection))
}

const setWorkspaceState = (model: WorkflowModel) => {
  const normalized = normalizeWorkflowModel(model)
  workspaceBase.value = normalized
  workspaceDraft.value = normalizeWorkflowModel(normalized)
}

const loadWorkspaceFromApi = async (flowId: number) => {
  const flow = flows.value.find((item) => item.id === flowId) || null
  if (getFlowSource(flow) === 'typebot') {
    setWorkspaceState({ ...EMPTY_WORKFLOW_MODEL })
    workspaceNotice.value = 'Fluxos Typebot usam o editor do Typebot. O workspace visual interno fica desativado.'
    loadingWorkspace.value = false
    return
  }

  loadingWorkspace.value = true
  workspaceNotice.value = ''

  try {
    const response = await api.get(`/flows/${flowId}/workspace`)
    const payload = response.data as { workspaceModel?: unknown }
    setWorkspaceState(normalizeWorkflowModel(payload.workspaceModel))
  } catch {
    setWorkspaceState({ ...EMPTY_WORKFLOW_MODEL })
    workspaceNotice.value = 'Nao foi possivel carregar o modelo visual deste fluxo.'
  } finally {
    loadingWorkspace.value = false
  }
}

const serializeWorkflowModel = (model: WorkflowModel) => {
  return JSON.stringify({
    nodes: [...model.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    connections: [...model.connections].sort((a, b) => a.id.localeCompare(b.id)),
  })
}

const selectedFlow = computed(() => {
  if (!selectedFlowId.value) {
    return null
  }

  return flows.value.find((flow) => flow.id === selectedFlowId.value) || null
})

const isTypebotFlow = computed(() => getFlowSource(selectedFlow.value) === 'typebot')

const isWorkspaceDirty = computed(() => {
  if (!selectedFlow.value || isTypebotFlow.value) {
    return false
  }

  return serializeWorkflowModel(workspaceBase.value) !== serializeWorkflowModel(workspaceDraft.value)
})

const loadData = async () => {
  try {
    const [flowsResp, usersResp] = await Promise.all([
      api.get('/flows'),
      api.get('/users').catch(() => ({ data: [] })),
    ])

    flows.value = flowsResp.data
    agents.value = (usersResp.data || []).filter((user: User) => ['agent', 'manager'].includes(user.role))

    if (!selectedFlowId.value && flows.value.length > 0) {
      selectedFlowId.value = flows.value[0].id
      await loadWorkspaceFromApi(flows.value[0].id)
    }

    if (selectedFlowId.value && !flows.value.some((flow) => flow.id === selectedFlowId.value)) {
      selectedFlowId.value = flows.value[0]?.id || null
    }

    if (selectedFlowId.value) {
      await loadWorkspaceFromApi(selectedFlowId.value)
    }
  } finally {
    loading.value = false
  }
}

const createFlow = async () => {
  if (!form.value.name) {
    return
  }

  if (form.value.source === 'typebot' && !form.value.typebot_url.trim()) {
    workspaceNotice.value = 'Informe a URL publica do Typebot para criar este fluxo.'
    return
  }

  await api.post('/flows', {
    ...form.value,
    typebot_url: form.value.source === 'typebot' ? form.value.typebot_url.trim() : undefined,
  })

  workspaceNotice.value = ''
  form.value = {
    name: '',
    description: '',
    source: 'internal',
    typebot_url: '',
    trigger_type: 'keyword',
    sector: 'Geral',
    assignedAgentIds: [],
  }

  await loadData()
}

const toggleFlow = async (flow: Flow) => {
  await api.patch(`/flows/${flow.id}`, { is_active: !flow.is_active })
  await loadData()
}

const selectFlowWorkspace = async (flowId: number) => {
  if (selectedFlowId.value === flowId) {
    return
  }

  if (isWorkspaceDirty.value) {
    const shouldDiscard = window.confirm('Existem alteracoes nao salvas neste fluxo. Deseja descartar e trocar mesmo assim?')
    if (!shouldDiscard) {
      return
    }
  }

  selectedFlowId.value = flowId
  await loadWorkspaceFromApi(flowId)
}

const handleFlowSelectChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  const flowId = Number(target?.value || '')

  if (!Number.isFinite(flowId) || flowId <= 0) {
    return
  }

  await selectFlowWorkspace(flowId)
}

const saveWorkspace = async () => {
  if (!selectedFlow.value || !canManage.value || isTypebotFlow.value) {
    return
  }

  savingWorkspace.value = true
  workspaceNotice.value = ''

  try {
    const response = await api.put(`/flows/${selectedFlow.value.id}/workspace`, {
      workspaceModel: workspaceDraft.value,
    })

    const payload = response.data as { workspaceModel?: unknown }
    setWorkspaceState(normalizeWorkflowModel(payload.workspaceModel))

    workspaceNotice.value = 'Modelo visual salvo com sucesso.'
  } catch {
    workspaceNotice.value = 'Nao foi possivel salvar o modelo visual.'
  } finally {
    savingWorkspace.value = false
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Automacoes</h1>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        Central de fluxos para chatbot, n8n e webhooks.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">Fluxos ativos</p>
        <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ flows.filter((f) => f.is_active).length }}</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total de fluxos</p>
        <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ flows.length }}</p>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">Setores mapeados</p>
        <p class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ new Set(flows.map((f) => f.settings?.sector || 'Geral')).size }}</p>
      </div>
    </div>

    <div v-if="canManage" class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Criar fluxo por setor e agente</h2>
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input v-model="form.name" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder="Nome do fluxo" />
        <select v-model="form.source" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">
          <option value="internal">Builder interno</option>
          <option value="typebot">Typebot</option>
        </select>
        <input v-model="form.sector" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" placeholder="Setor (ex: Vendas, Suporte)" />
        <input
          v-if="form.source === 'typebot'"
          v-model="form.typebot_url"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 md:col-span-2"
          placeholder="URL publica do Typebot (cloud ou self-host)"
        />
        <textarea v-model="form.description" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 md:col-span-2" rows="3" placeholder="Descrição" />
        <select v-model="form.trigger_type" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">
          <option value="keyword">Keyword</option>
          <option value="greeting">Saudação</option>
          <option value="menu">Menu</option>
          <option value="webhook">Webhook</option>
          <option value="schedule">Agendado</option>
        </select>
        <select v-model="form.assignedAgentIds" multiple class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
        </select>
      </div>
      <button class="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="createFlow">
        Salvar fluxo
      </button>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Workspace de workflow (arrastar e soltar)</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Monte o fluxo visual de cada automacao por espaco de trabalho. Fluxos Typebot sao gerenciados diretamente no Typebot.</p>
        </div>
        <div class="flex items-center gap-2">
          <select
            :value="selectedFlowId || ''"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            @change="handleFlowSelectChange"
          >
            <option disabled value="">Selecione um fluxo</option>
            <option v-for="flow in flows" :key="flow.id" :value="flow.id">
              {{ flow.name }}
            </option>
          </select>

          <button
            v-if="canManage"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="!selectedFlow || savingWorkspace || !isWorkspaceDirty || isTypebotFlow"
            @click="saveWorkspace"
          >
            {{ savingWorkspace ? 'Salvando...' : 'Salvar modelo' }}
          </button>
          <a
            v-if="selectedFlow?.settings?.typebotUrl"
            :href="selectedFlow.settings.typebotUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
          >
            Abrir no Typebot
          </a>
        </div>
      </div>

      <p v-if="workspaceNotice" class="mt-3 text-xs" :class="workspaceNotice.includes('sucesso') ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'">
        {{ workspaceNotice }}
      </p>
      <p v-else-if="isWorkspaceDirty" class="mt-3 text-xs text-amber-600 dark:text-amber-300">
        Ha alteracoes nao salvas no modelo visual.
      </p>

      <div class="mt-4">
        <div v-if="loadingWorkspace" class="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Carregando workspace do fluxo selecionado...
        </div>
        <div
          v-if="isTypebotFlow"
          class="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          Este fluxo foi configurado para origem Typebot.
          <span v-if="selectedFlow?.settings?.typebotPublicId"> Bot: {{ selectedFlow.settings.typebotPublicId }}.</span>
          Edite o fluxo diretamente no painel do Typebot e mantenha aqui apenas os metadados de roteamento.
        </div>
        <WorkflowBuilder v-else v-model="workspaceDraft" />
      </div>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Fluxos cadastrados</h2>
      <div v-if="loading" class="mt-4 text-sm text-gray-600 dark:text-gray-300">Carregando fluxos...</div>
      <div v-else class="mt-4 space-y-3">
        <div v-if="flows.length === 0" class="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
          Nenhum fluxo cadastrado.
        </div>

        <div
          v-for="flow in flows"
          :key="flow.id"
          class="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ flow.name }}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Setor: {{ flow.settings?.sector || 'Geral' }} • Trigger: {{ flow.trigger_type }}
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              Origem: {{ flow.settings?.source === 'typebot' ? 'Typebot' : 'Builder interno' }}
            </p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="flow.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'">
            {{ flow.is_active ? 'Ativo' : 'Inativo' }}
          </span>
          <button v-if="canManage" class="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800" @click="toggleFlow(flow)">
            Alternar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import WorkflowBlockPalette from './WorkflowBlockPalette.vue'
import WorkflowCanvas from './WorkflowCanvas.vue'
import {
  createNodeFromType,
  EMPTY_WORKFLOW_MODEL,
  getActionDefinition,
  getBlockDefinition,
  getCategoryLabel,
  generateNodeId,
  type WorkflowBlockType,
  type WorkflowModel,
} from './types'

const props = defineProps<{
  modelValue?: WorkflowModel | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: WorkflowModel): void
}>()

const selectedNodeId = defineModel<string | null>('selectedNodeId', { default: null })
const connectFromNodeId = defineModel<string | null>('connectFromNodeId', { default: null })

const model = computed<WorkflowModel>(() => {
  return props.modelValue || EMPTY_WORKFLOW_MODEL
})

const updateModel = (next: WorkflowModel) => {
  emit('update:modelValue', next)
}

const addNode = (type: WorkflowBlockType, x = 24, y = 24) => {
  const node = createNodeFromType(type, x, y)
  updateModel({
    nodes: [...model.value.nodes, node],
    connections: [...model.value.connections],
  })
  selectedNodeId.value = node.id
}

const handleNodeDrop = (payload: { type: WorkflowBlockType; x: number; y: number }) => {
  addNode(payload.type, payload.x, payload.y)
}

const handleNodeMove = (payload: { nodeId: string; x: number; y: number }) => {
  updateModel({
    nodes: model.value.nodes.map((node) => {
      if (node.id !== payload.nodeId) {
        return node
      }

      return {
        ...node,
        x: payload.x,
        y: payload.y,
      }
    }),
    connections: [...model.value.connections],
  })
}

const selectedNode = computed(() => {
  return model.value.nodes.find((node) => node.id === selectedNodeId.value) || null
})

const selectedNodeDefinition = computed(() => {
  if (!selectedNode.value) {
    return null
  }

  return getBlockDefinition(selectedNode.value.type) || null
})

const selectedNodeActionLabel = computed(() => {
  if (!selectedNode.value) {
    return ''
  }

  return getActionDefinition(selectedNode.value.type, selectedNode.value.actionId)?.label || 'Sem acao'
})

const updateSelectedNode = (updater: (node: WorkflowModel['nodes'][number]) => WorkflowModel['nodes'][number]) => {
  if (!selectedNodeId.value) {
    return
  }

  updateModel({
    nodes: model.value.nodes.map((node) => {
      if (node.id !== selectedNodeId.value) {
        return node
      }

      return updater(node)
    }),
    connections: [...model.value.connections],
  })
}

const updateSelectedNodeLabel = (label: string) => {
  updateSelectedNode((node) => ({
    ...node,
    label,
  }))
}

const updateSelectedNodeAction = (actionId: string | null) => {
  updateSelectedNode((node) => ({
    ...node,
    actionId,
  }))
}

const handleSelectedNodeLabelInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  updateSelectedNodeLabel(target?.value || '')
}

const handleSelectedNodeActionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  const actionId = target?.value || ''
  updateSelectedNodeAction(actionId || null)
}

const deleteSelectedNode = () => {
  if (!selectedNodeId.value) {
    return
  }

  const nodeId = selectedNodeId.value

  updateModel({
    nodes: model.value.nodes.filter((node) => node.id !== nodeId),
    connections: model.value.connections.filter((connection) => connection.fromNodeId !== nodeId && connection.toNodeId !== nodeId),
  })

  selectedNodeId.value = null
  if (connectFromNodeId.value === nodeId) {
    connectFromNodeId.value = null
  }
}

const selectNode = (nodeId: string) => {
  selectedNodeId.value = nodeId

  if (!connectFromNodeId.value || connectFromNodeId.value === nodeId) {
    return
  }

  const exists = model.value.connections.some((connection) => connection.fromNodeId === connectFromNodeId.value && connection.toNodeId === nodeId)
  if (!exists) {
    updateModel({
      nodes: [...model.value.nodes],
      connections: [
        ...model.value.connections,
        {
          id: generateNodeId(),
          fromNodeId: connectFromNodeId.value,
          toNodeId: nodeId,
        },
      ],
    })
  }

  connectFromNodeId.value = null
}

const startConnection = () => {
  if (!selectedNodeId.value) {
    return
  }

  connectFromNodeId.value = selectedNodeId.value
}

const cancelConnection = () => {
  connectFromNodeId.value = null
}

const removeConnection = (connectionId: string) => {
  updateModel({
    nodes: [...model.value.nodes],
    connections: model.value.connections.filter((connection) => connection.id !== connectionId),
  })
}

const autoArrange = () => {
  const columns = 3
  const horizontalGap = 220
  const verticalGap = 130

  updateModel({
    nodes: model.value.nodes.map((node, index) => ({
      ...node,
      x: 20 + (index % columns) * horizontalGap,
      y: 20 + Math.floor(index / columns) * verticalGap,
    })),
    connections: [...model.value.connections],
  })
}

const clearConnections = () => {
  updateModel({
    nodes: [...model.value.nodes],
    connections: [],
  })
  connectFromNodeId.value = null
}

const clearModel = () => {
  updateModel({
    nodes: [],
    connections: [],
  })
  selectedNodeId.value = null
  connectFromNodeId.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const isTyping = target ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable : false

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId.value && !isTyping) {
    event.preventDefault()
    deleteSelectedNode()
    return
  }

  if (event.key === 'Escape') {
    connectFromNodeId.value = null
    selectedNodeId.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr_260px]">
    <WorkflowBlockPalette @add-block="addNode" />

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
        <button
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          :disabled="!selectedNodeId"
          @click="startConnection"
        >
          {{ connectFromNodeId ? 'Escolha o destino...' : 'Conectar selecionado' }}
        </button>
        <button
          v-if="connectFromNodeId"
          class="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/10"
          @click="cancelConnection"
        >
          Cancelar conexao
        </button>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" @click="autoArrange">
          Auto organizar
        </button>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" @click="clearConnections">
          Limpar conexoes
        </button>
        <button class="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-500/10" @click="clearModel">
          Limpar canvas
        </button>
      </div>

      <WorkflowCanvas
        :nodes="model.nodes"
        :connections="model.connections"
        :selected-node-id="selectedNodeId"
        :connect-from-node-id="connectFromNodeId"
        @drop-block="handleNodeDrop"
        @select-node="selectNode"
        @move-node="handleNodeMove"
        @remove-connection="removeConnection"
        @clear-selection="selectedNodeId = null"
      />
    </div>

    <aside class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
      <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Propriedades</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Edite o bloco selecionado e organize os passos.</p>

      <div v-if="selectedNode" class="mt-4 space-y-3">
        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400">Rotulo do bloco</label>
        <input
          :value="selectedNode.label"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          @input="handleSelectedNodeLabelInput"
        />

        <div class="rounded-lg bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Tipo: {{ selectedNode.type }}
        </div>

        <div class="rounded-lg bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Categoria: {{ getCategoryLabel(selectedNode.category) }}
        </div>

        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400">Acao do bloco</label>
        <select
          :value="selectedNode.actionId || ''"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          @change="handleSelectedNodeActionChange"
        >
          <option value="">Sem acao</option>
          <option v-for="action in selectedNodeDefinition?.actions || []" :key="action.id" :value="action.id">
            {{ action.label }}
          </option>
        </select>

        <p class="text-[11px] text-slate-500 dark:text-slate-400">Acao atual: {{ selectedNodeActionLabel }}</p>

        <button class="w-full rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-500/10" @click="deleteSelectedNode">
          Remover bloco
        </button>
      </div>

      <div v-if="model.connections.length > 0" class="mt-4 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Conexoes</p>
        <p class="text-[11px] text-slate-500 dark:text-slate-400">Clique na linha no canvas para remover.</p>
      </div>

      <div v-if="!selectedNode" class="mt-4 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Selecione um bloco para editar.
      </div>
    </aside>
  </div>
</template>

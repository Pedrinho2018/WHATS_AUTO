<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WorkflowBlockType, WorkflowConnection, WorkflowNode } from './types'
import { getActionDefinition, getCategoryLabel, WORKFLOW_BLOCKS } from './types'

const props = defineProps<{
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  selectedNodeId: string | null
  connectFromNodeId?: string | null
}>()

const emit = defineEmits<{
  (event: 'drop-block', payload: { type: WorkflowBlockType; x: number; y: number }): void
  (event: 'select-node', nodeId: string): void
  (event: 'move-node', payload: { nodeId: string; x: number; y: number }): void
  (event: 'remove-connection', connectionId: string): void
  (event: 'clear-selection'): void
}>()

const canvasRef = ref<HTMLElement | null>(null)
const isDragOver = ref(false)

const getNodeCenter = (node: WorkflowNode) => ({
  x: node.x + 86,
  y: node.y + 36,
})

const lines = computed(() => {
  return props.connections
    .map((connection) => {
      const fromNode = props.nodes.find((node) => node.id === connection.fromNodeId)
      const toNode = props.nodes.find((node) => node.id === connection.toNodeId)

      if (!fromNode || !toNode) {
        return null
      }

      const from = getNodeCenter(fromNode)
      const to = getNodeCenter(toNode)

      return {
        id: connection.id,
        fromNodeId: connection.fromNodeId,
        toNodeId: connection.toNodeId,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      }
    })
    .filter((line): line is { id: string; fromNodeId: string; toNodeId: string; x1: number; y1: number; x2: number; y2: number } => Boolean(line))
})

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  isDragOver.value = true
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  if (!canvasRef.value || !event.dataTransfer) {
    return
  }

  const type = event.dataTransfer.getData('application/x-workflow-block') as WorkflowBlockType
  if (!type) {
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()
  emit('drop-block', {
    type,
    x: Math.max(12, event.clientX - rect.left - 86),
    y: Math.max(12, event.clientY - rect.top - 36),
  })
}

const dragState = ref<{ nodeId: string; offsetX: number; offsetY: number } | null>(null)

const handleNodeMouseDown = (event: MouseEvent, node: WorkflowNode) => {
  event.preventDefault()
  emit('select-node', node.id)

  const target = event.currentTarget as HTMLElement | null
  if (!canvasRef.value || !target) {
    return
  }

  const nodeRect = target.getBoundingClientRect()
  dragState.value = {
    nodeId: node.id,
    offsetX: event.clientX - nodeRect.left,
    offsetY: event.clientY - nodeRect.top,
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!dragState.value || !canvasRef.value) {
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()

  emit('move-node', {
    nodeId: dragState.value.nodeId,
    x: Math.max(12, event.clientX - rect.left - dragState.value.offsetX),
    y: Math.max(12, event.clientY - rect.top - dragState.value.offsetY),
  })
}

const handleMouseUp = () => {
  dragState.value = null
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}

const getBadgeClass = (type: WorkflowBlockType) => {
  return WORKFLOW_BLOCKS.find((block) => block.type === type)?.badgeClass || 'bg-slate-200 text-slate-700'
}

const getActionLabel = (node: WorkflowNode): string => {
  return getActionDefinition(node.type, node.actionId)?.label || 'Sem acao'
}

const handleCanvasClick = () => {
  emit('clear-selection')
}
</script>

<template>
  <section
    ref="canvasRef"
    class="relative min-h-[420px] overflow-hidden rounded-2xl border border-dashed p-4 transition"
    :class="isDragOver ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40'"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="handleCanvasClick"
  >
    <svg class="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(14, 165, 233, 0.85)" />
        </marker>
      </defs>
      <line
        v-for="line in lines"
        :key="`line-${line.id}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        stroke="rgba(14, 165, 233, 0.8)"
        stroke-width="2"
        marker-end="url(#arrowHead)"
      />
    </svg>

    <svg class="absolute inset-0 h-full w-full">
      <line
        v-for="line in lines"
        :key="`hit-${line.id}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        stroke="transparent"
        stroke-width="14"
        pointer-events="stroke"
        @click.stop="emit('remove-connection', line.id)"
      />
    </svg>

    <div
      v-for="node in nodes"
      :key="node.id"
      class="absolute w-[172px] cursor-move rounded-xl border bg-white/95 px-3 py-2 shadow-sm dark:bg-slate-800/95"
      :class="[
        selectedNodeId === node.id ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/40' : 'border-slate-200 dark:border-slate-700',
        connectFromNodeId === node.id ? 'ring-2 ring-sky-300 dark:ring-sky-500/50' : '',
      ]"
      :style="{ left: `${node.x}px`, top: `${node.y}px` }"
      @mousedown="handleNodeMouseDown($event, node)"
      @click.stop="emit('select-node', node.id)"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="rounded-full px-2 py-1 text-[11px] font-semibold" :class="getBadgeClass(node.type)">
          {{ getCategoryLabel(node.category) }}
        </span>
        <span class="text-[10px] uppercase tracking-wide text-slate-400">{{ node.id.slice(0, 4) }}</span>
      </div>
      <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ node.label }}</p>
      <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{{ getActionLabel(node) }}</p>
    </div>

    <div v-if="nodes.length === 0" class="pointer-events-none absolute inset-0 grid place-content-center text-center">
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Arraste blocos para comecar</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Voce pode reorganizar os blocos clicando e arrastando</p>
    </div>
  </section>
</template>

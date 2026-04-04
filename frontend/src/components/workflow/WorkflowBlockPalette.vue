<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowBlockType } from './types'
import { getCategoryLabel, WORKFLOW_BLOCKS } from './types'

const emit = defineEmits<{
  (event: 'add-block', type: WorkflowBlockType): void
}>()

const handleDragStart = (event: DragEvent, type: WorkflowBlockType) => {
  if (!event.dataTransfer) {
    return
  }

  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/x-workflow-block', type)
}

const groupedBlocks = computed(() => {
  const groups = new Map<string, typeof WORKFLOW_BLOCKS>()

  WORKFLOW_BLOCKS.forEach((block) => {
    const current = groups.get(block.category) || []
    groups.set(block.category, [...current, block])
  })

  return Array.from(groups.entries()).map(([category, blocks]) => ({
    category,
    categoryLabel: getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]),
    blocks,
  }))
})
</script>

<template>
  <aside class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Blocos do fluxo</p>
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Arraste para o canvas ou clique para inserir</p>

    <div class="mt-4 space-y-3">
      <div v-for="group in groupedBlocks" :key="group.category" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ group.categoryLabel }}</p>
        <button
          v-for="block in group.blocks"
          :key="block.type"
          draggable="true"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500/40"
          @click="emit('add-block', block.type)"
          @dragstart="handleDragStart($event, block.type)"
        >
          <span class="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold" :class="block.badgeClass">
            {{ block.label }}
          </span>
          <p class="mt-2 text-xs text-slate-600 dark:text-slate-300">{{ block.description }}</p>
        </button>
      </div>
    </div>
  </aside>
</template>

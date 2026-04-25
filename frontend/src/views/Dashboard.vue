<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import api from '../services/api'
import { sendPing, useSocketState } from '../services/socket'

const stats = ref({
  totalTickets: 0,
  openTickets: 0,
  resolvedToday: 0,
  avgResponseTime: '0min',
  totalInstances: 0,
  activeFlows: 0,
  totalAgents: 0,
})

const loading = ref(true)
const lastUpdatedAt = ref('')
const { isConnected, lastServerMessage, ticketEventsCount, messageEventsCount } = useSocketState()

const todayLabel = computed(() => dayjs().format('DD/MM/YYYY'))
const realtimeBadgeClass = computed(() =>
  isConnected.value
    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
)
const realtimeBadgeText = computed(() =>
  isConnected.value ? 'Online - Realtime' : 'Desconectado'
)

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/summary')
    stats.value = {
      totalTickets: data.totalTickets || 0,
      openTickets: data.openTickets || 0,
      resolvedToday: data.resolvedToday || 0,
      avgResponseTime: data.avgResponseTime || '0min',
      totalInstances: data.totalInstances || 0,
      activeFlows: data.activeFlows || 0,
      totalAgents: data.totalAgents || 0,
    }
    lastUpdatedAt.value = dayjs().format('DD/MM/YYYY HH:mm')
  } finally {
    loading.value = false
  }

  sendPing()
})
</script>

<template>
  <div class="space-y-8 animate-fade-in pb-10">
    <!-- Page Header Hero -->
    <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-2xl">
      <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
      <div class="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl"></div>
      
      <div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">Visão Geral da Operação</p>
          <h1 class="text-4xl font-bold tracking-tight mb-2">Dashboard de Comando</h1>
          <p class="text-emerald-100/70 max-w-xl">
            Acompanhe em tempo real o volume de conversas, o tempo de resposta da sua equipe e a saúde das integrações do WhatsApp.
          </p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <div :class="['inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-md', realtimeBadgeClass]">
            <span :class="['h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]', isConnected ? 'bg-emerald-500' : 'bg-rose-500']"></span>
            {{ realtimeBadgeText }}
          </div>
          <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm font-medium text-white/80">
            <svg class="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ todayLabel }}
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="flex h-32 items-center justify-center rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-50/50">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <template v-else>
      <!-- Stats Cards Row -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <!-- Total Tickets -->
        <div class="group relative overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 transition-transform group-hover:scale-150"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Conversas</p>
              <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-white">{{ stats.totalTickets }}</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
              <v-icon icon="mdi-message-text-outline" size="x-large"></v-icon>
            </div>
          </div>
        </div>

        <!-- Open Tickets -->
        <div class="group relative overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-500/10 transition-transform group-hover:scale-150"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Conversas Abertas</p>
              <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-white">{{ stats.openTickets }}</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
              <v-icon icon="mdi-account-clock-outline" size="x-large"></v-icon>
            </div>
          </div>
        </div>

        <!-- Resolved Today -->
        <div class="group relative overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 transition-transform group-hover:scale-150"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Resolvidas Hoje</p>
              <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-white">{{ stats.resolvedToday }}</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <v-icon icon="mdi-check-decagram-outline" size="x-large"></v-icon>
            </div>
          </div>
        </div>

        <!-- Avg Response Time -->
        <div class="group relative overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 transition-transform group-hover:scale-150"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Tempo Médio</p>
              <p class="mt-2 text-4xl font-bold text-slate-900 dark:text-white">{{ stats.avgResponseTime }}</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
              <v-icon icon="mdi-timer-outline" size="x-large"></v-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Infrastructure Row -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Infrastructure Metrics -->
        <div class="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div class="flex items-center gap-3 mb-2">
              <v-icon icon="mdi-whatsapp" color="success"></v-icon>
              <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Instâncias Ativas</p>
            </div>
            <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ stats.totalInstances }}</p>
          </div>
          
          <div class="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div class="flex items-center gap-3 mb-2">
              <v-icon icon="mdi-robot-outline" color="primary"></v-icon>
              <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Fluxos Ativos</p>
            </div>
            <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ stats.activeFlows }}</p>
          </div>
          
          <div class="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div class="flex items-center gap-3 mb-2">
              <v-icon icon="mdi-headset" color="info"></v-icon>
              <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Agentes Disponíveis</p>
            </div>
            <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ stats.totalAgents }}</p>
          </div>
        </div>

        <!-- SLA Mini Panel -->
        <div class="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none flex flex-col justify-center">
          <p class="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Meta de Resolução</p>
          <div class="flex items-end gap-2 mb-2">
            <span class="text-4xl font-bold text-emerald-500">82%</span>
            <span class="text-sm font-medium text-emerald-600 mb-1">no 1º contato</span>
          </div>
          <v-progress-linear model-value="82" color="success" height="8" rounded></v-progress-linear>
          <p class="mt-3 text-sm text-slate-500">Sua equipe está superando a meta diária de atendimento.</p>
        </div>
      </div>

      <!-- Quick Actions and System Events Row -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Quick Actions -->
        <div class="rounded-[2rem] border border-slate-200/70 bg-white/80 p-8 shadow-xl shadow-slate-200/30 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <h2 class="mb-6 text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <v-icon icon="mdi-lightning-bolt" color="warning"></v-icon> Ações Rápidas
          </h2>
          
          <div class="grid grid-cols-2 gap-4">
            <router-link to="/tickets" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-emerald-700 dark:hover:bg-slate-800">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <v-icon icon="mdi-forum-outline" :class="{'text-emerald-500': true, 'group-hover:text-white': true}"></v-icon>
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Caixa de Entrada</span>
            </router-link>

            <router-link to="/instances" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-blue-200 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-700 dark:hover:bg-slate-800">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <v-icon icon="mdi-cellphone-link" :class="{'text-blue-500': true, 'group-hover:text-white': true}"></v-icon>
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Conectar Número</span>
            </router-link>

            <router-link to="/flows" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-purple-200 hover:bg-purple-50 hover:shadow-lg hover:shadow-purple-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-purple-700 dark:hover:bg-slate-800">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <v-icon icon="mdi-sitemap-outline" :class="{'text-purple-500': true, 'group-hover:text-white': true}"></v-icon>
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Criar Automação</span>
            </router-link>

            <router-link to="/settings" class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:border-slate-300 hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <v-icon icon="mdi-cog-outline" :class="{'text-slate-500': true, 'group-hover:text-white': true}"></v-icon>
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Configurações</span>
            </router-link>
          </div>
        </div>

        <!-- System Events Mini Terminal -->
        <div class="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl text-slate-300 font-mono text-sm overflow-hidden flex flex-col">
          <div class="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-rose-500"></div>
              <div class="w-3 h-3 rounded-full bg-amber-500"></div>
              <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span class="ml-2 text-slate-500 text-xs">system_monitor.log</span>
          </div>
          
          <div class="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            <div class="flex gap-3">
              <span class="text-emerald-500 shrink-0">[{{ dayjs().format('HH:mm:ss') }}]</span>
              <span><span class="text-blue-400">INFO</span>: WebSocket Service {{ isConnected ? 'Connected' : 'Disconnected' }}</span>
            </div>
            <div class="flex gap-3">
              <span class="text-emerald-500 shrink-0">[{{ lastUpdatedAt.split(' ')[1] || dayjs().format('HH:mm:ss') }}]</span>
              <span><span class="text-blue-400">INFO</span>: Data synced from core API</span>
            </div>
            <div class="flex gap-3" v-if="lastServerMessage">
              <span class="text-emerald-500 shrink-0">[{{ dayjs().format('HH:mm:ss') }}]</span>
              <span><span class="text-blue-400">EVT</span>: {{ lastServerMessage }}</span>
            </div>
            <div class="flex gap-3 text-slate-500">
              <span class="shrink-0">></span>
              <span class="animate-pulse">_</span>
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-slate-500">MSG EVENTS:</span> <span class="text-emerald-400 font-bold">{{ messageEventsCount }}</span>
            </div>
            <div>
              <span class="text-slate-500">TKT EVENTS:</span> <span class="text-blue-400 font-bold">{{ ticketEventsCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}
</style>

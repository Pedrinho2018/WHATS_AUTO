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
const { isConnected, lastError, lastServerMessage, lastPongAt, lastRealtimeEvent, ticketEventsCount, messageEventsCount } = useSocketState()

const todayLabel = computed(() => dayjs().format('DD/MM/YYYY'))
const realtimeBadgeClass = computed(() =>
  isConnected.value
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-300'
)
const realtimeBadgeText = computed(() =>
  isConnected.value ? 'Tempo real conectado' : 'Tempo real desconectado'
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
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-gray-600 dark:text-gray-400">Visao geral da operacao do seu chatbot</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
          Plataforma ativa
        </div>
        <div :class="['inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold', realtimeBadgeClass]">
          <span :class="['h-2 w-2 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-rose-500']"></span>
          {{ realtimeBadgeText }}
        </div>
        <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <svg class="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ todayLabel }}
          <span v-if="lastUpdatedAt" class="text-slate-400 dark:text-slate-500">• atualizado {{ lastUpdatedAt }}</span>
        </div>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Realtime</p>
        <p class="mt-2 font-semibold">{{ lastServerMessage || 'Aguardando evento de boas-vindas...' }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Heartbeat</p>
        <p class="mt-2 font-semibold">{{ lastPongAt ? `Ultimo pong em ${dayjs(lastPongAt).format('DD/MM/YYYY HH:mm:ss')}` : 'Sem pong recebido ainda' }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Falhas</p>
        <p class="mt-2 font-semibold">{{ lastError || 'Nenhum erro de conexao' }}</p>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Eventos de Ticket</p>
        <p class="mt-2 text-lg font-semibold">{{ ticketEventsCount }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Eventos de Mensagem</p>
        <p class="mt-2 text-lg font-semibold">{{ messageEventsCount }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Ultimo Evento</p>
        <p class="mt-2 font-semibold">{{ lastRealtimeEvent || 'Sem eventos ainda' }}</p>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Carregando indicadores da operação...
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Tickets -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Total de Conversas</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {{ stats.totalTickets }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Open Tickets -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Conversas Abertas</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {{ stats.openTickets }}
            </p>
          </div>
          <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Resolved Today -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Resolvidas Hoje</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {{ stats.resolvedToday }}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Avg Response Time -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Tempo Médio</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {{ stats.avgResponseTime }}
            </p>
          </div>
          <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-600 dark:text-gray-400">Instâncias cadastradas</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ stats.totalInstances }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-600 dark:text-gray-400">Fluxos ativos</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ stats.activeFlows }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p class="text-sm text-gray-600 dark:text-gray-400">Agentes ativos</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ stats.totalAgents }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <router-link 
          to="/tickets" 
          class="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-8 h-8 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Nova Conversa</span>
        </router-link>

        <router-link 
          to="/instances" 
          class="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-8 h-8 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Instâncias</span>
        </router-link>

        <router-link 
          to="/flows" 
          class="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-8 h-8 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Automações</span>
        </router-link>

        <router-link 
          to="/settings" 
          class="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-8 h-8 text-emerald-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Configurações</span>
        </router-link>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-slate-100 lg:col-span-2 dark:border-slate-700">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-300">SLA Operacional</p>
        <p class="mt-2 text-2xl font-semibold">Tempo medio abaixo da meta</p>
        <p class="mt-3 text-sm text-slate-300">Seu time esta mantendo qualidade de atendimento com excelente velocidade de resposta.</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Meta do Dia</p>
        <p class="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">82%</p>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">de conversas com resolucao no primeiro contato</p>
      </div>
    </div>
  </div>
</template>
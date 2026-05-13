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
  messagesToday: 0,
  inboundMessagesToday: 0,
  outboundMessagesToday: 0,
  totalInstances: 0,
  connectedInstances: 0,
  activeFlows: 0,
  totalAgents: 0,
  ticketsByAgent: [] as Array<{
    agentId: number | null
    agentName: string
    openTickets: number
    resolvedToday: number
  }>,
})

const loading = ref(true)
const lastUpdatedAt = ref('')
const { isConnected, lastServerMessage, ticketEventsCount, messageEventsCount } = useSocketState()

const todayLabel = computed(() => dayjs().format('DD/MM/YYYY'))
const realtimeBadgeText = computed(() =>
  isConnected.value ? 'Realtime online' : 'Realtime desconectado'
)
const realtimeColor = computed(() => (isConnected.value ? 'success' : 'error'))

const metricCards = computed(() => [
  {
    label: 'Conversas abertas',
    value: stats.value.openTickets,
    icon: 'mdi-message-text-outline',
    color: 'warning',
    detail: 'Em atendimento ou aguardando',
  },
  {
    label: 'Mensagens hoje',
    value: stats.value.messagesToday,
    icon: 'mdi-forum-outline',
    color: 'primary',
    detail: `${stats.value.inboundMessagesToday} recebidas / ${stats.value.outboundMessagesToday} enviadas`,
  },
  {
    label: 'Resolvidas hoje',
    value: stats.value.resolvedToday,
    icon: 'mdi-check-circle-outline',
    color: 'success',
    detail: todayLabel.value,
  },
  {
    label: 'Tempo médio',
    value: stats.value.avgResponseTime,
    icon: 'mdi-timer-outline',
    color: 'info',
    detail: 'Primeira resposta',
  },
])

const operationCards = computed(() => [
  {
    label: 'Instancias',
    value: `${stats.value.connectedInstances}/${stats.value.totalInstances}`,
    icon: 'mdi-whatsapp',
    color: 'success',
  },
  {
    label: 'Fluxos ativos',
    value: stats.value.activeFlows,
    icon: 'mdi-robot-outline',
    color: 'primary',
  },
  {
    label: 'Agentes',
    value: stats.value.totalAgents,
    icon: 'mdi-headset',
    color: 'info',
  },
])

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/summary')
    stats.value = {
      totalTickets: data.totalTickets || 0,
      openTickets: data.openTickets || 0,
      resolvedToday: data.resolvedToday || 0,
      avgResponseTime: data.avgResponseTime || '0min',
      messagesToday: data.messagesToday || 0,
      inboundMessagesToday: data.inboundMessagesToday || 0,
      outboundMessagesToday: data.outboundMessagesToday || 0,
      totalInstances: data.totalInstances || 0,
      connectedInstances: data.connectedInstances || 0,
      activeFlows: data.activeFlows || 0,
      totalAgents: data.totalAgents || 0,
      ticketsByAgent: Array.isArray(data.ticketsByAgent) ? data.ticketsByAgent : [],
    }
    lastUpdatedAt.value = dayjs().format('DD/MM/YYYY HH:mm')
  } finally {
    loading.value = false
  }

  sendPing()
})
</script>

<template>
  <div class="dashboard-page animate-fade-in">
    <div class="page-heading">
      <div>
        <p class="text-caption text-medium-emphasis mb-1">Operacao</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold">Dashboard</h1>
      </div>

      <div class="heading-actions">
        <v-chip :color="realtimeColor" size="small" variant="tonal">
          <v-icon class="mr-1" icon="mdi-circle" size="10" />
          {{ realtimeBadgeText }}
        </v-chip>
        <v-chip size="small" variant="outlined">
          {{ todayLabel }}
        </v-chip>
      </div>
    </div>

    <v-skeleton-loader v-if="loading" class="mt-6" type="article, actions, table" />

    <template v-else>
      <v-row class="mt-2" dense>
        <v-col v-for="card in metricCards" :key="card.label" cols="12" md="6" xl="3">
          <v-card border class="metric-card" elevation="0">
            <v-card-text>
              <div class="d-flex align-start justify-space-between ga-4">
                <div>
                  <div class="text-body-2 text-medium-emphasis">{{ card.label }}</div>
                  <div class="metric-value">{{ card.value }}</div>
                  <div class="text-caption text-medium-emphasis">{{ card.detail }}</div>
                </div>
                <v-avatar :color="card.color" rounded="lg" variant="tonal">
                  <v-icon :icon="card.icon" />
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2" dense>
        <v-col cols="12" lg="8">
          <v-card border elevation="0">
            <v-card-title class="section-title">Operacao comercial</v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col v-for="card in operationCards" :key="card.label" cols="12" sm="4">
                  <div class="operation-tile">
                    <v-icon :color="card.color" :icon="card.icon" size="24" />
                    <div>
                      <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
                      <div class="text-h5 font-weight-bold">{{ card.value }}</div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card border class="mt-4" elevation="0">
            <v-card-title class="section-title">Atendimentos por operador</v-card-title>
            <v-card-text>
              <div v-if="stats.ticketsByAgent.length === 0" class="empty-panel">
                Nenhum atendimento atribuído ainda.
              </div>
              <div v-else class="agent-list">
                <div v-for="agent in stats.ticketsByAgent" :key="agent.agentId ?? 'unassigned'" class="agent-row">
                  <div>
                    <div class="agent-name">{{ agent.agentName }}</div>
                    <div class="text-caption text-medium-emphasis">Responsável pela carteira de atendimento</div>
                  </div>
                  <div class="agent-metrics">
                    <div>
                      <span>Abertas</span>
                      <strong>{{ agent.openTickets }}</strong>
                    </div>
                    <div>
                      <span>Resolvidas hoje</span>
                      <strong>{{ agent.resolvedToday }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card border elevation="0">
            <v-card-title class="section-title">Atualizacao</v-card-title>
            <v-card-text class="d-flex flex-column ga-3">
              <div class="status-row">
                <span>Ultima leitura</span>
                <strong>{{ lastUpdatedAt || '-' }}</strong>
              </div>
              <div class="status-row">
                <span>Eventos de mensagens</span>
                <strong>{{ messageEventsCount }}</strong>
              </div>
              <div class="status-row">
                <span>Eventos de tickets</span>
                <strong>{{ ticketEventsCount }}</strong>
              </div>
              <v-alert
                v-if="lastServerMessage"
                color="primary"
                density="compact"
                variant="tonal"
              >
                {{ lastServerMessage }}
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card border class="mt-4" elevation="0">
        <v-card-title class="section-title">Acoes rapidas</v-card-title>
        <v-card-text>
          <div class="quick-actions">
            <v-btn prepend-icon="mdi-forum-outline" to="/tickets" variant="flat">Conversas</v-btn>
            <v-btn prepend-icon="mdi-cellphone-link" to="/instances" variant="tonal">Instancias</v-btn>
            <v-btn prepend-icon="mdi-sitemap" to="/builder" variant="tonal">Fluxos</v-btn>
            <v-btn prepend-icon="mdi-cog-outline" to="/settings" variant="tonal">Configuracoes</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.heading-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metric-card {
  min-height: 132px;
}

.metric-value {
  margin-top: 8px;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
}

.operation-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 84px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.agent-name {
  font-weight: 700;
}

.agent-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(96px, 1fr));
  gap: 10px;
}

.agent-metrics div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.agent-metrics span {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.agent-metrics strong {
  font-size: 1.25rem;
}

.empty-panel {
  padding: 18px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.875rem;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 720px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .heading-actions {
    justify-content: flex-start;
  }

  .agent-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .agent-metrics {
    width: 100%;
  }

  .agent-metrics div {
    align-items: flex-start;
  }
}
</style>

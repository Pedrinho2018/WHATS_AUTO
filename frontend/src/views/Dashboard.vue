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
const realtimeBadgeText = computed(() =>
  isConnected.value ? 'Realtime online' : 'Realtime desconectado'
)
const realtimeColor = computed(() => (isConnected.value ? 'success' : 'error'))

const metricCards = computed(() => [
  {
    label: 'Conversas',
    value: stats.value.totalTickets,
    icon: 'mdi-message-text-outline',
    color: 'primary',
    detail: 'Total registrado',
  },
  {
    label: 'Abertas',
    value: stats.value.openTickets,
    icon: 'mdi-account-clock-outline',
    color: 'warning',
    detail: 'Demandam atenção',
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
    value: stats.value.totalInstances,
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
            <v-card-title class="section-title">Operacao</v-card-title>
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
}
</style>

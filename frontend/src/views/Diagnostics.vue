<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import api from '../services/api'

interface OperationalEvent {
  id: number
  company_id?: number
  ticket_id?: number
  message_id?: number
  event_type:
    | 'webhook_received'
    | 'message_saved'
    | 'realtime_emitted'
    | 'message_send_failed'
    | 'message_send_retry'
    | 'login_success'
    | 'login_failed'
    | 'admin_action'
    | 'data_exported'
    | 'data_deleted'
    | 'retention_applied'
  status: 'success' | 'warning' | 'error'
  source: string
  detail?: string
  created_at?: string
}

const loading = ref(true)
const ticketFilter = ref('')
const summary = ref({
  totalLast24h: 0,
  errorsLast24h: 0,
  warningsLast24h: 0,
})
const events = ref<OperationalEvent[]>([])

const eventLabel: Record<OperationalEvent['event_type'], string> = {
  webhook_received: 'Webhook recebido',
  message_saved: 'Mensagem salva',
  realtime_emitted: 'Realtime emitido',
  message_send_failed: 'Envio falhou',
  message_send_retry: 'Retry de envio',
  login_success: 'Login realizado',
  login_failed: 'Login rejeitado',
  admin_action: 'Ação administrativa',
  data_exported: 'Dados exportados',
  data_deleted: 'Dados removidos',
  retention_applied: 'Retenção aplicada',
}

const statusColor: Record<OperationalEvent['status'], string> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
}

const healthText = computed(() => {
  if (summary.value.errorsLast24h > 0) return 'Atenção'
  if (summary.value.warningsLast24h > 0) return 'Instável'
  return 'Saudável'
})

const loadDiagnostics = async () => {
  loading.value = true

  try {
    const params: Record<string, string | number> = { limit: 150 }
    const ticketId = Number(ticketFilter.value)
    if (Number.isFinite(ticketId) && ticketId > 0) {
      params.ticketId = ticketId
    }

    const { data } = await api.get('/diagnostics/events', { params })
    summary.value = data.summary || summary.value
    events.value = Array.isArray(data.events) ? data.events : []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDiagnostics()
})
</script>

<template>
  <div class="diagnostics-page">
    <div class="page-heading">
      <div>
        <p class="text-caption text-medium-emphasis mb-1">Operação</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold">Diagnóstico</h1>
      </div>

      <v-chip :color="summary.errorsLast24h ? 'error' : summary.warningsLast24h ? 'warning' : 'success'" variant="tonal">
        {{ healthText }}
      </v-chip>
    </div>

    <v-row dense>
      <v-col cols="12" md="4">
        <v-card border elevation="0">
          <v-card-text>
            <div class="metric-label">Eventos 24h</div>
            <div class="metric-value">{{ summary.totalLast24h }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card border elevation="0">
          <v-card-text>
            <div class="metric-label">Alertas 24h</div>
            <div class="metric-value">{{ summary.warningsLast24h }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card border elevation="0">
          <v-card-text>
            <div class="metric-label">Erros 24h</div>
            <div class="metric-value">{{ summary.errorsLast24h }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card border class="mt-4" elevation="0">
      <v-card-title class="section-title">Eventos operacionais</v-card-title>
      <v-card-text>
        <div class="toolbar">
          <v-text-field
            v-model="ticketFilter"
            density="compact"
            hide-details
            label="Filtrar por ticket"
            variant="outlined"
          />
          <v-btn :loading="loading" prepend-icon="mdi-refresh" variant="flat" @click="loadDiagnostics">
            Atualizar
          </v-btn>
        </div>

        <v-skeleton-loader v-if="loading" class="mt-4" type="table" />

        <div v-else-if="events.length === 0" class="empty-state">
          Nenhum evento operacional encontrado.
        </div>

        <div v-else class="event-list">
          <div v-for="event in events" :key="event.id" class="event-row">
            <v-chip :color="statusColor[event.status]" size="small" variant="tonal">
              {{ event.status }}
            </v-chip>
            <div class="event-main">
              <strong>{{ eventLabel[event.event_type] }}</strong>
              <span>{{ event.detail || event.source }}</span>
            </div>
            <div class="event-meta">
              <span>ticket {{ event.ticket_id || '-' }}</span>
              <span>msg {{ event.message_id || '-' }}</span>
              <span>{{ dayjs(event.created_at).format('DD/MM HH:mm:ss') }}</span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.diagnostics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading,
.toolbar,
.event-row,
.event-meta {
  display: flex;
  align-items: center;
}

.page-heading {
  justify-content: space-between;
  gap: 16px;
}

.metric-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.875rem;
}

.metric-value {
  margin-top: 6px;
  font-size: 2rem;
  font-weight: 700;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
}

.toolbar {
  gap: 12px;
}

.toolbar .v-text-field {
  max-width: 260px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.event-row {
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.event-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.event-main span,
.event-meta {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8125rem;
}

.event-meta {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.empty-state {
  margin-top: 16px;
  padding: 24px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

@media (max-width: 720px) {
  .page-heading,
  .toolbar,
  .event-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar .v-text-field {
    max-width: none;
    width: 100%;
  }
}
</style>

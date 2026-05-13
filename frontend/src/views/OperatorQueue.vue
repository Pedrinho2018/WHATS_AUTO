<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue3-toastify'
import api from '../services/api'
import { onMessageCreated, onTicketCreated, onTicketUpdated } from '../services/socket'

// ═══════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════

interface Ticket {
  id: number
  contact_name?: string
  contact_phone: string
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  instance?: { name: string }
  user_id?: number
  agent?: { name: string }
  updated_at?: string
}

interface TicketMessage {
  id: number
  direction: 'inbound' | 'outbound'
  content?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  created_at?: string
}

interface MessageTemplate {
  id: number
  name: string
  content: string
  category?: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

// ═══════════════════════════════════════════════════════════════
// Estado Reativo
// ═══════════════════════════════════════════════════════════════

const tickets = ref<Ticket[]>([])
const templates = ref<MessageTemplate[]>([])
const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedTicketId = ref<number | null>(null)
const messagesByTicketId = ref<Record<number, TicketMessage[]>>({})
const messagesLoadingByTicketId = ref<Record<number, boolean>>({})
const sendingMessageByTicketId = ref<Record<number, boolean>>({})
const messageDraftByTicketId = ref<Record<number, string>>({})
const showTransferModal = ref(false)
const transferTargetUserId = ref<number | null>(null)
const transferringTicketId = ref<number | null>(null)
const showTemplateModal = ref(false)
const selectedTemplateId = ref<number | null>(null)

// Status e prioridade
const statusLabel: Record<Ticket['status'], string> = {
  open: 'Aberto',
  pending: 'Pendente',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
  closed: 'Finalizado',
}

const statusClass: Record<Ticket['status'], string> = {
  open: 'status-badge status-open',
  pending: 'status-badge status-pending',
  in_progress: 'status-badge status-progress',
  resolved: 'status-badge status-resolved',
  closed: 'status-badge status-closed',
}

const priorityLabel: Record<Ticket['priority'], string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

const priorityClass: Record<Ticket['priority'], string> = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  urgent: 'priority-urgent',
}

// ═══════════════════════════════════════════════════════════════
// Computed
// ═══════════════════════════════════════════════════════════════

const filteredTickets = computed(() => {
  const term = searchQuery.value.trim().toLowerCase()

  if (!term) {
    return tickets.value
  }

  return tickets.value.filter((ticket) => {
    return [
      ticket.contact_name,
      ticket.contact_phone,
      ticket.instance?.name,
      statusLabel[ticket.status],
      ticket.priority,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

const selectedTicket = computed(() => {
  return tickets.value.find((t) => t.id === selectedTicketId.value)
})

const selectedTicketMessages = computed(() => {
  return selectedTicketId.value ? messagesByTicketId.value[selectedTicketId.value] || [] : []
})

const templatesByCategory = computed(() => {
  const grouped: Record<string, MessageTemplate[]> = {}

  templates.value.forEach((template) => {
    const category = template.category || 'custom'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(template)
  })

  return grouped
})

const categoryLabel: Record<string, string> = {
  greeting: 'Saudação',
  closing: 'Encerramento',
  help: 'Ajuda',
  transfer: 'Transferência',
  custom: 'Personalizado',
}

// ═══════════════════════════════════════════════════════════════
// Métodos
// ═══════════════════════════════════════════════════════════════

const setMessagesLoading = (ticketId: number, value: boolean) => {
  messagesLoadingByTicketId.value = {
    ...messagesLoadingByTicketId.value,
    [ticketId]: value,
  }
}

const setSendingMessage = (ticketId: number, value: boolean) => {
  sendingMessageByTicketId.value = {
    ...sendingMessageByTicketId.value,
    [ticketId]: value,
  }
}

const toTicketMessage = (raw: Record<string, unknown>): TicketMessage | null => {
  const id = Number(raw.id)

  if (!Number.isFinite(id)) {
    return null
  }

  return {
    id,
    direction: raw.direction === 'outbound' ? 'outbound' : 'inbound',
    content: typeof raw.content === 'string' ? raw.content : undefined,
    status: ['sent', 'delivered', 'read', 'failed'].includes(String(raw.status))
      ? (raw.status as TicketMessage['status'])
      : 'delivered',
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
  }
}

const upsertTicketMessage = (ticketId: number, message: TicketMessage) => {
  const currentMessages = messagesByTicketId.value[ticketId]

  if (!currentMessages) {
    return
  }

  const messageIndex = currentMessages.findIndex((item) => item.id === message.id)
  const nextMessages = [...currentMessages]

  if (messageIndex >= 0) {
    nextMessages[messageIndex] = message
  } else {
    nextMessages.push(message)
  }

  messagesByTicketId.value = {
    ...messagesByTicketId.value,
    [ticketId]: nextMessages,
  }
}

const loadTickets = async (showLoading = true) => {
  try {
    if (showLoading) {
      loading.value = true
    }
    const { data } = await api.get('/tickets')
    tickets.value = data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar conversas'
    toast.error(message)
  } finally {
    loading.value = false
  }
}

const loadTemplates = async () => {
  try {
    const { data } = await api.get('/templates/messages')
    templates.value = data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar templates'
    toast.error(message)
  }
}

const loadUsers = async () => {
  try {
    const { data } = await api.get('/users')
    users.value = data.filter((u: User) => u.role === 'agent' || u.role === 'manager')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar usuários'
    toast.error(message)
  }
}

const selectTicket = async (ticketId: number) => {
  selectedTicketId.value = ticketId

  if (!messagesByTicketId.value[ticketId]) {
    await loadTicketMessages(ticketId)
  }
}

const loadTicketMessages = async (ticketId: number) => {
  setMessagesLoading(ticketId, true)

  try {
    const { data } = await api.get(`/messages/tickets/${ticketId}`)
    messagesByTicketId.value = {
      ...messagesByTicketId.value,
      [ticketId]: data,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar mensagens'
    toast.error(message)
  } finally {
    setMessagesLoading(ticketId, false)
  }
}

const sendMessage = async (ticketId: number) => {
  const content = messageDraftByTicketId.value[ticketId]?.trim()

  if (!content) {
    toast.warning('Mensagem não pode estar vazia')
    return
  }

  setSendingMessage(ticketId, true)

  try {
    const { data } = await api.post(`/messages/tickets/${ticketId}/text`, {
      text: content,
    })

    const createdMessage = data?.message ? toTicketMessage(data.message as Record<string, unknown>) : null
    if (createdMessage) {
      upsertTicketMessage(ticketId, createdMessage)
    }

    messageDraftByTicketId.value = {
      ...messageDraftByTicketId.value,
      [ticketId]: '',
    }

    toast.success('Mensagem enviada')
    void loadTickets(false)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem'
    toast.error(message)
  } finally {
    setSendingMessage(ticketId, false)
  }
}

const applyTemplate = (templateId: number) => {
  if (!selectedTicketId.value) return

  const template = templates.value.find((t) => t.id === templateId)
  if (template) {
    messageDraftByTicketId.value[selectedTicketId.value] = template.content
    showTemplateModal.value = false
    selectedTemplateId.value = null
  }
}

const openTransferModal = (ticketId: number) => {
  transferringTicketId.value = ticketId
  transferTargetUserId.value = null
  showTransferModal.value = true
}

const closeTransferModal = () => {
  showTransferModal.value = false
  transferringTicketId.value = null
  transferTargetUserId.value = null
}

const transferTicket = async () => {
  if (!transferringTicketId.value || !transferTargetUserId.value) {
    toast.warning('Selecione um colaborador para transferência')
    return
  }

  try {
    const { data } = await api.post(`/tickets/${transferringTicketId.value}/transfer`, {
      user_id: transferTargetUserId.value,
      status: 'pending',
    })

    const index = tickets.value.findIndex((t) => t.id === transferringTicketId.value)
    if (index !== -1) {
      tickets.value[index] = data
    }

    toast.success('Atendimento transferido com sucesso')
    closeTransferModal()

    if (selectedTicketId.value === transferringTicketId.value) {
      selectedTicketId.value = null
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao transferir atendimento'
    toast.error(message)
  }
}

const updateTicketStatus = async (ticketId: number, status: Ticket['status']) => {
  try {
    const { data } = await api.patch(`/tickets/${ticketId}`, { status })
    const index = tickets.value.findIndex((t) => t.id === ticketId)
    if (index !== -1) {
      tickets.value[index] = data
    }
    toast.success('Status atualizado')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
    toast.error(message)
  }
}

const handleRealtimeMessageCreated = async (payload: { message: Record<string, unknown> }) => {
  const ticketId = Number(payload.message.ticket_id)
  const message = toTicketMessage(payload.message)

  if (!Number.isFinite(ticketId) || !message) {
    return
  }

  upsertTicketMessage(ticketId, message)
  await loadTickets(false)
}

// ═══════════════════════════════════════════════════════════════
// Lifecycle
// ═══════════════════════════════════════════════════════════════

onMounted(async () => {
  await Promise.all([loadTickets(), loadTemplates(), loadUsers()])
})

const cleanupRealtimeListeners = [
  onTicketCreated(() => {
    void loadTickets(false)
  }),
  onTicketUpdated(() => {
    void loadTickets(false)
  }),
  onMessageCreated((payload) => {
    void handleRealtimeMessageCreated(payload)
  }),
]

onUnmounted(() => {
  cleanupRealtimeListeners.forEach((cleanup) => cleanup())
})
</script>

<template>
  <div class="operator-queue">
    <!-- Lista de Conversas -->
    <div class="queue-sidebar glass">
      <div class="sidebar-header">
        <h2 class="sidebar-title gradient-text">Fila de Atendimento</h2>
        <div class="search-wrapper">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por número, nome..."
            class="search-input"
          />
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="tickets-list">
        <div
          v-for="(ticket, index) in filteredTickets"
          :key="ticket.id"
          :class="['ticket-item', { 'ticket-selected': selectedTicketId === ticket.id }]"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="selectTicket(ticket.id)"
        >
          <div class="ticket-header">
            <div class="ticket-contact">
              <div class="contact-name">{{ ticket.contact_name || ticket.contact_phone }}</div>
              <div class="contact-phone">{{ ticket.contact_phone }}</div>
            </div>
            <span :class="statusClass[ticket.status]">
              {{ statusLabel[ticket.status] }}
            </span>
          </div>

          <div class="ticket-footer">
            <span v-if="ticket.instance" class="instance-badge">
              <svg class="icon-sm" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              {{ ticket.instance.name }}
            </span>
            <span :class="priorityClass[ticket.priority]">{{ priorityLabel[ticket.priority] }}</span>
          </div>
        </div>

        <div v-if="filteredTickets.length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>Nenhuma conversa encontrada</p>
        </div>
      </div>
    </div>

    <!-- Detalhes do Atendimento -->
    <div class="conversation-panel">
      <div v-if="!selectedTicket" class="no-selection glass">
        <svg class="no-selection-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p>Selecione uma conversa para iniciar</p>
      </div>

      <div v-else class="conversation-content glass">
        <!-- Cabeçalho do Ticket -->
        <div class="conversation-header">
          <div class="header-info">
            <h3 class="conversation-title">{{ selectedTicket.contact_name || selectedTicket.contact_phone }}</h3>
            <p class="conversation-subtitle">{{ selectedTicket.contact_phone }}</p>
            <div v-if="selectedTicket.agent" class="agent-info">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Atendido por: <strong>{{ selectedTicket.agent.name }}</strong>
            </div>
          </div>

          <div class="header-actions">
            <button
              @click="openTransferModal(selectedTicket.id)"
              class="btn-transfer"
            >
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transferir
            </button>

            <select
              :value="selectedTicket?.status"
              @change="(e) => selectedTicket && updateTicketStatus(selectedTicket.id, (e.target as HTMLSelectElement).value as Ticket['status'])"
              class="status-select"
            >
              <option v-for="[key, label] in Object.entries(statusLabel)" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Mensagens -->
        <div
          v-if="messagesLoadingByTicketId[selectedTicket.id]"
          class="messages-loading"
        >
          <div class="spinner"></div>
        </div>

        <div v-else class="messages-wrapper">
          <div class="messages-container">
            <div
              v-for="msg in selectedTicketMessages"
              :key="msg.id"
              :class="['message-row', msg.direction === 'outbound' ? 'message-outbound-row' : 'message-inbound-row']"
            >
              <div :class="['message-bubble', msg.direction === 'outbound' ? 'bubble-outbound' : 'bubble-inbound']">
                {{ msg.content }}
              </div>
              <div class="message-time">
                {{ dayjs(msg.created_at).format('HH:mm') }}
              </div>
            </div>
          </div>

          <!-- Entrada para Nova Mensagem -->
          <div class="message-input-section">
            <!-- Botão de Templates -->
            <button
              @click="showTemplateModal = true"
              class="btn-templates"
            >
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Templates
            </button>

            <!-- Campo de Digitação -->
            <div class="input-row">
              <textarea
                v-model="messageDraftByTicketId[selectedTicket.id]"
                placeholder="Digite sua mensagem..."
                class="message-textarea"
                rows="2"
              ></textarea>
              <button
                @click="sendMessage(selectedTicket.id)"
                :disabled="sendingMessageByTicketId[selectedTicket.id]"
                class="btn-send gradient-btn"
              >
                <div v-if="sendingMessageByTicketId[selectedTicket.id]" class="spinner-sm"></div>
                <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span v-if="!sendingMessageByTicketId[selectedTicket.id]">Enviar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Templates -->
    <div
      v-if="showTemplateModal"
      class="modal-overlay"
      @click.self="showTemplateModal = false"
    >
      <div class="modal-content glass">
        <div class="modal-header">
          <h3 class="modal-title">Mensagens Padrão</h3>
          <button
            @click="showTemplateModal = false"
            class="btn-close"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div v-for="(categoryTemplates, category) in templatesByCategory" :key="category" class="template-category">
            <h4 class="category-title">{{ categoryLabel[category] || category }}</h4>

            <button
              v-for="template in categoryTemplates"
              :key="template.id"
              @click="applyTemplate(template.id)"
              class="template-item"
            >
              <div class="template-name">{{ template.name }}</div>
              <div class="template-preview">{{ template.content }}</div>
            </button>
          </div>

          <div v-if="templates.length === 0" class="empty-templates">
            <p>Nenhum template disponível</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Transferência -->
    <div
      v-if="showTransferModal"
      class="modal-overlay"
      @click.self="closeTransferModal"
    >
      <div class="modal-content glass">
        <div class="modal-header">
          <h3 class="modal-title">Transferir Atendimento</h3>
          <button
            @click="closeTransferModal"
            class="btn-close"
          >
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <label class="form-label">Transferir para</label>
          <select
            v-model.number="transferTargetUserId"
            class="form-select"
          >
            <option :value="null">-- Selecione um colaborador --</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }} ({{ user.email }})
            </option>
          </select>
        </div>

        <div class="modal-footer">
          <button
            @click="closeTransferModal"
            class="btn-cancel"
          >
            Cancelar
          </button>
          <button
            @click="transferTicket"
            class="gradient-btn"
          >
            Transferir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.operator-queue {
  display: flex;
  height: 100%;
  gap: 1rem;
  padding: 1.5rem;
  animation: fade-in 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.glass {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
}

.queue-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 20rem;
  gap: 1rem;
  padding: 1rem;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  border-top-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.ticket-item {
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 2px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slide-in 0.5s ease-out backwards;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ticket-item:hover {
  border-color: rgba(var(--v-border-color), 0.4);
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.ticket-selected {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.08);
  box-shadow: var(--shadow-md);
}

.ticket-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.ticket-contact {
  flex: 1;
}

.contact-name {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0.125rem;
}

.contact-phone {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-open {
  background: rgba(var(--color-error-500), 0.15);
  color: var(--color-error-700);
}

.status-pending {
  background: rgba(var(--color-warning-500), 0.15);
  color: var(--color-warning-700);
}

.status-progress {
  background: rgba(var(--color-primary-500), 0.15);
  color: var(--color-primary-700);
}

.status-resolved {
  background: rgba(var(--color-success-500), 0.15);
  color: var(--color-success-700);
}

.status-closed {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ticket-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.instance-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-sm {
  width: 0.875rem;
  height: 0.875rem;
}

.priority-low {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.priority-medium {
  color: var(--color-warning-500);
}

.priority-high {
  color: var(--color-accent-500);
}

.priority-urgent {
  color: var(--color-error-500);
  font-weight: 700;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.conversation-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 3rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.no-selection-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.conversation-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
  gap: 1rem;
}

.conversation-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}

.conversation-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 0.25rem 0;
}

.conversation-subtitle {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-transfer {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--color-warning-500), 0.15);
  color: var(--color-warning-700);
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-transfer:hover {
  background: rgba(var(--color-warning-500), 0.25);
  box-shadow: var(--shadow-sm);
}

.status-select {
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-select:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
}

.messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.message-row {
  display: flex;
  gap: 0.5rem;
}

.message-inbound-row {
  justify-content: flex-start;
}

.message-outbound-row {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 60%;
  padding: 0.75rem;
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  animation: message-pop 0.3s ease-out;
}

@keyframes message-pop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.bubble-inbound {
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
}

.bubble-outbound {
  background: var(--gradient-brand);
  color: white;
}

.message-time {
  display: flex;
  align-items: flex-end;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.message-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}

.btn-templates {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-templates:hover {
  background: rgba(var(--v-theme-surface), 0.8);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.message-textarea {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  resize: none;
  outline: none;
  transition: all 0.3s ease;
}

.message-textarea::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.message-textarea:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.gradient-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--gradient-brand);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
  white-space: nowrap;
}

.gradient-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.gradient-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-send {
  min-width: 100px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: fade-in 0.3s ease-out;
}

.modal-content {
  width: 100%;
  max-width: 24rem;
  max-height: 90vh;
  padding: 1.5rem;
  box-shadow: var(--shadow-xl);
  animation: slide-up 0.3s ease-out;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.btn-close {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-close:hover {
  color: rgb(var(--v-theme-on-surface));
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.template-category {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
}

.template-item {
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-item:hover {
  background: rgba(var(--v-theme-surface), 0.8);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
}

.template-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0.25rem;
}

.template-preview {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty-templates {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-select:focus {
  border-color: rgb(var(--v-theme-primary));
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
}

.btn-cancel {
  flex: 1;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(var(--v-theme-surface), 0.5);
  border-color: rgba(var(--v-border-color), 0.5);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(var(--v-border-color), 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-border-color), 0.5);
}

@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7);
  }

  .ticket-item {
    background: rgba(30, 30, 30, 0.5);
  }
}
</style>

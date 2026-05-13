<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue3-toastify'
import api from '../services/api'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { UiCard, UiModal, UiSectionHeader } from '../components/ui'
import { onMessageCreated, onTicketCreated, onTicketUpdated } from '../services/socket'

interface Ticket {
  id: number
  contact_name?: string
  contact_phone: string
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  instance?: { name: string }
  updated_at?: string
}

interface InstanceOption {
  id: number
  name: string
}

interface TicketMessage {
  id: number
  direction: 'inbound' | 'outbound'
  content?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  created_at?: string
}

const tickets = ref<Ticket[]>([])
const loading = ref(true)
const searchQuery = ref('')
const updatingTicketId = ref<number | null>(null)
const creatingTicket = ref(false)
const isNewChatModalOpen = ref(false)
const instances = ref<InstanceOption[]>([])
const authStore = useAuthStore()
const expandedTicketId = ref<number | null>(null)
const messagesByTicketId = ref<Record<number, TicketMessage[]>>({})
const messagesLoadingByTicketId = ref<Record<number, boolean>>({})
const sendingMessageByTicketId = ref<Record<number, boolean>>({})
const messageDraftByTicketId = ref<Record<number, string>>({})

const newChatForm = ref({
  instanceId: '',
  contactName: '',
  contactPhone: '',
  firstMessage: '',
})

const statusLabel: Record<Ticket['status'], string> = {
  open: 'Aberto',
  pending: 'Pendente',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const statusClass: Record<Ticket['status'], string> = {
  open: 'status-badge status-open',
  pending: 'status-badge status-pending',
  in_progress: 'status-badge status-progress',
  resolved: 'status-badge status-resolved',
  closed: 'status-badge status-closed',
}

const canReplyToTicket = computed(() => ['admin', 'manager', 'agent', 'viewer'].includes(authStore.user?.role || ''))

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

const loadTickets = async () => {
  try {
    const { data } = await api.get('/tickets')
    tickets.value = data
  } finally {
    loading.value = false
  }
}

const loadInstances = async () => {
  const { data } = await api.get('/instances')
  instances.value = data.map((instance: { id: number; name: string }) => ({
    id: instance.id,
    name: instance.name,
  }))

  if (!newChatForm.value.instanceId && instances.value.length > 0) {
    newChatForm.value.instanceId = String(instances.value[0].id)
  }
}

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

const loadTicketMessages = async (ticketId: number) => {
  setMessagesLoading(ticketId, true)

  try {
    const { data } = await api.get(`/messages/tickets/${ticketId}`)
    messagesByTicketId.value = {
      ...messagesByTicketId.value,
      [ticketId]: data,
    }
  } finally {
    setMessagesLoading(ticketId, false)
  }
}

const toggleConversation = async (ticketId: number) => {
  if (expandedTicketId.value === ticketId) {
    expandedTicketId.value = null
    return
  }

  expandedTicketId.value = ticketId

  if (!messagesByTicketId.value[ticketId]) {
    await loadTicketMessages(ticketId)
  }
}

const sendMessageToTicket = async (ticket: Ticket) => {
  const text = (messageDraftByTicketId.value[ticket.id] || '').trim()

  if (!text) {
    toast.error('Digite uma mensagem para enviar.')
    return
  }

  setSendingMessage(ticket.id, true)

  try {
    await api.post(`/messages/tickets/${ticket.id}/text`, { text })

    messageDraftByTicketId.value = {
      ...messageDraftByTicketId.value,
      [ticket.id]: '',
    }

    toast.success('Mensagem enviada.')
    await Promise.all([loadTicketMessages(ticket.id), loadTickets()])
  } catch (error) {
    const requestError = error as AxiosError<{ error?: string }>
    const backendMessage = requestError.response?.data?.error
    toast.error(backendMessage || 'Não foi possível enviar a mensagem.')
  } finally {
    setSendingMessage(ticket.id, false)
  }
}

const createChat = async () => {
  const instanceId = Number(newChatForm.value.instanceId)
  const contactPhone = newChatForm.value.contactPhone.trim().replace(/\D+/g, '')

  if (!Number.isFinite(instanceId) || instanceId <= 0 || !contactPhone) {
    toast.error('Selecione a instância e informe o telefone do contato.')
    return
  }

  if (contactPhone.length < 10) {
    toast.error('Informe o telefone com DDI e DDD, apenas números.')
    return
  }

  creatingTicket.value = true

  try {
    const { data } = await api.post('/tickets', {
      instance_id: instanceId,
      contact_phone: contactPhone,
      contact_name: newChatForm.value.contactName.trim() || undefined,
      status: 'open',
      priority: 'medium',
    })

    const firstMessage = newChatForm.value.firstMessage.trim()

    let firstMessageFailed = false

    if (firstMessage) {
      try {
        await api.post(`/messages/tickets/${data.id}/text`, {
          text: firstMessage,
        })
      } catch (error) {
        firstMessageFailed = true
        const requestError = error as AxiosError<{ error?: string }>
        const rawMessage = requestError.response?.data?.error || ''

        const friendlyMessage = rawMessage.includes('exists":false') || rawMessage.toLowerCase().includes('bad request')
          ? 'Conversa criada, mas a primeira mensagem falhou porque o número não foi reconhecido no WhatsApp.'
          : rawMessage
            ? `Conversa criada, mas a primeira mensagem falhou: ${rawMessage}`
            : 'Conversa criada, mas a primeira mensagem não foi enviada.'

        toast.warning(friendlyMessage)
      }
    }

    if (!firstMessageFailed) {
      toast.success('Nova conversa iniciada com sucesso.')
    }

    newChatForm.value = {
      ...newChatForm.value,
      contactName: '',
      contactPhone: '',
      firstMessage: '',
    }

    isNewChatModalOpen.value = false

    await loadTickets()
  } catch (error) {
    const requestError = error as AxiosError<{ error?: string }>
    const backendMessage = requestError.response?.data?.error

    toast.error(backendMessage || 'Não foi possível iniciar a conversa.')
  } finally {
    creatingTicket.value = false
  }
}

const updateStatus = async (ticketId: number, status: Ticket['status']) => {
  updatingTicketId.value = ticketId

  try {
    await api.patch(`/tickets/${ticketId}`, { status })
    toast.success('Status da conversa atualizado.')
    await loadTickets()
  } catch {
    toast.error('Não foi possível atualizar esta conversa.')
  } finally {
    updatingTicketId.value = null
  }
}

const handleStatusChange = (ticketId: number, event: Event) => {
  const target = event.target as HTMLSelectElement | null

  if (!target) {
    return
  }

  updateStatus(ticketId, target.value as Ticket['status'])
}

const handleRealtimeMessageCreated = async (payload: { message: Record<string, unknown> }) => {
  const ticketId = Number(payload.message.ticket_id)
  const message = toTicketMessage(payload.message)

  if (!Number.isFinite(ticketId) || !message) {
    return
  }

  upsertTicketMessage(ticketId, message)
  await loadTickets()
}

onMounted(async () => {
  await Promise.all([loadTickets(), loadInstances()])
})

const cleanupRealtimeListeners = [
  onTicketCreated(() => {
    void loadTickets()
  }),
  onTicketUpdated(() => {
    void loadTickets()
  }),
  onMessageCreated((payload) => {
    void handleRealtimeMessageCreated(payload)
  }),
]

onUnmounted(() => {
  cleanupRealtimeListeners.forEach((cleanup) => cleanup())
})

const openNewChatModal = () => {
  isNewChatModalOpen.value = true
}

const closeNewChatModal = () => {
  isNewChatModalOpen.value = false
}
</script>

<template>
  <div class="tickets-page">
    <div class="page-header">
      <UiSectionHeader title="Conversas" subtitle="Acompanhe sua fila em tempo real e priorize atendimentos." />

      <div class="header-actions">
        <div class="search-wrapper">
          <span class="search-icon">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nome, telefone, instância ou status"
            class="search-input"
          />
        </div>

        <button
          type="button"
          class="btn-new-chat gradient-btn"
          @click="openNewChatModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Novo chat
        </button>
      </div>
    </div>

    <UiCard v-if="loading" class="loading-card">
      <div class="loading-content">
        <div class="spinner"></div>
        Carregando conversas...
      </div>
    </UiCard>

    <div v-else class="tickets-container glass">
      <div v-if="filteredTickets.length === 0" class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Nenhuma conversa registrada ainda.
      </div>

      <div v-for="(item, index) in filteredTickets" :key="item.id" class="ticket-card" :style="{ animationDelay: `${index * 0.05}s` }">
        <div class="ticket-content">
          <div class="ticket-info">
            <h3 class="ticket-name">{{ item.contact_name || item.contact_phone }}</h3>
            <p class="ticket-meta">
              <svg class="inline w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {{ item.instance?.name || 'Instância não vinculada' }} • Prioridade {{ item.priority }}
            </p>
            <p v-if="item.updated_at" class="ticket-time">
              <svg class="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ dayjs(item.updated_at).format('DD/MM/YYYY HH:mm') }}
            </p>

            <div class="ticket-actions">
              <button
                class="btn-toggle"
                @click="toggleConversation(item.id)"
              >
                <svg v-if="expandedTicketId !== item.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {{ expandedTicketId === item.id ? 'Fechar conversa' : 'Abrir conversa' }}
              </button>
            </div>

            <div v-if="expandedTicketId === item.id" class="conversation-panel">
              <div v-if="messagesLoadingByTicketId[item.id]" class="messages-loading">
                <div class="spinner-sm"></div>
                Carregando mensagens...
              </div>

              <div v-else class="messages-container">
                <div v-if="!messagesByTicketId[item.id]?.length" class="no-messages">
                  <svg class="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Nenhuma mensagem nesta conversa ainda.
                </div>

                <div
                  v-for="message in messagesByTicketId[item.id] || []"
                  :key="message.id"
                  :class="[
                    'message-bubble',
                    message.direction === 'outbound' ? 'message-outbound' : 'message-inbound'
                  ]"
                >
                  <p class="message-text">{{ message.content || '(sem conteúdo)' }}</p>
                  <p class="message-meta">
                    {{ dayjs(message.created_at).format('DD/MM HH:mm') }} • {{ message.status }}
                  </p>
                </div>
              </div>

              <div v-if="canReplyToTicket" class="reply-section">
                <input
                  :value="messageDraftByTicketId[item.id] || ''"
                  type="text"
                  placeholder="Digite a resposta para o usuário"
                  class="reply-input"
                  @input="messageDraftByTicketId = { ...messageDraftByTicketId, [item.id]: ($event.target as HTMLInputElement).value }"
                  @keyup.enter="sendMessageToTicket(item)"
                />
                <button
                  class="btn-send gradient-btn"
                  :disabled="sendingMessageByTicketId[item.id]"
                  @click="sendMessageToTicket(item)"
                >
                  <svg v-if="!sendingMessageByTicketId[item.id]" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <div v-else class="spinner-sm"></div>
                  {{ sendingMessageByTicketId[item.id] ? 'Enviando...' : 'Enviar' }}
                </button>
              </div>
            </div>
          </div>

          <div class="ticket-status">
            <span :class="statusClass[item.status]">
              {{ statusLabel[item.status] }}
            </span>
            <select
              class="status-select"
              :value="item.status"
              :disabled="updatingTicketId === item.id"
              @change="(event) => handleStatusChange(item.id, event)"
            >
              <option value="open">Aberto</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em atendimento</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <UiModal
      :open="isNewChatModalOpen"
      title="Iniciar novo chat"
      description="Crie uma conversa manual e envie a primeira mensagem (opcional)."
      size="md"
      @close="closeNewChatModal"
    >
      <div class="modal-form">
        <select
          v-model="newChatForm.instanceId"
          class="form-input"
        >
          <option value="" disabled>Selecione a instância</option>
          <option v-for="instance in instances" :key="instance.id" :value="String(instance.id)">
            {{ instance.name }}
          </option>
        </select>

        <input
          v-model="newChatForm.contactPhone"
          type="text"
          placeholder="Telefone do contato (com DDI)"
          class="form-input"
        />

        <input
          v-model="newChatForm.contactName"
          type="text"
          placeholder="Nome do contato (opcional)"
          class="form-input"
        />

        <input
          v-model="newChatForm.firstMessage"
          type="text"
          placeholder="Primeira mensagem (opcional)"
          class="form-input"
        />
      </div>

      <template #footer>
        <button
          type="button"
          class="btn-cancel"
          @click="closeNewChatModal"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="gradient-btn"
          :disabled="creatingTicket"
          @click="createChat"
        >
          <div v-if="creatingTicket" class="spinner-sm"></div>
          {{ creatingTicket ? 'Iniciando...' : 'Iniciar conversa' }}
        </button>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.tickets-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.page-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 1024px) {
  .page-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.header-actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 1024px) {
  .header-actions {
    width: auto;
    flex-direction: row;
    align-items: center;
  }
}

.search-wrapper {
  position: relative;
  width: 100%;
}

@media (min-width: 1024px) {
  .search-wrapper {
    width: 24rem;
  }
}

.search-icon {
  position: absolute;
  inset-y: 0;
  left: 0.75rem;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.25rem;
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.gradient-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--gradient-brand);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-md);
}

.gradient-btn:hover:not(:disabled) {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.gradient-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.gradient-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-new-chat {
  white-space: nowrap;
}

.loading-card {
  padding: 2rem;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.spinner {
  width: 1.25rem;
  height: 1.25rem;
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

.glass {
  background: var(--glass-background);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
}

.tickets-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem;
  border: 2px dashed rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.ticket-card {
  padding: 1rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: var(--border-radius-lg);
  transition: all 0.3s ease;
  animation: slide-up 0.5s ease-out backwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ticket-card:hover {
  border-color: rgba(var(--v-border-color), 0.3);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.ticket-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .ticket-content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.ticket-info {
  width: 100%;
}

.ticket-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0.25rem;
}

.ticket-meta {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 0.25rem;
}

.ticket-time {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: 0.25rem;
}

.ticket-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle:hover {
  background: rgba(var(--v-theme-surface), 0.8);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--shadow-sm);
}

.conversation-panel {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(var(--v-theme-background), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: var(--border-radius-lg);
}

.messages-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-align: center;
}

.message-bubble {
  max-width: 85%;
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

.message-inbound {
  align-self: flex-start;
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
}

.message-outbound {
  align-self: flex-end;
  margin-left: auto;
  background: var(--gradient-brand);
  color: white;
}

.message-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-meta {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  opacity: 0.7;
}

.reply-section {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.reply-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-md);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.reply-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.reply-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.btn-send {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  white-space: nowrap;
}

.ticket-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-open {
  background: rgba(var(--color-primary-500), 0.15);
  color: var(--color-primary-700);
}

.status-pending {
  background: rgba(var(--color-warning-500), 0.15);
  color: var(--color-warning-700);
}

.status-progress {
  background: rgba(var(--color-success-500), 0.15);
  color: var(--color-success-700);
}

.status-resolved {
  background: rgba(var(--color-accent-500), 0.15);
  color: var(--color-accent-700);
}

.status-closed {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.status-select {
  padding: 0.25rem 0.5rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-sm);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-select:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-primary), 0.4);
}

.status-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 1024px) {
  .modal-form {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-input {
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  transition: all 0.3s ease;
}

.form-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.form-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: var(--border-radius-lg);
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

@media (prefers-color-scheme: dark) {
  .glass {
    background: rgba(18, 18, 18, 0.7);
  }

  .ticket-card {
    background: rgba(30, 30, 30, 0.5);
  }
}
</style>

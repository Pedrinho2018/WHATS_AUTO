<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue3-toastify'
import api from '../services/api'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'

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
  open: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  in_progress: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  resolved: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
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

onMounted(async () => {
  await Promise.all([loadTickets(), loadInstances()])
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Conversas</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Acompanhe sua fila em tempo real e priorize atendimentos.</p>
      </div>

      <label class="relative block w-full lg:w-96">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-gray-500">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome, telefone, instância ou status"
          class="w-full rounded-xl border border-gray-300 bg-white py-3 pl-9 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
        />
      </label>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Iniciar novo chat</h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Crie uma conversa manual e envie a primeira mensagem (opcional).</p>

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <select
          v-model="newChatForm.instanceId"
          class="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
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
          class="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
        />

        <input
          v-model="newChatForm.contactName"
          type="text"
          placeholder="Nome do contato (opcional)"
          class="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
        />

        <input
          v-model="newChatForm.firstMessage"
          type="text"
          placeholder="Primeira mensagem (opcional)"
          class="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
        />
      </div>

      <div class="mt-4">
        <button
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="creatingTicket"
          @click="createChat"
        >
          {{ creatingTicket ? 'Iniciando...' : 'Iniciar conversa' }}
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-4 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Carregando conversas...
    </div>

    <div v-else class="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div v-if="filteredTickets.length === 0" class="rounded-lg border border-dashed border-gray-300 p-5 text-gray-600 dark:border-gray-600 dark:text-gray-300">
        Nenhuma conversa registrada ainda.
      </div>

      <div v-for="item in filteredTickets" :key="item.id" class="flex flex-col gap-3 rounded-lg border border-gray-200/80 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div class="w-full">
          <p class="font-semibold text-gray-900 dark:text-white">{{ item.contact_name || item.contact_phone }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ item.instance?.name || 'Instância não vinculada' }} • Prioridade {{ item.priority }}
          </p>
          <p v-if="item.updated_at" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Atualizado em {{ dayjs(item.updated_at).format('DD/MM/YYYY HH:mm') }}
          </p>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              @click="toggleConversation(item.id)"
            >
              {{ expandedTicketId === item.id ? 'Fechar conversa' : 'Abrir conversa' }}
            </button>
          </div>

          <div v-if="expandedTicketId === item.id" class="mt-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-950/50">
            <div v-if="messagesLoadingByTicketId[item.id]" class="text-sm text-gray-600 dark:text-gray-300">
              Carregando mensagens...
            </div>

            <div v-else class="space-y-2">
              <div v-if="!messagesByTicketId[item.id]?.length" class="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma mensagem nesta conversa ainda.
              </div>

              <div
                v-for="message in messagesByTicketId[item.id] || []"
                :key="message.id"
                :class="[
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  message.direction === 'outbound'
                    ? 'ml-auto bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                ]"
              >
                <p class="whitespace-pre-wrap">{{ message.content || '(sem conteúdo)' }}</p>
                <p class="mt-1 text-[11px] opacity-70">
                  {{ dayjs(message.created_at).format('DD/MM HH:mm') }} • {{ message.status }}
                </p>
              </div>
            </div>

            <div v-if="canReplyToTicket" class="mt-3 flex gap-2">
              <input
                :value="messageDraftByTicketId[item.id] || ''"
                type="text"
                placeholder="Digite a resposta para o usuário"
                class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:ring-emerald-900/30"
                @input="messageDraftByTicketId = { ...messageDraftByTicketId, [item.id]: ($event.target as HTMLInputElement).value }"
                @keyup.enter="sendMessageToTicket(item)"
              />
              <button
                class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="sendingMessageByTicketId[item.id]"
                @click="sendMessageToTicket(item)"
              >
                {{ sendingMessageByTicketId[item.id] ? 'Enviando...' : 'Enviar' }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass[item.status]">
            {{ statusLabel[item.status] }}
          </span>
          <select
            class="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
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
</template>
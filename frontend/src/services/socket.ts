import { readonly, ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { appConfig } from '../config/runtime'

type ServerToClientEvents = {
  'server:welcome': (payload: { message: string; timestamp: string }) => void
  'server:pong': (payload: { timestamp: string }) => void
  'server:ticket.created': (payload: { ticket: Record<string, unknown>; timestamp: string }) => void
  'server:ticket.updated': (payload: { ticket: Record<string, unknown>; timestamp: string }) => void
  'server:message.created': (payload: { message: Record<string, unknown>; timestamp: string }) => void
}

type ClientToServerEvents = {
  'client:ping': () => void
  'client:join-ticket': (payload: { ticketId: number }) => void
}

const isSocketDebugEnabled = appConfig.debugSocket
const normalizeSocketUrl = (value?: string): string => {
  return (value || '').trim().replace(/\/api\/?$/, '').replace(/\/+$/, '')
}

const socketUrl =
  normalizeSocketUrl(appConfig.socketUrl) ||
  normalizeSocketUrl(appConfig.apiUrl) ||
  window.location.origin
const socketPath = appConfig.socketPath

const isConnected = ref(false)
const lastError = ref<string | null>(null)
const lastServerMessage = ref<string | null>(null)
const lastPongAt = ref<string | null>(null)
const lastRealtimeEvent = ref<string | null>(null)
const ticketEventsCount = ref(0)
const messageEventsCount = ref(0)

const getStoredToken = (): string | null => {
  const token = localStorage.getItem('token')
  return token?.trim() ? token : null
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
  path: socketPath,
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
})

socket.on('connect', () => {
  isConnected.value = true
  lastError.value = null

  if (isSocketDebugEnabled) {
    console.debug('[SOCKET] conectado', { id: socket.id })
  }
})

socket.on('disconnect', (reason) => {
  isConnected.value = false

  if (isSocketDebugEnabled) {
    console.debug('[SOCKET] desconectado', { reason })
  }
})

socket.on('connect_error', (error) => {
  lastError.value = error.message

  if (isSocketDebugEnabled) {
    console.debug('[SOCKET] erro de conexao', { message: error.message })
  }
})

socket.on('server:welcome', (payload) => {
  lastServerMessage.value = payload.message

  if (isSocketDebugEnabled) {
    console.debug('[SOCKET] boas-vindas', payload)
  }
})

socket.on('server:pong', (payload) => {
  lastPongAt.value = payload.timestamp
})

socket.on('server:ticket.created', () => {
  ticketEventsCount.value += 1
  lastRealtimeEvent.value = 'ticket.created'
})

socket.on('server:ticket.updated', () => {
  ticketEventsCount.value += 1
  lastRealtimeEvent.value = 'ticket.updated'
})

socket.on('server:message.created', () => {
  messageEventsCount.value += 1
  lastRealtimeEvent.value = 'message.created'
})

export const connectSocket = (): void => {
  const token = getStoredToken()

  if (!token || socket.connected) {
    return
  }

  socket.auth = { token }
  socket.connect()
}

export const disconnectSocket = (): void => {
  if (!socket.connected) {
    return
  }

  socket.disconnect()
}

export const sendPing = (): void => {
  if (!socket.connected) {
    return
  }

  socket.emit('client:ping')
}

export const subscribeTicketRoom = (ticketId: number): void => {
  if (!socket.connected || !Number.isFinite(ticketId) || ticketId <= 0) {
    return
  }

  socket.emit('client:join-ticket', { ticketId })
}

export const useSocketState = () => {
  return {
    isConnected: readonly(isConnected),
    lastError: readonly(lastError),
    lastServerMessage: readonly(lastServerMessage),
    lastPongAt: readonly(lastPongAt),
    lastRealtimeEvent: readonly(lastRealtimeEvent),
    ticketEventsCount: readonly(ticketEventsCount),
    messageEventsCount: readonly(messageEventsCount),
  }
}

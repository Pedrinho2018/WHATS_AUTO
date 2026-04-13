<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import { useAuthStore } from '../stores/auth'
import { api } from '../services/api'

interface BotConfig {
  id?: number
  opening_hour: string
  closing_hour: string
  operating_days: number[]
  holidays: Record<string, string>
  welcome_message: string
  standard_messages: Record<string, string>
  active: boolean
}

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)

const weekDays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

const defaultMessages: Record<string, string> = {
  greeting: 'Olá',
  goodbye: 'Até logo',
  help: 'Como posso ajudar?',
  outside_hours: 'Fora do horário de atendimento',
  holiday: 'Contato fechado por feriado',
}

const config = ref<BotConfig>({
  opening_hour: '09:00',
  closing_hour: '18:00',
  operating_days: [1, 2, 3, 4, 5],
  holidays: {},
  welcome_message: 'Olá! Bem-vindo.',
  standard_messages: defaultMessages,
  active: true,
})

const newHolidayDate = ref('')
const newHolidayName = ref('')
const messageErrors = ref<Record<string, string>>({})

const selectedDays = computed({
  get: () => config.value.operating_days,
  set: (value) => {
    config.value.operating_days = value
  },
})

const toggleDay = (day: number) => {
  const index = config.value.operating_days.indexOf(day)
  if (index > -1) {
    config.value.operating_days.splice(index, 1)
  } else {
    config.value.operating_days.push(day)
    config.value.operating_days.sort()
  }
}

const addHoliday = () => {
  if (!newHolidayDate.value || !newHolidayName.value.trim()) {
    toast.error('Preencha a data e o nome do feriado')
    return
  }

  config.value.holidays[newHolidayDate.value] = newHolidayName.value
  newHolidayDate.value = ''
  newHolidayName.value = ''
  toast.success('Feriado adicionado')
}

const removeHoliday = (date: string) => {
  delete config.value.holidays[date]
  toast.success('Feriado removido')
}

const validateMessages = (): boolean => {
  messageErrors.value = {}

  if (!config.value.welcome_message.trim()) {
    messageErrors.value.welcome = 'Mensagem de boas-vindas é obrigatória'
    return false
  }

  if (config.value.welcome_message.length > 1000) {
    messageErrors.value.welcome = 'Mensagem não pode exceder 1000 caracteres'
    return false
  }

  for (const [key, value] of Object.entries(config.value.standard_messages)) {
    if (!value.trim()) {
      messageErrors.value[key] = 'Este campo não pode estar vazio'
      return false
    }
    if (value.length > 500) {
      messageErrors.value[key] = 'Mensagem não pode exceder 500 caracteres'
      return false
    }
  }

  return true
}

const fetchBotConfig = async () => {
  try {
    loading.value = true
    const response = await api.get('/bot-config')
    if (response.data) {
      config.value = response.data
    }
  } catch (error) {
    console.warn('Sem configuração prévia, usando padrão')
  } finally {
    loading.value = false
  }
}

const saveBotConfig = async () => {
  if (!validateMessages()) {
    toast.error('Preencha todos os campos obrigatórios corretamente')
    return
  }

  try {
    saving.value = true
    const payload = {
      opening_hour: config.value.opening_hour,
      closing_hour: config.value.closing_hour,
      operating_days: config.value.operating_days,
      holidays: config.value.holidays,
      welcome_message: config.value.welcome_message,
      standard_messages: config.value.standard_messages,
      active: config.value.active,
    }

    await api.post('/bot-config', payload)
    toast.success('Configurações de bot salvas com sucesso')
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Erro ao salvar configurações')
  } finally {
    saving.value = false
  }
}

const daysLabel = computed(() => {
  return weekDays
    .filter((d) => config.value.operating_days.includes(d.value))
    .map((d) => d.label)
    .join(', ')
})

const baseHour = (): string => {
  return config.value.opening_hour.split(':')[0]
}

const endHour = (): string => {
  return config.value.closing_hour.split(':')[0]
}

onMounted(() => {
  fetchBotConfig()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Configurações do Bot</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Gerencie horários, feriados e mensagens padrão de seus bots</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-600"></div>
      <p class="mt-3 text-gray-600 dark:text-gray-400">Carregando configurações...</p>
    </div>

    <template v-else>
      <!-- Horários de Atendimento -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">⏰ Horários de Atendimento</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Defina quando seu bot deve estar disponível</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Abertura</label>
            <input
              v-model="config.opening_hour"
              type="time"
              class="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Fechamento</label>
            <input
              v-model="config.closing_hour"
              type="time"
              class="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div class="mt-4 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <p class="text-sm text-emerald-800 dark:text-emerald-200">
            <strong>Resumo:</strong> Bot disponível de {{ config.opening_hour }} até {{ config.closing_hour }}
          </p>
        </div>
      </div>

      <!-- Dias de Operação -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">📅 Dias de Operação</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Selecione em quais dias o bot deve estar ativo</p>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <button
            v-for="day in weekDays"
            :key="day.value"
            type="button"
            @click="toggleDay(day.value)"
            :class="[
              'rounded-lg py-3 px-2 text-sm font-semibold transition',
              config.operating_days.includes(day.value)
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            ]"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-500/10">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Selecionado:</strong> {{ daysLabel || 'Nenhum dia selecionado' }}
          </p>
        </div>
      </div>

      <!-- Feriados -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">🎉 Feriados</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure datas em que o bot não será operacional</p>
        </div>

        <div class="mb-4 grid gap-3 sm:grid-cols-7">
          <input
            v-model="newHolidayDate"
            type="date"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
          />
          <input
            v-model="newHolidayName"
            type="text"
            placeholder="Nome do feriado"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white sm:col-span-2"
          />
          <button
            type="button"
            @click="addHoliday"
            class="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 sm:col-span-3"
          >
            + Adicionar Feriado
          </button>
        </div>

        <div v-if="Object.keys(config.holidays).length === 0" class="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400">Nenhum feriado cadastrado</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(name, date) in config.holidays"
            :key="date"
            class="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700"
          >
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ new Date(date).toLocaleDateString('pt-BR') }}</p>
            </div>
            <button
              type="button"
              @click="removeHoliday(date)"
              class="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300"
            >
              Remover
            </button>
          </div>
        </div>
      </div>

      <!-- Mensagem de Boas-vindas -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">👋 Mensagem de Boas-vindas</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Customize a primeira mensagem que o bot enviará</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem</label>
          <textarea
            v-model="config.welcome_message"
            rows="3"
            :class="[
              'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
              messageErrors.welcome ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
            ]"
            placeholder="Digite a mensagem de boas-vindas"
          ></textarea>
          <p v-if="messageErrors.welcome" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ messageErrors.welcome }}</p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ config.welcome_message.length }}/1000 caracteres</p>
        </div>
      </div>

      <!-- Mensagens Padrão -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">💬 Mensagens Padrão</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure mensagens automáticas para diferentes situações</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Saudação</label>
            <input
              v-model="config.standard_messages.greeting"
              type="text"
              placeholder="Ex: Olá"
              :class="[
                'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
                messageErrors.greeting ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
              ]"
            />
            <p v-if="messageErrors.greeting" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ messageErrors.greeting }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Despedida</label>
            <input
              v-model="config.standard_messages.goodbye"
              type="text"
              placeholder="Ex: Até logo"
              :class="[
                'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
                messageErrors.goodbye ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
              ]"
            />
            <p v-if="messageErrors.goodbye" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ messageErrors.goodbye }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Ajuda</label>
            <input
              v-model="config.standard_messages.help"
              type="text"
              placeholder="Ex: Como posso ajudar?"
              :class="[
                'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
                messageErrors.help ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
              ]"
            />
            <p v-if="messageErrors.help" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ messageErrors.help }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Fora do Horário</label>
            <input
              v-model="config.standard_messages.outside_hours"
              type="text"
              placeholder="Ex: Fora do horário de atendimento"
              :class="[
                'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
                messageErrors.outside_hours ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
              ]"
            />
            <p v-if="messageErrors.outside_hours" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ messageErrors.outside_hours }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Feriado</label>
            <input
              v-model="config.standard_messages.holiday"
              type="text"
              placeholder="Ex: Contato fechado por feriado"
              :class="[
                'mt-2 block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
                messageErrors.holiday ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
              ]"
            />
            <p v-if="messageErrors.holiday" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ messageErrors.holiday }}</p>
          </div>
        </div>
      </div>

      <!-- Status e Botões de Ação -->
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Status</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Ative ou desative as configurações do bot</p>
          </div>
          <button
            type="button"
            @click="config.active = !config.active"
            :class="[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              config.active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
            ]"
          >
            {{ config.active ? 'Ativo' : 'Inativo' }}
          </button>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            @click="saveBotConfig"
            :disabled="saving"
            class="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-gray-400"
          >
            <span v-if="saving" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-emerald-600"></span>
            {{ saving ? 'Salvando...' : 'Salvar Configurações' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

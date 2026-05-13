<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue3-toastify'
import api from '../services/api'

interface MessageTemplate {
  id: number
  name: string
  content: string
  category: 'greeting' | 'closing' | 'help' | 'transfer' | 'custom'
}

const templates = ref<MessageTemplate[]>([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  category: 'custom' as MessageTemplate['category'],
  content: '',
})

const categoryLabel: Record<MessageTemplate['category'], string> = {
  greeting: 'Saudacao',
  help: 'Ajuda',
  transfer: 'Transferencia',
  closing: 'Encerramento',
  custom: 'Personalizado',
}

const groupedTemplates = computed(() => {
  return templates.value.reduce<Record<string, MessageTemplate[]>>((acc, template) => {
    const key = template.category || 'custom'
    acc[key] = acc[key] || []
    acc[key].push(template)
    return acc
  }, {})
})

const loadTemplates = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/templates/messages')
    templates.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  editingId.value = null
  form.value = { name: '', category: 'custom', content: '' }
}

const editTemplate = (template: MessageTemplate) => {
  editingId.value = template.id
  form.value = {
    name: template.name,
    category: template.category || 'custom',
    content: template.content,
  }
}

const saveTemplate = async () => {
  if (!form.value.name.trim() || !form.value.content.trim()) {
    toast.warning('Informe nome e conteudo do template.')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await api.patch(`/templates/messages/${editingId.value}`, form.value)
      toast.success('Template atualizado.')
    } else {
      await api.post('/templates/messages', form.value)
      toast.success('Template criado.')
    }

    resetForm()
    await loadTemplates()
  } finally {
    saving.value = false
  }
}

const deleteTemplate = async (template: MessageTemplate) => {
  await api.delete(`/templates/messages/${template.id}`)
  toast.success('Template removido.')
  await loadTemplates()
}

const standardizeTemplates = async () => {
  saving.value = true
  try {
    const { data } = await api.post('/templates/messages/standardize')
    toast.success(`${data.created || 0} templates padrao aplicados.`)
    await loadTemplates()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadTemplates()
})
</script>

<template>
  <div class="templates-page">
    <div class="page-heading">
      <div>
        <p class="text-caption text-medium-emphasis mb-1">Atendimento</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold">Templates de mensagem</h1>
      </div>

      <v-btn prepend-icon="mdi-auto-fix" variant="tonal" :loading="saving" @click="standardizeTemplates">
        Aplicar padrao
      </v-btn>
    </div>

    <v-row dense>
      <v-col cols="12" lg="4">
        <v-card border elevation="0">
          <v-card-title class="section-title">
            {{ editingId ? 'Editar template' : 'Novo template' }}
          </v-card-title>
          <v-card-text class="d-flex flex-column ga-3">
            <v-text-field v-model="form.name" label="Nome" hide-details="auto" variant="outlined" />
            <v-select
              v-model="form.category"
              :items="Object.entries(categoryLabel).map(([value, title]) => ({ value, title }))"
              item-title="title"
              item-value="value"
              label="Categoria"
              hide-details="auto"
              variant="outlined"
            />
            <v-textarea
              v-model="form.content"
              label="Mensagem"
              rows="6"
              auto-grow
              hide-details="auto"
              variant="outlined"
            />
            <div class="d-flex ga-2">
              <v-btn color="primary" :loading="saving" @click="saveTemplate">
                {{ editingId ? 'Salvar' : 'Criar' }}
              </v-btn>
              <v-btn variant="text" @click="resetForm">Limpar</v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-skeleton-loader v-if="loading" type="article, table" />

        <div v-else class="template-groups">
          <v-card
            v-for="(items, category) in groupedTemplates"
            :key="category"
            border
            elevation="0"
          >
            <v-card-title class="section-title">
              {{ categoryLabel[category as MessageTemplate['category']] || category }}
            </v-card-title>
            <v-card-text>
              <div class="template-list">
                <div v-for="template in items" :key="template.id" class="template-row">
                  <div>
                    <strong>{{ template.name }}</strong>
                    <p>{{ template.content }}</p>
                  </div>
                  <div class="template-actions">
                    <v-btn icon="mdi-pencil-outline" size="small" variant="text" @click="editTemplate(template)" />
                    <v-btn icon="mdi-delete-outline" size="small" color="error" variant="text" @click="deleteTemplate(template)" />
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="templates.length === 0" border elevation="0">
            <v-card-text class="empty-panel">
              Nenhum template cadastrado.
            </v-card-text>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.templates-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.template-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
}

.template-row p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  white-space: pre-wrap;
}

.template-actions {
  display: flex;
  flex-shrink: 0;
}

.empty-panel {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
</style>

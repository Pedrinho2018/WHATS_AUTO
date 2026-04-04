export type WorkflowBlockType =
  | 'start'
  | 'message'
  | 'condition'
  | 'action'
  | 'webhook'
  | 'wait'
  | 'end'

export type WorkflowCategory = 'entrada' | 'comunicacao' | 'decisao' | 'operacao' | 'integracao' | 'controle'

export interface WorkflowActionDefinition {
  id: string
  label: string
  description: string
}

export interface WorkflowBlockDefinition {
  type: WorkflowBlockType
  label: string
  description: string
  category: WorkflowCategory
  actions: WorkflowActionDefinition[]
  badgeClass: string
}

export interface WorkflowNode {
  id: string
  type: WorkflowBlockType
  label: string
  category: WorkflowCategory
  actionId: string | null
  x: number
  y: number
}

export interface WorkflowConnection {
  id: string
  fromNodeId: string
  toNodeId: string
}

export interface WorkflowModel {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
}

export const WORKFLOW_BLOCKS: WorkflowBlockDefinition[] = [
  {
    type: 'start',
    label: 'Inicio',
    description: 'Ponto de entrada do fluxo',
    category: 'entrada',
    actions: [
      {
        id: 'session_start',
        label: 'Iniciar sessao',
        description: 'Abre uma nova sessao de atendimento no fluxo.',
      },
      {
        id: 'validate_contact',
        label: 'Validar contato',
        description: 'Valida se o remetente pode seguir para o fluxo.',
      },
    ],
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  {
    type: 'message',
    label: 'Mensagem',
    description: 'Enviar mensagem para o contato',
    category: 'comunicacao',
    actions: [
      {
        id: 'send_text',
        label: 'Enviar texto',
        description: 'Dispara uma mensagem de texto simples no WhatsApp.',
      },
      {
        id: 'send_template',
        label: 'Enviar template',
        description: 'Utiliza um template de mensagem aprovado.',
      },
      {
        id: 'send_media',
        label: 'Enviar midia',
        description: 'Envia imagem, audio, video ou documento.',
      },
    ],
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  {
    type: 'condition',
    label: 'Condicao',
    description: 'Desvio por regra',
    category: 'decisao',
    actions: [
      {
        id: 'check_keyword',
        label: 'Verificar palavra-chave',
        description: 'Compara a mensagem recebida com uma lista de termos.',
      },
      {
        id: 'check_tag',
        label: 'Verificar tag',
        description: 'Avalia tags existentes no contato ou ticket.',
      },
      {
        id: 'check_business_hours',
        label: 'Verificar horario',
        description: 'Decide o caminho com base no horario comercial.',
      },
    ],
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  {
    type: 'action',
    label: 'Acao',
    description: 'Atribuir agente, tag ou setor',
    category: 'operacao',
    actions: [
      {
        id: 'assign_agent',
        label: 'Atribuir agente',
        description: 'Define agente responsavel para o atendimento.',
      },
      {
        id: 'move_sector',
        label: 'Mover setor',
        description: 'Redireciona o atendimento para outro setor.',
      },
      {
        id: 'apply_tag',
        label: 'Aplicar tag',
        description: 'Adiciona uma tag para classificacao do contato.',
      },
    ],
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'Chamar sistema externo',
    category: 'integracao',
    actions: [
      {
        id: 'call_n8n',
        label: 'Disparar n8n',
        description: 'Aciona um workflow externo no n8n.',
      },
      {
        id: 'call_crm',
        label: 'Atualizar CRM',
        description: 'Envia dados do contato para o CRM.',
      },
      {
        id: 'custom_api',
        label: 'API personalizada',
        description: 'Faz requisicao HTTP para endpoint customizado.',
      },
    ],
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  },
  {
    type: 'wait',
    label: 'Espera',
    description: 'Aguardar tempo ou evento',
    category: 'controle',
    actions: [
      {
        id: 'wait_minutes',
        label: 'Aguardar minutos',
        description: 'Pausa o fluxo por um periodo em minutos.',
      },
      {
        id: 'wait_reply',
        label: 'Aguardar resposta',
        description: 'Mantem o fluxo parado ate nova mensagem do cliente.',
      },
    ],
    badgeClass: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100',
  },
  {
    type: 'end',
    label: 'Fim',
    description: 'Encerrar fluxo',
    category: 'controle',
    actions: [
      {
        id: 'close_ticket',
        label: 'Encerrar ticket',
        description: 'Finaliza o ticket ou sessao atual.',
      },
      {
        id: 'finish_flow',
        label: 'Finalizar fluxo',
        description: 'Conclui o fluxo sem novas acoes.',
      },
    ],
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
]

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  entrada: 'Entrada',
  comunicacao: 'Comunicacao',
  decisao: 'Decisao',
  operacao: 'Operacao',
  integracao: 'Integracao',
  controle: 'Controle',
}

export const EMPTY_WORKFLOW_MODEL: WorkflowModel = {
  nodes: [],
  connections: [],
}

const fallbackId = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`

export const generateNodeId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return fallbackId()
}

export const createNodeFromType = (type: WorkflowBlockType, x: number, y: number): WorkflowNode => {
  const definition = WORKFLOW_BLOCKS.find((block) => block.type === type)
  const firstAction = definition?.actions[0] || null

  return {
    id: generateNodeId(),
    type,
    label: definition?.label || 'Bloco',
    category: definition?.category || 'operacao',
    actionId: firstAction?.id || null,
    x,
    y,
  }
}

export const getBlockDefinition = (type: WorkflowBlockType): WorkflowBlockDefinition | undefined => {
  return WORKFLOW_BLOCKS.find((block) => block.type === type)
}

export const getCategoryLabel = (category: WorkflowCategory): string => {
  return WORKFLOW_CATEGORY_LABELS[category] || category
}

export const getActionDefinition = (type: WorkflowBlockType, actionId: string | null | undefined): WorkflowActionDefinition | null => {
  if (!actionId) {
    return null
  }

  const definition = getBlockDefinition(type)
  if (!definition) {
    return null
  }

  return definition.actions.find((action) => action.id === actionId) || null
}

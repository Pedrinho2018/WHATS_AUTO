import { Op, QueryTypes } from 'sequelize';
import DomainError from '../core/errors/domain.error';
import { Flow, FlowWorkspace, Instance, Message, Ticket, TicketAudit, User, MessageTemplate, sequelize } from '../models';
import revolutionService from './revolution.service';
import logger from '../utils';
import operationalEventService from './operational-event.service';

type UserRole = 'admin' | 'manager' | 'agent' | 'viewer';
type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type InstanceStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
type FlowTrigger = 'keyword' | 'greeting' | 'menu' | 'webhook' | 'schedule';
type FlowSource = 'internal' | 'typebot';

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
  messagesToday: number;
  inboundMessagesToday: number;
  outboundMessagesToday: number;
  totalInstances: number;
  connectedInstances: number;
  activeFlows: number;
  totalAgents: number;
  ticketsByAgent: Array<{
    agentId: number | null;
    agentName: string;
    openTickets: number;
    resolvedToday: number;
  }>;
}

export interface CreateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
  password?: string;
}

export interface CreateInstanceInput {
  name?: string;
  evolution_instance?: string;
  phone?: string;
  webhook_url?: string;
}

export interface UpdateInstanceInput {
  name?: string;
  phone?: string;
  status?: InstanceStatus;
  webhook_url?: string;
}

export interface ConnectInstanceResult {
  instance: Instance;
  revolution: {
    instanceName: string;
    status: InstanceStatus;
    qrCode: string;
    pairingCode: string;
    lastUpdateAt: string;
  };
}

export interface ListTicketsContext {
  companyId: number;
  userId: number;
  userRole: UserRole;
}

export interface CreateTicketInput {
  instance_id?: number;
  user_id?: number;
  contact_phone?: string;
  contact_name?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
}

export interface UpdateTicketInput {
  user_id?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateFlowInput {
  name?: string;
  description?: string;
  trigger_type?: FlowTrigger;
  trigger_config?: Record<string, unknown>;
  n8n_workflow_id?: string;
  is_active?: boolean;
  sector?: string;
  assignedAgentIds?: number[];
  source?: FlowSource;
  typebot_url?: string;
}

export interface UpdateFlowInput extends CreateFlowInput {}

export interface CreateMessageTemplateInput {
  name?: string;
  content?: string;
  category?: 'greeting' | 'closing' | 'help' | 'transfer' | 'custom';
}

const STANDARD_MESSAGE_TEMPLATES: Required<CreateMessageTemplateInput>[] = [
  {
    name: 'Saudacao inicial',
    category: 'greeting',
    content: 'Ola, {{nome}}! Sou {{operador}} da {{empresa}}. Como posso ajudar?',
  },
  {
    name: 'Aguardando retorno',
    category: 'help',
    content: 'Fico no aguardo do seu retorno. Se preferir, pode enviar sua duvida em uma unica mensagem.',
  },
  {
    name: 'Transferencia de atendimento',
    category: 'transfer',
    content: 'Vou transferir seu atendimento para o setor responsavel. Um momento, por favor.',
  },
  {
    name: 'Fora do horario',
    category: 'help',
    content: 'Recebemos sua mensagem fora do nosso horario de atendimento. Retornaremos assim que a equipe estiver disponivel.',
  },
  {
    name: 'Encerramento cordial',
    category: 'closing',
    content: 'Seu atendimento foi concluido. Obrigado pelo contato e seguimos a disposicao.',
  },
];

export interface TransferTicketInput {
  user_id?: number;
  status?: TicketStatus;
}

export interface TicketAuditActor {
  id?: number;
  name?: string;
}

export interface ContactDataExport {
  contactPhone: string;
  exportedAt: string;
  tickets: Array<Record<string, unknown>>;
}

export interface PrivacyDeletionResult {
  contactPhone: string;
  anonymizedTickets: number;
  anonymizedMessages: number;
}

export interface RetentionResult {
  retentionDays: number;
  cutoffDate: string;
  anonymizedMessages: number;
}

class ManagementService {
  private normalizeRevolutionInstanceStatus(status: InstanceStatus, qrCode?: string, pairingCode?: string): InstanceStatus {
    if (status === 'error' && (qrCode || pairingCode)) {
      return 'connecting';
    }

    return status;
  }

  private normalizeFlowSource(source: unknown): FlowSource {
    return source === 'typebot' ? 'typebot' : 'internal';
  }

  private normalizeTypebotUrl(rawUrl: unknown): string | null {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return null;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.trim());
    } catch {
      throw new DomainError('URL do Typebot invalida', 400);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new DomainError('A URL do Typebot deve usar http:// ou https://', 400);
    }

    return parsedUrl.toString();
  }

  private extractTypebotPublicId(typebotUrl: string): string | null {
    const parsedUrl = new URL(typebotUrl);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    return pathParts[0] || null;
  }

  private getStoredTypebotUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    try {
      return this.normalizeTypebotUrl(value);
    } catch {
      return null;
    }
  }

  private async ensureFlow(companyId: number, flowId: number): Promise<Flow> {
    const flow = await Flow.findOne({ where: { id: flowId, company_id: companyId } });

    if (!flow) {
      throw new DomainError('Fluxo nao encontrado', 404);
    }

    return flow;
  }

  private sanitizeUser(user: User): Record<string, unknown> {
    const safeUser = user.get({ plain: true }) as unknown as Record<string, unknown> & { password?: string };
    delete safeUser.password;
    return safeUser;
  }

  private normalizeContactPhone(contactPhone: string): string {
    const normalized = contactPhone.replace(/\D/g, '');
    if (!normalized) {
      throw new DomainError('Telefone do contato invalido', 400);
    }

    return normalized;
  }

  private async createTicketAudit(input: {
    companyId: number;
    ticketId: number;
    actor?: TicketAuditActor;
    action: 'created' | 'status_changed' | 'transferred' | 'message_sent';
    previousValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await TicketAudit.create({
      company_id: input.companyId,
      ticket_id: input.ticketId,
      actor_user_id: input.actor?.id,
      actor_name: input.actor?.name,
      action: input.action,
      previous_value: input.previousValue,
      new_value: input.newValue,
      metadata: input.metadata,
    });
  }

  async getDashboard(companyId: number): Promise<DashboardSummary> {
    const summary = await sequelize.query<{
      totalTickets: number;
      openTickets: number;
      resolvedToday: number;
      messagesToday: number;
      inboundMessagesToday: number;
      outboundMessagesToday: number;
      avgResponseSeconds: number | null;
      totalInstances: number;
      connectedInstances: number;
      activeFlows: number;
      totalAgents: number;
    }>(
      `
      SELECT
        (SELECT COUNT(*) FROM tickets WHERE company_id = :companyId AND deleted_at IS NULL) AS totalTickets,
        (SELECT COUNT(*) FROM tickets WHERE company_id = :companyId AND deleted_at IS NULL AND status IN ('open', 'pending', 'in_progress')) AS openTickets,
        (SELECT COUNT(*) FROM tickets WHERE company_id = :companyId AND deleted_at IS NULL AND status = 'resolved' AND DATE(updated_at) = CURRENT_DATE()) AS resolvedToday,
        (SELECT COUNT(*) FROM messages WHERE company_id = :companyId AND DATE(created_at) = CURRENT_DATE()) AS messagesToday,
        (SELECT COUNT(*) FROM messages WHERE company_id = :companyId AND direction = 'inbound' AND DATE(created_at) = CURRENT_DATE()) AS inboundMessagesToday,
        (SELECT COUNT(*) FROM messages WHERE company_id = :companyId AND direction = 'outbound' AND DATE(created_at) = CURRENT_DATE()) AS outboundMessagesToday,
        (
          SELECT AVG(TIMESTAMPDIFF(SECOND, first_inbound.created_at, first_outbound.created_at))
          FROM (
            SELECT ticket_id, MIN(created_at) AS created_at
            FROM messages
            WHERE company_id = :companyId AND direction = 'inbound'
            GROUP BY ticket_id
          ) first_inbound
          INNER JOIN (
            SELECT inbound.ticket_id, MIN(outbound.created_at) AS created_at
            FROM messages inbound
            INNER JOIN messages outbound
              ON outbound.ticket_id = inbound.ticket_id
              AND outbound.company_id = inbound.company_id
              AND outbound.direction = 'outbound'
              AND outbound.created_at > inbound.created_at
            WHERE inbound.company_id = :companyId AND inbound.direction = 'inbound'
            GROUP BY inbound.ticket_id
          ) first_outbound ON first_outbound.ticket_id = first_inbound.ticket_id
        ) AS avgResponseSeconds,
        (SELECT COUNT(*) FROM instances WHERE company_id = :companyId AND deleted_at IS NULL) AS totalInstances,
        (SELECT COUNT(*) FROM instances WHERE company_id = :companyId AND deleted_at IS NULL AND status = 'connected') AS connectedInstances,
        (SELECT COUNT(*) FROM flows WHERE company_id = :companyId AND is_active = true) AS activeFlows,
        (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND role IN ('agent', 'manager') AND is_active = true) AS totalAgents
      `,
      {
        replacements: { companyId },
        type: QueryTypes.SELECT,
        plain: true,
      }
    );

    const ticketsByAgent = await sequelize.query<{
      agentId: number | null;
      agentName: string | null;
      openTickets: number;
      resolvedToday: number;
    }>(
      `
      SELECT
        u.id AS agentId,
        COALESCE(u.name, 'Sem responsavel') AS agentName,
        SUM(CASE WHEN t.status IN ('open', 'pending', 'in_progress') THEN 1 ELSE 0 END) AS openTickets,
        SUM(CASE WHEN t.status = 'resolved' AND DATE(t.updated_at) = CURRENT_DATE() THEN 1 ELSE 0 END) AS resolvedToday
      FROM tickets t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.company_id = :companyId AND t.deleted_at IS NULL
      GROUP BY u.id, u.name
      ORDER BY openTickets DESC, resolvedToday DESC, agentName ASC
      LIMIT 8
      `,
      {
        replacements: { companyId },
        type: QueryTypes.SELECT,
      }
    );

    const avgResponseSeconds = Number(summary?.avgResponseSeconds || 0);
    const avgResponseTime = avgResponseSeconds > 0
      ? `${Math.max(1, Math.round(avgResponseSeconds / 60))}min`
      : 'Sem dados';

    return {
      totalTickets: Number(summary?.totalTickets || 0),
      openTickets: Number(summary?.openTickets || 0),
      resolvedToday: Number(summary?.resolvedToday || 0),
      avgResponseTime,
      messagesToday: Number(summary?.messagesToday || 0),
      inboundMessagesToday: Number(summary?.inboundMessagesToday || 0),
      outboundMessagesToday: Number(summary?.outboundMessagesToday || 0),
      totalInstances: Number(summary?.totalInstances || 0),
      connectedInstances: Number(summary?.connectedInstances || 0),
      activeFlows: Number(summary?.activeFlows || 0),
      totalAgents: Number(summary?.totalAgents || 0),
      ticketsByAgent: ticketsByAgent.map((agent) => ({
        agentId: agent.agentId ? Number(agent.agentId) : null,
        agentName: agent.agentName || 'Sem responsavel',
        openTickets: Number(agent.openTickets || 0),
        resolvedToday: Number(agent.resolvedToday || 0),
      })),
    };
  }

  async listUsers(companyId: number): Promise<User[]> {
    return User.findAll({
      where: { company_id: companyId },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });
  }

  async createUser(companyId: number, input: CreateUserInput, actor?: TicketAuditActor): Promise<Record<string, unknown>> {
    const { name, email, password, role } = input;

    if (!name || !email || !password) {
      throw new DomainError('Nome, email e senha sao obrigatorios', 400);
    }

    const exists = await User.findOne({ where: { company_id: companyId, email } });
    if (exists) {
      throw new DomainError('Email ja cadastrado', 400);
    }

    const user = await User.create({
      company_id: companyId,
      name,
      email,
      password,
      role: role || 'agent',
    });

    logger.info('Usuario criado', {
      companyId,
      userId: user.id,
      role: user.role,
    });

    await operationalEventService.record({
      companyId,
      eventType: 'admin_action',
      status: 'success',
      source: 'management.users',
      detail: 'usuario_criado',
      metadata: {
        actor,
        targetUserId: user.id,
        targetUserRole: user.role,
      },
    });

    return this.sanitizeUser(user);
  }

  async updateUser(companyId: number, userId: number, input: UpdateUserInput, actor?: TicketAuditActor): Promise<Record<string, unknown>> {
    const user = await User.findOne({ where: { id: userId, company_id: companyId } });
    if (!user) {
      throw new DomainError('Usuario nao encontrado', 404);
    }

    const { name, role, is_active, password } = input;

    await user.update({
      name: name ?? user.name,
      role: role ?? user.role,
      is_active: is_active ?? user.is_active,
      password: password || user.password,
    });

    logger.info('Usuario atualizado', {
      companyId,
      userId,
      role: user.role,
      isActive: user.is_active,
    });

    await operationalEventService.record({
      companyId,
      eventType: 'admin_action',
      status: 'success',
      source: 'management.users',
      detail: 'usuario_atualizado',
      metadata: {
        actor,
        targetUserId: user.id,
        changedFields: Object.keys(input).filter((field) => field !== 'password'),
        passwordChanged: Boolean(input.password),
      },
    });

    return this.sanitizeUser(user);
  }

  async exportContactData(companyId: number, contactPhone: string, actor?: TicketAuditActor): Promise<ContactDataExport> {
    const normalizedPhone = this.normalizeContactPhone(contactPhone);
    const tickets = await Ticket.findAll({
      where: { company_id: companyId, contact_phone: normalizedPhone },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
        { model: Instance, as: 'instance', attributes: ['id', 'name', 'phone', 'status'] },
        { model: Message, as: 'messages', separate: true, order: [['created_at', 'ASC']] },
        { model: TicketAudit, as: 'audits', separate: true, order: [['created_at', 'ASC']] },
      ],
      order: [['created_at', 'DESC']],
    });

    await operationalEventService.record({
      companyId,
      eventType: 'data_exported',
      status: 'success',
      source: 'privacy',
      detail: 'dados_do_contato_exportados',
      metadata: {
        actor,
        contactPhoneLast4: normalizedPhone.slice(-4),
        ticketCount: tickets.length,
      },
    });

    return {
      contactPhone: normalizedPhone,
      exportedAt: new Date().toISOString(),
      tickets: tickets.map((ticket) => ticket.get({ plain: true }) as Record<string, unknown>),
    };
  }

  async deleteContactData(companyId: number, contactPhone: string, actor?: TicketAuditActor): Promise<PrivacyDeletionResult> {
    const normalizedPhone = this.normalizeContactPhone(contactPhone);
    const transaction = await sequelize.transaction();

    try {
      const tickets = await Ticket.findAll({
        where: { company_id: companyId, contact_phone: normalizedPhone },
        transaction,
      });
      const ticketIds = tickets.map((ticket) => ticket.id);

      if (ticketIds.length === 0) {
        await transaction.commit();
        await operationalEventService.record({
          companyId,
          eventType: 'data_deleted',
          status: 'warning',
          source: 'privacy',
          detail: 'contato_nao_encontrado_para_remocao',
          metadata: { actor, contactPhoneLast4: normalizedPhone.slice(-4) },
        });
        return { contactPhone: normalizedPhone, anonymizedTickets: 0, anonymizedMessages: 0 };
      }

      const [updatedMessages] = await Message.update(
        {
          content: '[removido por solicitacao LGPD]',
          media_url: null as unknown as string,
          metadata: {
            privacyDeletedAt: new Date().toISOString(),
            privacyReason: 'data_subject_request',
          },
        },
        {
          where: { company_id: companyId, ticket_id: { [Op.in]: ticketIds } },
          transaction,
        }
      );

      await Promise.all(
        tickets.map((ticket) => ticket.update(
          {
            contact_name: 'Contato removido',
            contact_phone: `REMOVIDO_${ticket.id}`.slice(0, 20),
            metadata: {
              ...(ticket.metadata || {}),
              privacyDeletedAt: new Date().toISOString(),
            },
          },
          { transaction }
        ))
      );

      await transaction.commit();

      await operationalEventService.record({
        companyId,
        eventType: 'data_deleted',
        status: 'success',
        source: 'privacy',
        detail: 'dados_do_contato_anonimizados',
        metadata: {
          actor,
          contactPhoneLast4: normalizedPhone.slice(-4),
          ticketCount: tickets.length,
          messageCount: updatedMessages,
        },
      });

      return {
        contactPhone: normalizedPhone,
        anonymizedTickets: tickets.length,
        anonymizedMessages: updatedMessages,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async applyMessageRetention(companyId: number, retentionDays: number, actor?: TicketAuditActor): Promise<RetentionResult> {
    if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      throw new DomainError('Retencao deve estar entre 1 e 3650 dias', 400);
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const retentionWhere: Record<string | symbol, unknown> = {
      company_id: companyId,
      created_at: { [Op.lt]: cutoff },
    };
    const [updatedMessages] = await Message.update(
      {
        content: '[removido por politica de retencao]',
        media_url: null as unknown as string,
        metadata: {
          retentionAppliedAt: new Date().toISOString(),
          retentionDays,
        },
      },
      {
        where: retentionWhere,
      }
    );

    await operationalEventService.record({
      companyId,
      eventType: 'retention_applied',
      status: 'success',
      source: 'privacy',
      detail: 'politica_de_retencao_aplicada',
      metadata: {
        actor,
        retentionDays,
        cutoffDate: cutoff.toISOString(),
        messageCount: updatedMessages,
      },
    });

    return {
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      anonymizedMessages: updatedMessages,
    };
  }

  async listInstances(companyId: number): Promise<Instance[]> {
    const instances = await Instance.findAll({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
    });

    try {
      const revolutionInstances = await revolutionService.listInstances();
      const instancesByName = new Map(
        revolutionInstances.map((instance) => [instance.instanceName, instance])
      );

      await Promise.all(
        instances.map(async (instance) => {
          const revolution = instancesByName.get(instance.evolution_instance);

          if (!revolution) {
            return;
          }

          const nextStatus = this.normalizeRevolutionInstanceStatus(
            revolution.status,
            revolution.qrCode,
            revolution.pairingCode
          );
          const nextQrCode = revolution.qrCode || null;
          const currentQrCode = instance.qr_code || null;

          if (instance.status === nextStatus && currentQrCode === nextQrCode) {
            return;
          }

          await instance.update({
            status: nextStatus,
            qr_code: nextQrCode || undefined,
            last_connected_at: nextStatus === 'connected' ? new Date() : instance.last_connected_at,
          });
        })
      );
    } catch (error) {
      logger.warn('Falha ao sincronizar instancias com a Revolution', error);
    }

    return instances;
  }

  async createInstance(companyId: number, input: CreateInstanceInput): Promise<Instance> {
    const { name, evolution_instance, phone, webhook_url } = input;

    if (!name || !evolution_instance) {
      throw new DomainError('Nome e identificador da instancia sao obrigatorios', 400);
    }

    const existing = await Instance.findOne({ where: { company_id: companyId, evolution_instance } });
    if (existing) {
      throw new DomainError('Instancia ja cadastrada', 400);
    }

    const instance = await Instance.create({
      company_id: companyId,
      name,
      evolution_instance,
      phone,
      webhook_url,
      status: 'disconnected',
    });

    logger.info('Instancia criada', {
      companyId,
      instanceId: instance.id,
      evolutionInstance: instance.evolution_instance,
    });

    return instance;
  }

  async connectInstance(companyId: number, instanceId: number): Promise<ConnectInstanceResult> {
    const instance = await Instance.findOne({ where: { id: instanceId, company_id: companyId } });
    if (!instance) {
      throw new DomainError('Instancia nao encontrada', 404);
    }

    const revolution = await revolutionService.connectInstance(instance.evolution_instance);

    await instance.update({
      status: revolution.status,
      qr_code: revolution.qrCode || undefined,
      last_connected_at: revolution.status === 'connected' ? new Date() : instance.last_connected_at,
    });

    logger.info('Instancia conectada', {
      companyId,
      instanceId: instance.id,
      status: instance.status,
    });

    return {
      instance,
      revolution,
    };
  }

  async updateInstance(companyId: number, instanceId: number, input: UpdateInstanceInput): Promise<Instance> {
    const instance = await Instance.findOne({ where: { id: instanceId, company_id: companyId } });
    if (!instance) {
      throw new DomainError('Instancia nao encontrada', 404);
    }

    const { name, phone, status, webhook_url } = input;

    await instance.update({
      name: name ?? instance.name,
      phone: phone ?? instance.phone,
      status: status ?? instance.status,
      webhook_url: webhook_url ?? instance.webhook_url,
    });

    logger.info('Instancia atualizada', {
      companyId,
      instanceId,
      status: instance.status,
    });

    return instance;
  }

  async listTickets(context: ListTicketsContext): Promise<Ticket[]> {
    const where: Record<string | symbol, unknown> = { company_id: context.companyId };

    if (context.userRole === 'agent') {
      where[Op.or] = [{ user_id: context.userId }, { user_id: null }];
    }

    return Ticket.findAll({
      where,
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
        { model: Instance, as: 'instance', attributes: ['id', 'name', 'phone', 'status'] },
      ],
      order: [['updated_at', 'DESC']],
    });
  }

  async createTicket(companyId: number, input: CreateTicketInput, actor?: TicketAuditActor): Promise<Ticket> {
    const { instance_id, user_id, contact_phone, contact_name, status, priority, tags } = input;

    if (!instance_id || !contact_phone) {
      throw new DomainError('Instancia e telefone do contato sao obrigatorios', 400);
    }

    const ticket = await Ticket.create({
      company_id: companyId,
      instance_id,
      user_id,
      contact_phone,
      contact_name,
      status: status || 'open',
      priority: priority || 'medium',
      tags,
      channel: 'whatsapp',
      last_message_at: new Date(),
    });

    logger.info('Conversa criada', {
      companyId,
      ticketId: ticket.id,
      instanceId: ticket.instance_id,
      status: ticket.status,
    });

    await this.createTicketAudit({
      companyId,
      ticketId: ticket.id,
      actor,
      action: 'created',
      newValue: ticket.status,
      metadata: {
        contactPhone: ticket.contact_phone,
        instanceId: ticket.instance_id,
      },
    });

    return ticket;
  }

  async updateTicket(companyId: number, ticketId: number, input: UpdateTicketInput, actor?: TicketAuditActor): Promise<Ticket> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    const { user_id, status, priority, tags, metadata } = input;
    const previousStatus = ticket.status;
    const previousUserId = ticket.user_id;

    await ticket.update({
      user_id: user_id ?? ticket.user_id,
      status: status ?? ticket.status,
      priority: priority ?? ticket.priority,
      tags: tags ?? ticket.tags,
      metadata: metadata ? { ...(ticket.metadata || {}), ...metadata } : ticket.metadata,
    });

    if (status && status !== previousStatus) {
      await this.createTicketAudit({
        companyId,
        ticketId,
        actor,
        action: 'status_changed',
        previousValue: previousStatus,
        newValue: status,
      });
    }

    if (typeof user_id === 'number' && user_id !== previousUserId) {
      await this.createTicketAudit({
        companyId,
        ticketId,
        actor,
        action: 'transferred',
        previousValue: previousUserId ? String(previousUserId) : 'sem_responsavel',
        newValue: String(user_id),
      });
    }

    logger.info('Conversa atualizada', {
      companyId,
      ticketId,
      status: ticket.status,
      priority: ticket.priority,
    });

    return ticket;
  }

  async listTicketAudit(companyId: number, ticketId: number): Promise<TicketAudit[]> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    return TicketAudit.findAll({
      where: { company_id: companyId, ticket_id: ticketId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
  }

  async listFlows(companyId: number): Promise<Flow[]> {
    return Flow.findAll({
      where: { company_id: companyId },
      order: [['updated_at', 'DESC']],
    });
  }

  async createFlow(companyId: number, input: CreateFlowInput): Promise<Flow> {
    const { name, description, trigger_type, trigger_config, n8n_workflow_id, is_active, sector, assignedAgentIds, source, typebot_url } = input;

    if (!name) {
      throw new DomainError('Nome do fluxo e obrigatorio', 400);
    }

    const flowSource = this.normalizeFlowSource(source);
    const typebotUrl = this.normalizeTypebotUrl(typebot_url);

    if (flowSource === 'typebot' && !typebotUrl) {
      throw new DomainError('URL do Typebot e obrigatoria para fluxos com origem Typebot', 400);
    }

    const flow = await Flow.create({
      company_id: companyId,
      name,
      description,
      trigger_type: trigger_type || 'keyword',
      trigger_config,
      n8n_workflow_id,
      is_active: is_active ?? true,
      settings: {
        sector: sector || 'Geral',
        assignedAgentIds: assignedAgentIds || [],
        source: flowSource,
        ...(typebotUrl
          ? {
              typebotUrl,
              typebotPublicId: this.extractTypebotPublicId(typebotUrl),
            }
          : {}),
      },
    });

    logger.info('Fluxo criado', {
      companyId,
      flowId: flow.id,
      active: flow.is_active,
    });

    return flow;
  }

  async updateFlow(companyId: number, flowId: number, input: UpdateFlowInput): Promise<Flow> {
    const flow = await Flow.findOne({ where: { id: flowId, company_id: companyId } });
    if (!flow) {
      throw new DomainError('Fluxo nao encontrado', 404);
    }

    const { name, description, trigger_type, trigger_config, n8n_workflow_id, is_active, sector, assignedAgentIds, source, typebot_url } = input;
    const previousSettings = (flow.settings || {}) as Record<string, unknown>;
    const flowSource = source ? this.normalizeFlowSource(source) : this.normalizeFlowSource(previousSettings.source);
    const hasTypebotUrlField = Object.prototype.hasOwnProperty.call(input, 'typebot_url');
    const typebotUrl = hasTypebotUrlField ? this.normalizeTypebotUrl(typebot_url) : this.getStoredTypebotUrl(previousSettings.typebotUrl);

    if (flowSource === 'typebot' && !typebotUrl) {
      throw new DomainError('URL do Typebot e obrigatoria para fluxos com origem Typebot', 400);
    }

    await flow.update({
      name: name ?? flow.name,
      description: description ?? flow.description,
      trigger_type: trigger_type ?? flow.trigger_type,
      trigger_config: trigger_config ?? flow.trigger_config,
      n8n_workflow_id: n8n_workflow_id ?? flow.n8n_workflow_id,
      is_active: is_active ?? flow.is_active,
      settings: {
        ...previousSettings,
        ...(sector ? { sector } : {}),
        ...(assignedAgentIds ? { assignedAgentIds } : {}),
        source: flowSource,
        ...(typebotUrl
          ? {
              typebotUrl,
              typebotPublicId: this.extractTypebotPublicId(typebotUrl),
            }
          : {
              typebotUrl: null,
              typebotPublicId: null,
            }),
      },
    });

    logger.info('Fluxo atualizado', {
      companyId,
      flowId,
      active: flow.is_active,
    });

    return flow;
  }

  // ─── Métodos de Mensagens Padrão ───────────────────────────────
  async listMessageTemplates(companyId: number): Promise<MessageTemplate[]> {
    return MessageTemplate.findAll({
      where: { company_id: companyId, is_active: true },
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
  }

  async createMessageTemplate(companyId: number, input: CreateMessageTemplateInput): Promise<MessageTemplate> {
    const { name, content, category } = input;

    if (!name || !content) {
      throw new DomainError('Nome e conteúdo são obrigatórios', 400);
    }

    const template = await MessageTemplate.create({
      company_id: companyId,
      name,
      content,
      category: category || 'custom',
      is_active: true,
    });

    logger.info('Template de mensagem criado', {
      companyId,
      templateId: template.id,
      category: template.category,
    });

    return template;
  }

  async seedStandardMessageTemplates(companyId: number): Promise<{ created: number; skipped: number; templates: MessageTemplate[] }> {
    let created = 0;
    let skipped = 0;
    const templates: MessageTemplate[] = [];

    for (const item of STANDARD_MESSAGE_TEMPLATES) {
      const existing = await MessageTemplate.findOne({
        where: {
          company_id: companyId,
          name: item.name,
          category: item.category,
        },
        paranoid: false,
      });

      if (existing && !existing.deleted_at) {
        skipped += 1;
        templates.push(existing);
        continue;
      }

      if (existing && existing.deleted_at) {
        await existing.restore();
        await existing.update({
          content: item.content,
          is_active: true,
        });
        created += 1;
        templates.push(existing);
        continue;
      }

      const template = await MessageTemplate.create({
        company_id: companyId,
        name: item.name,
        content: item.content,
        category: item.category,
        is_active: true,
      });
      created += 1;
      templates.push(template);
    }

    logger.info('Templates padrao aplicados', { companyId, created, skipped });

    return { created, skipped, templates };
  }

  async updateMessageTemplate(companyId: number, templateId: number, input: Partial<CreateMessageTemplateInput>): Promise<MessageTemplate> {
    const template = await MessageTemplate.findOne({ where: { id: templateId, company_id: companyId } });
    if (!template) {
      throw new DomainError('Template não encontrado', 404);
    }

    const { name, content, category } = input;

    await template.update({
      name: name ?? template.name,
      content: content ?? template.content,
      category: category ?? template.category,
    });

    logger.info('Template de mensagem atualizado', {
      companyId,
      templateId,
    });

    return template;
  }

  async deleteMessageTemplate(companyId: number, templateId: number): Promise<void> {
    const template = await MessageTemplate.findOne({ where: { id: templateId, company_id: companyId } });
    if (!template) {
      throw new DomainError('Template não encontrado', 404);
    }

    await template.destroy();

    logger.info('Template de mensagem deletado', {
      companyId,
      templateId,
    });
  }

  // ─── Métodos de Transferência de Tickets ───────────────────────
  async transferTicket(companyId: number, ticketId: number, input: TransferTicketInput, actor?: TicketAuditActor): Promise<Ticket> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
    if (!ticket) {
      throw new DomainError('Conversa não encontrada', 404);
    }

    const { user_id, status } = input;

    // Se estiver transferindo para um usuário, validar que existe
    if (user_id) {
      const user = await User.findOne({ where: { id: user_id, company_id: companyId, is_active: true } });
      if (!user) {
        throw new DomainError('Usuário não encontrado ou inativo', 404);
      }
    }

    const previousUserId = ticket.user_id;
    const previousStatus = ticket.status;

    await ticket.update({
      user_id: user_id ?? ticket.user_id,
      status: status ?? ticket.status,
    });

    if (user_id && user_id !== previousUserId) {
      await this.createTicketAudit({
        companyId,
        ticketId,
        actor,
        action: 'transferred',
        previousValue: previousUserId ? String(previousUserId) : 'sem_responsavel',
        newValue: String(user_id),
        metadata: {
          status: ticket.status,
        },
      });
    }

    if (status && status !== previousStatus) {
      await this.createTicketAudit({
        companyId,
        ticketId,
        actor,
        action: 'status_changed',
        previousValue: previousStatus,
        newValue: status,
      });
    }

    logger.info('Conversa transferida', {
      companyId,
      ticketId,
      fromUserId: previousUserId,
      toUserId: user_id ?? ticket.user_id,
      status: ticket.status,
    });

    return ticket;
  }

  // ─── Métodos de Configuração do Usuário ────────────────────────
  async updateUserSettings(companyId: number, userId: number, settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const user = await User.findOne({ where: { id: userId, company_id: companyId } });
    if (!user) {
      throw new DomainError('Usuário não encontrado', 404);
    }

    await user.update({
      settings: { ...(user.settings || {}), ...settings },
    });

    logger.info('Configurações de usuário atualizadas', {
      companyId,
      userId,
      settingsKeys: Object.keys(settings),
    });

    return this.sanitizeUser(user);
  }

  // ─── Métodos de Histórico de Tickets ──────────────────────────
  async listTicketHistory(companyId: number, contactPhone: string): Promise<Ticket[]> {
    return Ticket.findAll({
      where: { 
        company_id: companyId,
        contact_phone: contactPhone,
        status: 'closed'
      },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
  }
}

const managementService = new ManagementService();

export { ManagementService };
export default managementService;

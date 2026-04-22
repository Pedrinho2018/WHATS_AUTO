import { Op } from 'sequelize';
import DomainError from '../core/errors/domain.error';
import { Flow, FlowWorkspace, Instance, Ticket, User, MessageTemplate } from '../models';
import revolutionService from './revolution.service';
import logger from '../utils';

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
  totalInstances: number;
  activeFlows: number;
  totalAgents: number;
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

export interface TransferTicketInput {
  user_id?: number;
  status?: TicketStatus;
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

  async getDashboard(companyId: number): Promise<DashboardSummary> {
    const [totalTickets, openTickets, resolvedToday, totalInstances, activeFlows, totalAgents] = await Promise.all([
      Ticket.count({ where: { company_id: companyId } }),
      Ticket.count({ where: { company_id: companyId, status: { [Op.in]: ['open', 'pending', 'in_progress'] } } }),
      Ticket.count({ where: { company_id: companyId, status: 'resolved' } }),
      Instance.count({ where: { company_id: companyId } }),
      Flow.count({ where: { company_id: companyId, is_active: true } }),
      User.count({ where: { company_id: companyId, role: { [Op.in]: ['agent', 'manager'] }, is_active: true } }),
    ]);

    return {
      totalTickets,
      openTickets,
      resolvedToday,
      avgResponseTime: '5min',
      totalInstances,
      activeFlows,
      totalAgents,
    };
  }

  async listUsers(companyId: number): Promise<User[]> {
    return User.findAll({
      where: { company_id: companyId },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
    });
  }

  async createUser(companyId: number, input: CreateUserInput): Promise<Record<string, unknown>> {
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

    return this.sanitizeUser(user);
  }

  async updateUser(companyId: number, userId: number, input: UpdateUserInput): Promise<Record<string, unknown>> {
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

    return this.sanitizeUser(user);
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

  async createTicket(companyId: number, input: CreateTicketInput): Promise<Ticket> {
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

    return ticket;
  }

  async updateTicket(companyId: number, ticketId: number, input: UpdateTicketInput): Promise<Ticket> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    const { user_id, status, priority, tags, metadata } = input;

    await ticket.update({
      user_id: user_id ?? ticket.user_id,
      status: status ?? ticket.status,
      priority: priority ?? ticket.priority,
      tags: tags ?? ticket.tags,
      metadata: metadata ? { ...(ticket.metadata || {}), ...metadata } : ticket.metadata,
    });

    logger.info('Conversa atualizada', {
      companyId,
      ticketId,
      status: ticket.status,
      priority: ticket.priority,
    });

    return ticket;
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
  async transferTicket(companyId: number, ticketId: number, input: TransferTicketInput): Promise<Ticket> {
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

    await ticket.update({
      user_id: user_id ?? ticket.user_id,
      status: status ?? ticket.status,
    });

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

import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middlewares';
import { Flow, Instance, Ticket, User } from '../models';
import revolutionService from '../services/revolution.service';
import logger from '../utils';

class ManagementController {
  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const [totalTickets, openTickets, resolvedToday, totalInstances, activeFlows, totalAgents] = await Promise.all([
        Ticket.count({ where: { company_id: companyId } }),
        Ticket.count({ where: { company_id: companyId, status: { [Op.in]: ['open', 'pending', 'in_progress'] } } }),
        Ticket.count({
          where: {
            company_id: companyId,
            status: 'resolved',
          },
        }),
        Instance.count({ where: { company_id: companyId } }),
        Flow.count({ where: { company_id: companyId, is_active: true } }),
        User.count({ where: { company_id: companyId, role: { [Op.in]: ['agent', 'manager'] }, is_active: true } }),
      ]);

      res.json({
        totalTickets,
        openTickets,
        resolvedToday,
        avgResponseTime: '5min',
        totalInstances,
        activeFlows,
        totalAgents,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dashboard';
      res.status(500).json({ error: message });
    }
  }

  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const users = await User.findAll({
        where: { company_id: companyId },
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      });

      res.json(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar usuarios';
      res.status(500).json({ error: message });
    }
  }

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const { name, email, password, role } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        role?: 'admin' | 'manager' | 'agent' | 'viewer';
      };

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
        return;
      }

      const exists = await User.findOne({ where: { company_id: companyId, email } });
      if (exists) {
        res.status(400).json({ error: 'Email ja cadastrado' });
        return;
      }

      const user = await User.create({
        company_id: companyId,
        name,
        email,
        password,
        role: role || 'agent',
      });

      const safeUser = user.get({ plain: true }) as unknown as Record<string, unknown> & { password?: string };
      delete safeUser.password;

      logger.info('Usuario criado', {
        companyId,
        userId: user.id,
        role: user.role,
      });

      res.status(201).json(safeUser);
    } catch (error) {
      logger.error('Falha ao criar usuario', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar usuario';
      res.status(500).json({ error: message });
    }
  }

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = Number(req.params.id);
      if (!companyId || Number.isNaN(userId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const user = await User.findOne({ where: { id: userId, company_id: companyId } });
      if (!user) {
        res.status(404).json({ error: 'Usuario nao encontrado' });
        return;
      }

      const { name, role, is_active, password } = req.body as {
        name?: string;
        role?: 'admin' | 'manager' | 'agent' | 'viewer';
        is_active?: boolean;
        password?: string;
      };

      await user.update({
        name: name ?? user.name,
        role: role ?? user.role,
        is_active: is_active ?? user.is_active,
        password: password || user.password,
      });

      const safeUser = user.get({ plain: true }) as unknown as Record<string, unknown> & { password?: string };
      delete safeUser.password;

      logger.info('Usuario atualizado', {
        companyId,
        userId,
        role: user.role,
        isActive: user.is_active,
      });

      res.json(safeUser);
    } catch (error) {
      logger.error('Falha ao atualizar usuario', error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar usuario';
      res.status(500).json({ error: message });
    }
  }

  async listInstances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const instances = await Instance.findAll({
        where: { company_id: companyId },
        order: [['created_at', 'DESC']],
      });

      res.json(instances);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar instancias';
      res.status(500).json({ error: message });
    }
  }

  async createInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const { name, evolution_instance, phone, webhook_url } = req.body as {
        name?: string;
        evolution_instance?: string;
        phone?: string;
        webhook_url?: string;
      };

      if (!name || !evolution_instance) {
        res.status(400).json({ error: 'Nome e identificador da instancia sao obrigatorios' });
        return;
      }

      const existing = await Instance.findOne({ where: { company_id: companyId, evolution_instance } });
      if (existing) {
        res.status(400).json({ error: 'Instancia ja cadastrada' });
        return;
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

      res.status(201).json(instance);
    } catch (error) {
      logger.error('Falha ao criar instancia', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar instancia';
      res.status(500).json({ error: message });
    }
  }

  async connectInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = Number(req.params.id);
      if (!companyId || Number.isNaN(instanceId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const instance = await Instance.findOne({ where: { id: instanceId, company_id: companyId } });
      if (!instance) {
        res.status(404).json({ error: 'Instancia nao encontrada' });
        return;
      }

      const revolutionResult = await revolutionService.connectInstance(instance.evolution_instance);

      const nextStatus = revolutionResult.status || 'connecting';
      const qrCode = revolutionResult.qrCode || instance.qr_code;

      await instance.update({
        status: nextStatus,
        qr_code: qrCode,
        last_connected_at: nextStatus === 'connected' ? new Date() : instance.last_connected_at,
      });

      logger.info('Instancia conectada', {
        companyId,
        instanceId: instance.id,
        status: instance.status,
        evolutionInstance: instance.evolution_instance,
      });

      res.json({
        ...instance.toJSON(),
        revolution: revolutionResult,
      });
    } catch (error) {
      logger.error('Falha ao conectar instancia', error);
      const message = error instanceof Error ? error.message : 'Erro ao conectar instancia';
      res.status(502).json({ error: message });
    }
  }

  async updateInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = Number(req.params.id);
      if (!companyId || Number.isNaN(instanceId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const instance = await Instance.findOne({ where: { id: instanceId, company_id: companyId } });
      if (!instance) {
        res.status(404).json({ error: 'Instancia nao encontrada' });
        return;
      }

      const { name, phone, status, webhook_url } = req.body as {
        name?: string;
        phone?: string;
        status?: 'connected' | 'disconnected' | 'connecting' | 'error';
        webhook_url?: string;
      };

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

      res.json(instance);
    } catch (error) {
      logger.error('Falha ao atualizar instancia', error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar instancia';
      res.status(500).json({ error: message });
    }
  }

  async listTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!companyId || !userId || !userRole) {
        res.status(401).json({ error: 'Usuario nao autenticado' });
        return;
      }

      const where: Record<string | symbol, unknown> = { company_id: companyId };

      if (userRole === 'agent') {
        where[Op.or] = [{ user_id: userId }, { user_id: null }];
      }

      const tickets = await Ticket.findAll({
        where,
        include: [
          { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
          { model: Instance, as: 'instance', attributes: ['id', 'name', 'phone', 'status'] },
        ],
        order: [['updated_at', 'DESC']],
      });

      res.json(tickets);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar conversas';
      res.status(500).json({ error: message });
    }
  }

  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const {
        instance_id,
        user_id,
        contact_phone,
        contact_name,
        status,
        priority,
        tags,
      } = req.body as {
        instance_id?: number;
        user_id?: number;
        contact_phone?: string;
        contact_name?: string;
        status?: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        tags?: string[];
      };

      if (!instance_id || !contact_phone) {
        res.status(400).json({ error: 'Instancia e telefone do contato sao obrigatorios' });
        return;
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

      res.status(201).json(ticket);
    } catch (error) {
      logger.error('Falha ao criar conversa', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar conversa';
      res.status(500).json({ error: message });
    }
  }

  async updateTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const ticketId = Number(req.params.id);
      if (!companyId || Number.isNaN(ticketId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
      if (!ticket) {
        res.status(404).json({ error: 'Conversa nao encontrada' });
        return;
      }

      const { user_id, status, priority, tags } = req.body as {
        user_id?: number;
        status?: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        tags?: string[];
      };

      await ticket.update({
        user_id: user_id ?? ticket.user_id,
        status: status ?? ticket.status,
        priority: priority ?? ticket.priority,
        tags: tags ?? ticket.tags,
      });

      logger.info('Conversa atualizada', {
        companyId,
        ticketId,
        status: ticket.status,
        priority: ticket.priority,
      });

      res.json(ticket);
    } catch (error) {
      logger.error('Falha ao atualizar conversa', error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar conversa';
      res.status(500).json({ error: message });
    }
  }

  async listFlows(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const flows = await Flow.findAll({
        where: { company_id: companyId },
        order: [['updated_at', 'DESC']],
      });

      res.json(flows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar fluxos';
      res.status(500).json({ error: message });
    }
  }

  async createFlow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      if (!companyId) {
        res.status(401).json({ error: 'Empresa nao identificada' });
        return;
      }

      const {
        name,
        description,
        trigger_type,
        trigger_config,
        n8n_workflow_id,
        is_active,
        sector,
        assignedAgentIds,
      } = req.body as {
        name?: string;
        description?: string;
        trigger_type?: 'keyword' | 'greeting' | 'menu' | 'webhook' | 'schedule';
        trigger_config?: Record<string, unknown>;
        n8n_workflow_id?: string;
        is_active?: boolean;
        sector?: string;
        assignedAgentIds?: number[];
      };

      if (!name) {
        res.status(400).json({ error: 'Nome do fluxo e obrigatorio' });
        return;
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
        },
      });

      logger.info('Fluxo criado', {
        companyId,
        flowId: flow.id,
        active: flow.is_active,
      });

      res.status(201).json(flow);
    } catch (error) {
      logger.error('Falha ao criar fluxo', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar fluxo';
      res.status(500).json({ error: message });
    }
  }

  async updateFlow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const flowId = Number(req.params.id);
      if (!companyId || Number.isNaN(flowId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const flow = await Flow.findOne({ where: { id: flowId, company_id: companyId } });
      if (!flow) {
        res.status(404).json({ error: 'Fluxo nao encontrado' });
        return;
      }

      const {
        name,
        description,
        trigger_type,
        trigger_config,
        n8n_workflow_id,
        is_active,
        sector,
        assignedAgentIds,
      } = req.body as {
        name?: string;
        description?: string;
        trigger_type?: 'keyword' | 'greeting' | 'menu' | 'webhook' | 'schedule';
        trigger_config?: Record<string, unknown>;
        n8n_workflow_id?: string;
        is_active?: boolean;
        sector?: string;
        assignedAgentIds?: number[];
      };

      await flow.update({
        name: name ?? flow.name,
        description: description ?? flow.description,
        trigger_type: trigger_type ?? flow.trigger_type,
        trigger_config: trigger_config ?? flow.trigger_config,
        n8n_workflow_id: n8n_workflow_id ?? flow.n8n_workflow_id,
        is_active: is_active ?? flow.is_active,
        settings: {
          ...(flow.settings || {}),
          ...(sector ? { sector } : {}),
          ...(assignedAgentIds ? { assignedAgentIds } : {}),
        },
      });

      logger.info('Fluxo atualizado', {
        companyId,
        flowId,
        active: flow.is_active,
      });

      res.json(flow);
    } catch (error) {
      logger.error('Falha ao atualizar fluxo', error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar fluxo';
      res.status(500).json({ error: message });
    }
  }
}

export default new ManagementController();

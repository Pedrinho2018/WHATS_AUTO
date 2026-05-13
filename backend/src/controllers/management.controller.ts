import { Request, Response } from 'express';
import DomainError from '../core/errors/domain.error';
import sendControllerError from '../core/http/controller-error';
import { AuthRequest } from '../middlewares';
import managementService, {
  CreateFlowInput,
  CreateInstanceInput,
  CreateMessageTemplateInput,
  CreateTicketInput,
  CreateUserInput,
  TransferTicketInput,
  UpdateFlowInput,
  UpdateInstanceInput,
  UpdateTicketInput,
  UpdateUserInput,
} from '../services/management.service';
import logger from '../utils';
import { emitTicketCreated, emitTicketUpdated } from '../realtime/events';
import operationalEventService from '../services/operational-event.service';

class ManagementController {
  private requireCompanyId(req: AuthRequest): number {
    const companyId = req.user?.company_id;
    if (!companyId) {
      throw new DomainError('Empresa nao identificada', 401);
    }

    return companyId;
  }

  private parseIdParam(rawId: string | string[] | undefined, errorMessage = 'Dados invalidos'): number {
    const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
    const value = Number(idValue);
    if (Number.isNaN(value)) {
      throw new DomainError(errorMessage, 400);
    }

    return value;
  }

  private getAuditActor(req: AuthRequest): { id?: number; name?: string } {
    return {
      id: req.user?.id,
      name: req.user?.name,
    };
  }

  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const summary = await managementService.getDashboard(companyId);
      res.json(summary);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao carregar dashboard');
    }
  }

  async diagnostics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticketId = req.query.ticketId ? Number(req.query.ticketId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (ticketId !== undefined && !Number.isFinite(ticketId)) {
        throw new DomainError('Ticket invalido', 400);
      }

      const [events, summary] = await Promise.all([
        operationalEventService.list(companyId, { ticketId, limit }),
        operationalEventService.getHealthSummary(companyId),
      ]);

      res.json({ summary, events });
    } catch (error) {
      sendControllerError(res, error, 'Erro ao carregar diagnostico');
    }
  }

  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const users = await managementService.listUsers(companyId);
      res.json(users);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar usuarios');
    }
  }

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const user = await managementService.createUser(companyId, req.body as CreateUserInput, this.getAuditActor(req));
      res.status(201).json(user);
    } catch (error) {
      logger.error('Falha ao criar usuario', error);
      sendControllerError(res, error, 'Erro ao criar usuario');
    }
  }

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const userId = this.parseIdParam(req.params.id);
      const user = await managementService.updateUser(companyId, userId, req.body as UpdateUserInput, this.getAuditActor(req));
      res.json(user);
    } catch (error) {
      logger.error('Falha ao atualizar usuario', error);
      sendControllerError(res, error, 'Erro ao atualizar usuario');
    }
  }

  async updateUserSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const userId = req.user?.id;
      if (!userId) {
        throw new DomainError('Usuário não autenticado', 401);
      }
      const user = await managementService.updateUserSettings(companyId, userId, req.body as Record<string, unknown>);
      res.json(user);
    } catch (error) {
      logger.error('Falha ao atualizar configurações do usuário', error);
      sendControllerError(res, error, 'Erro ao atualizar configurações');
    }
  }

  async listInstances(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const instances = await managementService.listInstances(companyId);
      res.json(instances);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar instancias');
    }
  }

  async createInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const instance = await managementService.createInstance(companyId, req.body as CreateInstanceInput);
      res.status(201).json(instance);
    } catch (error) {
      logger.error('Falha ao criar instancia', error);
      sendControllerError(res, error, 'Erro ao criar instancia');
    }
  }

  async connectInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const instanceId = this.parseIdParam(req.params.id);
      const instance = await managementService.connectInstance(companyId, instanceId);
      res.json(instance);
    } catch (error) {
      logger.error('Falha ao conectar instancia', error);
      sendControllerError(res, error, 'Erro ao conectar instancia');
    }
  }

  async updateInstance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const instanceId = this.parseIdParam(req.params.id);
      const instance = await managementService.updateInstance(companyId, instanceId, req.body as UpdateInstanceInput);
      res.json(instance);
    } catch (error) {
      logger.error('Falha ao atualizar instancia', error);
      sendControllerError(res, error, 'Erro ao atualizar instancia');
    }
  }

  async listTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new DomainError('Usuario nao autenticado', 401);
      }

      const tickets = await managementService.listTickets({ companyId, userId, userRole });
      res.json(tickets);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar conversas');
    }
  }

  async listTicketHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const contactPhoneParam = req.params.contactPhone;
      const contactPhone = Array.isArray(contactPhoneParam) ? contactPhoneParam[0] : contactPhoneParam;

      if (!contactPhone) {
        throw new DomainError('Telefone do contato é obrigatório', 400);
      }

      const tickets = await managementService.listTicketHistory(companyId, contactPhone);
      res.json(tickets);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao buscar histórico de conversas');
    }
  }

  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticket = await managementService.createTicket(companyId, req.body as CreateTicketInput, this.getAuditActor(req));
      emitTicketCreated(ticket);
      res.status(201).json(ticket);
    } catch (error) {
      logger.error('Falha ao criar conversa', error);
      sendControllerError(res, error, 'Erro ao criar conversa');
    }
  }

  async updateTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticketId = this.parseIdParam(req.params.id);
      const ticket = await managementService.updateTicket(companyId, ticketId, req.body as UpdateTicketInput, this.getAuditActor(req));
      emitTicketUpdated(ticket);
      res.json(ticket);
    } catch (error) {
      logger.error('Falha ao atualizar conversa', error);
      sendControllerError(res, error, 'Erro ao atualizar conversa');
    }
  }

  async listTicketAudit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticketId = this.parseIdParam(req.params.id);
      const audits = await managementService.listTicketAudit(companyId, ticketId);
      res.json(audits);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar auditoria da conversa');
    }
  }

  async exportContactData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const contactPhoneParam = req.params.contactPhone;
      const contactPhone = Array.isArray(contactPhoneParam) ? contactPhoneParam[0] : contactPhoneParam;

      if (!contactPhone) {
        throw new DomainError('Telefone do contato é obrigatório', 400);
      }

      const data = await managementService.exportContactData(companyId, contactPhone, this.getAuditActor(req));
      res.json(data);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao exportar dados do contato');
    }
  }

  async deleteContactData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const contactPhoneParam = req.params.contactPhone;
      const contactPhone = Array.isArray(contactPhoneParam) ? contactPhoneParam[0] : contactPhoneParam;

      if (!contactPhone) {
        throw new DomainError('Telefone do contato é obrigatório', 400);
      }

      const result = await managementService.deleteContactData(companyId, contactPhone, this.getAuditActor(req));
      res.json(result);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao remover dados do contato');
    }
  }

  async applyPrivacyRetention(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const retentionDays = Number(req.body?.retentionDays);
      const result = await managementService.applyMessageRetention(companyId, retentionDays, this.getAuditActor(req));
      res.json(result);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao aplicar retencao de mensagens');
    }
  }

  async listFlows(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const flows = await managementService.listFlows(companyId);
      res.json(flows);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar fluxos');
    }
  }

  async createFlow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const flow = await managementService.createFlow(companyId, req.body as CreateFlowInput);
      res.status(201).json(flow);
    } catch (error) {
      logger.error('Falha ao criar fluxo', error);
      sendControllerError(res, error, 'Erro ao criar fluxo');
    }
  }

  async updateFlow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const flowId = this.parseIdParam(req.params.id);
      const flow = await managementService.updateFlow(companyId, flowId, req.body as UpdateFlowInput);
      res.json(flow);
    } catch (error) {
      logger.error('Falha ao atualizar fluxo', error);
      sendControllerError(res, error, 'Erro ao atualizar fluxo');
    }
  }

  // ─── Métodos de Templates de Mensagem ────────────────────────
  async listMessageTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const templates = await managementService.listMessageTemplates(companyId);
      res.json(templates);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar templates');
    }
  }

  async createMessageTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const template = await managementService.createMessageTemplate(companyId, req.body as CreateMessageTemplateInput);
      res.status(201).json(template);
    } catch (error) {
      logger.error('Falha ao criar template', error);
      sendControllerError(res, error, 'Erro ao criar template');
    }
  }

  async seedStandardMessageTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const result = await managementService.seedStandardMessageTemplates(companyId);
      res.status(201).json(result);
    } catch (error) {
      logger.error('Falha ao aplicar templates padrao', error);
      sendControllerError(res, error, 'Erro ao aplicar templates padrao');
    }
  }

  async updateMessageTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const templateId = this.parseIdParam(req.params.id);
      const template = await managementService.updateMessageTemplate(companyId, templateId, req.body as Partial<CreateMessageTemplateInput>);
      res.json(template);
    } catch (error) {
      logger.error('Falha ao atualizar template', error);
      sendControllerError(res, error, 'Erro ao atualizar template');
    }
  }

  async deleteMessageTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const templateId = this.parseIdParam(req.params.id);
      await managementService.deleteMessageTemplate(companyId, templateId);
      res.status(204).send();
    } catch (error) {
      logger.error('Falha ao deletar template', error);
      sendControllerError(res, error, 'Erro ao deletar template');
    }
  }

  // ─── Métodos de Transferência de Tickets ────────────────────────
  async transferTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticketId = this.parseIdParam(req.params.id);
      const ticket = await managementService.transferTicket(companyId, ticketId, req.body as TransferTicketInput, this.getAuditActor(req));
      emitTicketUpdated(ticket);
      res.json(ticket);
    } catch (error) {
      logger.error('Falha ao transferir conversa', error);
      sendControllerError(res, error, 'Erro ao transferir conversa');
    }
  }
}

export default new ManagementController();

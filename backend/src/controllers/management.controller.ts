import { Response } from 'express';
import DomainError from '../core/errors/domain.error';
import sendControllerError from '../core/http/controller-error';
import { AuthRequest } from '../middlewares';
import managementService, {
  CreateFlowInput,
  CreateInstanceInput,
  CreateTicketInput,
  CreateUserInput,
  UpdateFlowInput,
  UpdateInstanceInput,
  UpdateTicketInput,
  UpdateUserInput,
} from '../services/management.service';
import logger from '../utils';
import { emitTicketCreated, emitTicketUpdated } from '../realtime/events';

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

  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const summary = await managementService.getDashboard(companyId);
      res.json(summary);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao carregar dashboard');
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
      const user = await managementService.createUser(companyId, req.body as CreateUserInput);
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
      const user = await managementService.updateUser(companyId, userId, req.body as UpdateUserInput);
      res.json(user);
    } catch (error) {
      logger.error('Falha ao atualizar usuario', error);
      sendControllerError(res, error, 'Erro ao atualizar usuario');
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

  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const ticket = await managementService.createTicket(companyId, req.body as CreateTicketInput);
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
      const ticket = await managementService.updateTicket(companyId, ticketId, req.body as UpdateTicketInput);
      emitTicketUpdated(ticket);
      res.json(ticket);
    } catch (error) {
      logger.error('Falha ao atualizar conversa', error);
      sendControllerError(res, error, 'Erro ao atualizar conversa');
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

  async getFlowWorkspace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const flowId = this.parseIdParam(req.params.id);
      const workspace = await managementService.getFlowWorkspace(companyId, flowId);
      res.json({ workspaceModel: workspace });
    } catch (error) {
      logger.error('Falha ao buscar workspace de fluxo', error);
      sendControllerError(res, error, 'Erro ao buscar workspace do fluxo');
    }
  }

  async saveFlowWorkspace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.requireCompanyId(req);
      const flowId = this.parseIdParam(req.params.id);
      const payload = req.body as { workspaceModel?: unknown };
      const workspace = await managementService.saveFlowWorkspace(companyId, flowId, payload.workspaceModel);
      res.json({ workspaceModel: workspace });
    } catch (error) {
      logger.error('Falha ao salvar workspace de fluxo', error);
      sendControllerError(res, error, 'Erro ao salvar workspace do fluxo');
    }
  }
}

export default new ManagementController();

import { Request, Response } from 'express';
import botConfigService, { BotConfigData } from '../services/bot-config.service';
import { sendControllerError } from '../core/http/send-controller-error';

interface AuthRequest extends Request {
  user?: {
    id: number;
    company_id: number;
  };
}

class BotConfigController {
  /**
   * POST /bot-config - Criar ou atualizar configuração
   */
  async upsertBotConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const data: BotConfigData = {
        company_id: companyId,
        ...req.body,
      };

      const config = await botConfigService.upsertBotConfig(data);
      res.status(200).json(config);
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config - Obter configuração da empresa
   */
  async getBotConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = req.query.instance_id ? Number(req.query.instance_id) : undefined;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const config = await botConfigService.getBotConfigByCompany(companyId, instanceId);

      if (!config) {
        res.status(404).json({ error: 'Configuração não encontrada' });
        return;
      }

      res.status(200).json(config);
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config/all - Obter todas as configurações da empresa
   */
  async getAllBotConfigs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const configs = await botConfigService.getBotConfigsByCompany(companyId);
      res.status(200).json(configs);
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config/:id - Obter configuração por ID
   */
  async getBotConfigById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.company_id;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const config = await botConfigService.getBotConfigById(Number(id));

      if (!config || config.company_id !== companyId) {
        res.status(404).json({ error: 'Configuração não encontrada' });
        return;
      }

      res.status(200).json(config);
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config/check/hours - Verificar se está em horário de atendimento
   */
  async checkBusinessHours(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = req.query.instance_id ? Number(req.query.instance_id) : undefined;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const isOpen = await botConfigService.isWithinBusinessHours(companyId, instanceId);
      res.status(200).json({ is_open: isOpen });
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config/messages/welcome - Obter mensagem de boas-vindas
   */
  async getWelcomeMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = req.query.instance_id ? Number(req.query.instance_id) : undefined;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const message = await botConfigService.getWelcomeMessage(companyId, instanceId);
      res.status(200).json({ welcome_message: message });
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * GET /bot-config/messages/standard - Obter mensagens padrão
   */
  async getStandardMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const instanceId = req.query.instance_id ? Number(req.query.instance_id) : undefined;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const messages = await botConfigService.getStandardMessages(companyId, instanceId);
      res.status(200).json(messages);
    } catch (error) {
      sendControllerError(res, error);
    }
  }

  /**
   * DELETE /bot-config/:id - Deletar configuração
   */
  async deleteBotConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.company_id;

      if (!companyId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      await botConfigService.deleteBotConfig(Number(id), companyId);
      res.status(204).send();
    } catch (error) {
      sendControllerError(res, error);
    }
  }
}

export default new BotConfigController();

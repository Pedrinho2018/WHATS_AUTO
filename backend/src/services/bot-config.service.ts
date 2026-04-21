import BotConfig from '../models/BotConfig';
import { Op } from 'sequelize';
import { DomainError } from '../core/errors/domain.error';

export interface BotConfigData {
  company_id: number;
  instance_id?: number;
  opening_hour: string;
  closing_hour: string;
  operating_days: number[];
  holidays?: Record<string, string>;
  welcome_message: string;
  standard_messages?: Record<string, string>;
  active?: boolean;
}

class BotConfigService {
  /**
   * Criar ou atualizar configuração de bot
   */
  async upsertBotConfig(data: BotConfigData): Promise<BotConfig> {
    this.validateBotConfigData(data);

    let config: BotConfig | null = null;
    const where: any = {
      company_id: data.company_id,
      instance_id: null,
    };

    if (data.instance_id) {
      where.instance_id = data.instance_id;
    } else {
      where.instance_id = null;
    }

    config = await BotConfig.findOne({ where });

    if (config) {
      await config.update(data);
      return config;
    }

    return BotConfig.create(data);
  }

  /**
   * Obter configuração por empresa
   */
  async getBotConfigByCompany(companyId: number, instanceId?: number): Promise<BotConfig | null> {
    const where: any = {
      company_id: companyId,
    };

    if (instanceId) {
      where.instance_id = instanceId;
    } else {
      where.instance_id = null;
    }

    return BotConfig.findOne({ where });
  }

  /**
   * Obter todas as configurações de uma empresa
   */
  async getBotConfigsByCompany(companyId: number): Promise<BotConfig[]> {
    return BotConfig.findAll({
      where: { company_id: companyId, active: true },
    });
  }

  /**
   * Obter configuração por ID
   */
  async getBotConfigById(id: number): Promise<BotConfig | null> {
    return BotConfig.findByPk(id);
  }

  /**
   * Verificar se bot está em horário de atendimento
   */
  async isWithinBusinessHours(
    companyId: number,
    instanceId?: number,
    checkDate?: Date
  ): Promise<boolean> {
    const config = await this.getBotConfigByCompany(companyId, instanceId);

    if (!config || !config.active) {
      return true; // Se não configurado, assume que está aberto
    }

    const now = checkDate || new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Verificar se há feriado
    if (config.holidays) {
      const today = now.toISOString().split('T')[0];
      if (config.holidays[today]) {
        return false; // É feriado
      }
    }

    // Verificar se está no dia de operação
    if (!config.operating_days.includes(dayOfWeek)) {
      return false; // Dia não operacional
    }

    // Verificar se está no horário
    return currentTime >= config.opening_hour && currentTime <= config.closing_hour;
  }

  /**
   * Obter mensagem de boas-vindas
   */
  async getWelcomeMessage(companyId: number, instanceId?: number): Promise<string> {
    const config = await this.getBotConfigByCompany(companyId, instanceId);
    return config?.welcome_message || 'Olá! Bem-vindo.';
  }

  /**
   * Obter mensagens padrão
   */
  async getStandardMessages(companyId: number, instanceId?: number): Promise<Record<string, string>> {
    const config = await this.getBotConfigByCompany(companyId, instanceId);

    return (
      config?.standard_messages || {
        greeting: 'Olá',
        goodbye: 'Até logo',
        help: 'Como posso ajudar?',
        outside_hours: 'Fora do horário de atendimento',
        holiday: 'Contato fechado por feriado',
      }
    );
  }

  /**
   * Deletar configuração
   */
  async deleteBotConfig(id: number, companyId: number): Promise<boolean> {
    const config = await BotConfig.findByPk(id);

    if (!config || config.company_id !== companyId) {
      throw new DomainError('Configuração não encontrada', 404);
    }

    await config.destroy();
    return true;
  }

  /**
   * Validar dados da configuração
   */
  private validateBotConfigData(data: BotConfigData): void {
    if (!data.company_id) {
      throw new DomainError('Company ID é obrigatório', 400);
    }

    if (!data.opening_hour || !/^\d{2}:\d{2}$/.test(data.opening_hour)) {
      throw new DomainError('Horário de abertura deve estar no formato HH:mm', 400);
    }

    if (!data.closing_hour || !/^\d{2}:\d{2}$/.test(data.closing_hour)) {
      throw new DomainError('Horário de fechamento deve estar no formato HH:mm', 400);
    }

    if (data.opening_hour >= data.closing_hour) {
      throw new DomainError('Horário de abertura deve ser anterior ao de fechamento', 400);
    }

    if (!Array.isArray(data.operating_days) || data.operating_days.length === 0) {
      throw new DomainError('Dias de operação deve ser um array não vazio', 400);
    }

    if (!data.welcome_message || data.welcome_message.trim().length === 0) {
      throw new DomainError('Mensagem de boas-vindas é obrigatória', 400);
    }
  }
}

export default new BotConfigService();

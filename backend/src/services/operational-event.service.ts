import { Op } from 'sequelize';
import { OperationalEvent } from '../models';
import logger from '../utils';

type OperationalEventWhere = {
  company_id: number;
  ticket_id?: number;
};

export type OperationalEventType =
  | 'webhook_received'
  | 'message_saved'
  | 'realtime_emitted'
  | 'message_send_failed'
  | 'message_send_retry'
  | 'login_success'
  | 'login_failed'
  | 'admin_action'
  | 'data_exported'
  | 'data_deleted'
  | 'retention_applied';

export type OperationalEventStatus = 'success' | 'warning' | 'error';

export interface RecordOperationalEventInput {
  companyId?: number;
  ticketId?: number;
  messageId?: number;
  eventType: OperationalEventType;
  status: OperationalEventStatus;
  source: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

class OperationalEventService {
  async record(input: RecordOperationalEventInput): Promise<void> {
    try {
      await OperationalEvent.create({
        company_id: input.companyId,
        ticket_id: input.ticketId,
        message_id: input.messageId,
        event_type: input.eventType,
        status: input.status,
        source: input.source,
        detail: input.detail,
        metadata: input.metadata,
      });

      logger.info('Evento operacional registrado', {
        company_id: input.companyId,
        ticket_id: input.ticketId,
        message_id: input.messageId,
        event_type: input.eventType,
        status: input.status,
        source: input.source,
      });
    } catch (error) {
      logger.warn('Falha ao registrar evento operacional', {
        error,
        company_id: input.companyId,
        ticket_id: input.ticketId,
        message_id: input.messageId,
        event_type: input.eventType,
      });
    }
  }

  async list(companyId: number, options?: { ticketId?: number; limit?: number }): Promise<OperationalEvent[]> {
    const limit = Math.min(Math.max(Number(options?.limit || 100), 1), 300);

    const where: OperationalEventWhere = { company_id: companyId };

    if (options?.ticketId) {
      where.ticket_id = options.ticketId;
    }

    return OperationalEvent.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  async getHealthSummary(companyId: number): Promise<{
    totalLast24h: number;
    errorsLast24h: number;
    warningsLast24h: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLast24h, errorsLast24h, warningsLast24h] = await Promise.all([
      OperationalEvent.count({ where: { company_id: companyId, created_at: { [Op.gte]: since } } }),
      OperationalEvent.count({ where: { company_id: companyId, status: 'error', created_at: { [Op.gte]: since } } }),
      OperationalEvent.count({ where: { company_id: companyId, status: 'warning', created_at: { [Op.gte]: since } } }),
    ]);

    return { totalLast24h, errorsLast24h, warningsLast24h };
  }
}

export default new OperationalEventService();

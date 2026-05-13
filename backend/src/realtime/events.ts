import logger from '../utils';
import operationalEventService from '../services/operational-event.service';
import { getSocketServer } from './socket';

type RealtimeEntity = {
  id?: number;
  ticket_id?: number;
  company_id?: number;
  get?: (options?: { plain?: boolean }) => unknown;
};

type RealtimePayload = {
  ticket?: Record<string, unknown>;
  message?: Record<string, unknown>;
  timestamp: string;
};

type RealtimeEvent = 'server:ticket.created' | 'server:ticket.updated' | 'server:message.created';

const toPlainObject = (entity: RealtimeEntity): Record<string, unknown> => {
  if (typeof entity.get === 'function') {
    return entity.get({ plain: true }) as Record<string, unknown>;
  }

  return { ...entity };
};

const emitToCompany = (companyId: number, event: RealtimeEvent, payload: RealtimePayload): void => {
  try {
    const io = getSocketServer();
    (io.to(`company:${companyId}`) as { emit: (name: RealtimeEvent, data: RealtimePayload) => void }).emit(event, payload);
    void operationalEventService.record({
      companyId,
      ticketId: Number(payload.message?.ticket_id || payload.ticket?.id) || undefined,
      messageId: Number(payload.message?.id) || undefined,
      eventType: 'realtime_emitted',
      status: 'success',
      source: 'socket.io',
      detail: event,
    });
  } catch (error) {
    logger.debug('Realtime indisponivel para emissao', { event, companyId, error });
  }
};

const emitToTicket = (ticketId: number, event: RealtimeEvent, payload: RealtimePayload): void => {
  try {
    const io = getSocketServer();
    (io.to(`ticket:${ticketId}`) as { emit: (name: RealtimeEvent, data: RealtimePayload) => void }).emit(event, payload);
  } catch (error) {
    logger.debug('Realtime indisponivel para emissao por ticket', { event, ticketId, error });
  }
};

export const emitTicketCreated = (ticket: RealtimeEntity): void => {
  const plain = toPlainObject(ticket);
  const companyId = Number(plain.company_id);

  if (!companyId) {
    return;
  }

  emitToCompany(companyId, 'server:ticket.created', {
    ticket: plain,
    timestamp: new Date().toISOString(),
  });
};

export const emitTicketUpdated = (ticket: RealtimeEntity): void => {
  const plain = toPlainObject(ticket);
  const companyId = Number(plain.company_id);

  if (!companyId) {
    return;
  }

  emitToCompany(companyId, 'server:ticket.updated', {
    ticket: plain,
    timestamp: new Date().toISOString(),
  });
};

export const emitMessageCreated = (message: RealtimeEntity): void => {
  const plain = toPlainObject(message);
  const companyId = Number(plain.company_id);
  const ticketId = Number(plain.ticket_id);

  if (!companyId || !ticketId) {
    return;
  }

  const payload = {
    message: plain,
    timestamp: new Date().toISOString(),
  };

  emitToCompany(companyId, 'server:message.created', payload);
  emitToTicket(ticketId, 'server:message.created', payload);
};

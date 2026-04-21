import { Op } from 'sequelize';
import { Flow, Instance, Message, Ticket } from '../../models';
import { emitMessageCreated, emitTicketCreated, emitTicketUpdated } from '../../realtime/events';
import logger from '../../utils';
import { ParsedInbound } from './contracts';
import N8nDispatcherStrategy from './strategies/n8n-dispatcher.strategy';
import TypebotDispatcherStrategy from './strategies/typebot-dispatcher.strategy';

export type InboundProcessingResult = {
  received: boolean;
  processed: boolean;
  dispatched?: boolean;
  typebotDispatched?: boolean;
  typebotFallbackReason?: string | null;
  ticketId?: number;
  messageId?: number;
  reason?: string;
};

export default class ChatbotOrchestratorService {
  private readonly typebotStrategy = new TypebotDispatcherStrategy();

  private readonly n8nStrategy = new N8nDispatcherStrategy();

  private async findOrCreateTicket(instance: Instance, parsed: ParsedInbound): Promise<{ ticket: Ticket; wasNew: boolean }> {
    const openTicket = await Ticket.findOne({
      where: {
        company_id: instance.company_id,
        instance_id: instance.id,
        contact_phone: parsed.phone,
        status: { [Op.notIn]: ['resolved', 'closed'] },
      },
      order: [['updated_at', 'DESC']],
    });

    if (openTicket) {
      return { ticket: openTicket, wasNew: false };
    }

    const created = await Ticket.create({
      company_id: instance.company_id,
      instance_id: instance.id,
      contact_phone: parsed.phone,
      contact_name: parsed.pushName,
      status: 'open',
      priority: 'medium',
      channel: 'whatsapp',
      last_message_at: new Date(),
    });

    return { ticket: created, wasNew: true };
  }

  private async persistInboundMessage(instance: Instance, ticket: Ticket, parsed: ParsedInbound, rawPayload: Record<string, unknown>): Promise<Message> {
    return Message.create({
      company_id: instance.company_id,
      ticket_id: ticket.id,
      instance_id: instance.id,
      message_id: parsed.externalMessageId,
      direction: 'inbound',
      type: 'text',
      content: parsed.text,
      metadata: {
        remoteJid: parsed.remoteJid,
        rawPayload,
      },
      status: 'delivered',
      sent_at: new Date(),
    });
  }

  async processInbound(parsed: ParsedInbound, rawPayload: Record<string, unknown>): Promise<InboundProcessingResult> {
    const instance = await Instance.findOne({ where: { evolution_instance: parsed.instanceName } });

    if (!instance) {
      logger.warn('Webhook inbound ignorado: instancia nao encontrada', {
        instanceName: parsed.instanceName,
      });

      return {
        received: true,
        processed: false,
        reason: 'instance_not_found',
      };
    }

    const { ticket, wasNew } = await this.findOrCreateTicket(instance, parsed);

    if (wasNew) {
      emitTicketCreated(ticket);
    }

    await ticket.update({
      contact_name: ticket.contact_name || parsed.pushName,
      last_message_at: new Date(),
    });
    emitTicketUpdated(ticket);

    const inboundMessage = await this.persistInboundMessage(instance, ticket, parsed, rawPayload);
    emitMessageCreated(inboundMessage);

    const flows = await Flow.findAll({
      where: {
        company_id: instance.company_id,
        is_active: true,
        trigger_type: 'webhook',
      },
      order: [['updated_at', 'DESC']],
    });

    const typebotFlow = flows.find((flow) => this.typebotStrategy.canHandle(flow));
    const fallbackFlow = flows.find((flow) => !this.typebotStrategy.canHandle(flow));

    let typebotDispatched = false;
    let typebotFallbackReason: string | null = null;

    if (typebotFlow) {
      const typebotResult = await this.typebotStrategy.dispatch({
        flow: typebotFlow,
        instance,
        ticket,
        parsed,
        rawPayload,
        messageId: inboundMessage.id,
      });

      typebotDispatched = typebotResult.delivered;
      typebotFallbackReason = typebotResult.reason || null;

      if (typebotResult.sessionId) {
        const currentMetadata = (ticket.metadata || {}) as Record<string, unknown>;
        await ticket.update({
          metadata: {
            ...currentMetadata,
            typebot: {
              flowId: typebotFlow.id,
              sessionId: typebotResult.sessionId,
              lastDispatchedAt: new Date().toISOString(),
            },
          },
        });
        emitTicketUpdated(ticket);
      }
    }

    const shouldFallbackToN8n = !typebotDispatched;
    const n8nResult = shouldFallbackToN8n
      ? await this.n8nStrategy.dispatch({
          flow: fallbackFlow,
          typebotFlowId: typebotFlow?.id,
          instance,
          ticket,
          parsed,
          rawPayload,
          messageId: inboundMessage.id,
          typebotFallbackReason,
        })
      : { delivered: false };

    return {
      received: true,
      processed: true,
      dispatched: n8nResult.delivered,
      typebotDispatched,
      typebotFallbackReason,
      ticketId: ticket.id,
      messageId: inboundMessage.id,
    };
  }
}

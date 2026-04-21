import { Op, Transaction } from 'sequelize';
import { Flow, Instance, Message, Ticket } from '../../../models';
import {
  CreateInboundMessageInput,
  CreateOutboundMessageInput,
  FlowRepository,
  InstanceRepository,
  ListMessagesOptions,
  MessageRepository,
  TicketRepository,
} from '../../../application/chatbot/persistence/repositories';

export class SequelizeInstanceRepository implements InstanceRepository {
  async findByEvolutionInstance(instanceName: string): Promise<Instance | null> {
    return Instance.findOne({ where: { evolution_instance: instanceName } });
  }

  async findByIdAndCompany(instanceId: number, companyId: number): Promise<Instance | null> {
    return Instance.findOne({ where: { id: instanceId, company_id: companyId } });
  }
}

export class SequelizeTicketRepository implements TicketRepository {
  async findByIdAndCompany(ticketId: number, companyId: number): Promise<Ticket | null> {
    return Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
  }

  async findLatestOpenByContact(
    companyId: number,
    instanceId: number,
    contactPhone: string,
    transaction?: Transaction
  ): Promise<Ticket | null> {
    return Ticket.findOne({
      where: {
        company_id: companyId,
        instance_id: instanceId,
        contact_phone: contactPhone,
        status: { [Op.notIn]: ['resolved', 'closed'] },
      },
      order: [['updated_at', 'DESC']],
      transaction,
    });
  }

  async createInboundTicket(
    input: {
      companyId: number;
      instanceId: number;
      contactPhone: string;
      contactName?: string;
    },
    transaction?: Transaction
  ): Promise<Ticket> {
    return Ticket.create(
      {
        company_id: input.companyId,
        instance_id: input.instanceId,
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        status: 'open',
        priority: 'medium',
        channel: 'whatsapp',
        last_message_at: new Date(),
      },
      { transaction }
    );
  }

  async touchLastMessage(ticket: Ticket, contactName?: string, transaction?: Transaction): Promise<Ticket> {
    return ticket.update(
      {
        contact_name: ticket.contact_name || contactName,
        last_message_at: new Date(),
      },
      { transaction }
    );
  }

  async updateTypebotSession(ticket: Ticket, flowId: number, sessionId: string, transaction?: Transaction): Promise<Ticket> {
    const currentMetadata = (ticket.metadata || {}) as Record<string, unknown>;

    return ticket.update(
      {
        metadata: {
          ...currentMetadata,
          typebot: {
            flowId,
            sessionId,
            lastDispatchedAt: new Date().toISOString(),
          },
        },
      },
      { transaction }
    );
  }
}

export class SequelizeMessageRepository implements MessageRepository {
  async listByTicket(companyId: number, ticketId: number, options: ListMessagesOptions): Promise<Message[]> {
    return Message.findAll({
      where: { company_id: companyId, ticket_id: ticketId },
      order: [['created_at', 'ASC']],
      limit: options.limit,
      offset: options.offset,
    });
  }

  async createInbound(input: CreateInboundMessageInput, transaction?: Transaction): Promise<Message> {
    return Message.create(
      {
        company_id: input.companyId,
        ticket_id: input.ticketId,
        instance_id: input.instanceId,
        message_id: input.messageId,
        direction: 'inbound',
        type: 'text',
        content: input.content,
        metadata: {
          remoteJid: input.remoteJid,
          rawPayload: input.rawPayload,
        },
        status: 'delivered',
        sent_at: new Date(),
      },
      { transaction }
    );
  }

  async createOutbound(input: CreateOutboundMessageInput, transaction?: Transaction): Promise<Message> {
    return Message.create(
      {
        company_id: input.companyId,
        ticket_id: input.ticketId,
        instance_id: input.instanceId,
        message_id: input.messageId,
        direction: 'outbound',
        type: 'text',
        content: input.content,
        metadata: {
          operatorName: input.operatorName,
          originalText: input.originalText,
        },
        status: input.status,
        sent_at: input.sentAt,
      },
      { transaction }
    );
  }
}

export class SequelizeFlowRepository implements FlowRepository {
  async listActiveWebhookFlows(companyId: number): Promise<Flow[]> {
    return Flow.findAll({
      where: {
        company_id: companyId,
        is_active: true,
        trigger_type: 'webhook',
      },
      order: [['updated_at', 'DESC']],
    });
  }
}

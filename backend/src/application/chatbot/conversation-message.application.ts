import DomainError from '../../core/errors/domain.error';
import { Message, TicketAudit } from '../../models';
import { emitMessageCreated, emitTicketUpdated } from '../../realtime/events';
import { MessageProviderPort } from './providers/message-provider.port';
import {
  InstanceRepository,
  MessageRepository,
  TicketRepository,
} from './persistence/repositories';
import { UnitOfWork } from './persistence/unit-of-work';
import {
  SequelizeInstanceRepository,
  SequelizeMessageRepository,
  SequelizeTicketRepository,
} from '../../infrastructure/persistence/sequelize/sequelize-chatbot.repositories';
import SequelizeUnitOfWork from '../../infrastructure/persistence/sequelize/sequelize-unit-of-work';

export default class ConversationMessageApplication {
  constructor(
    private readonly messageProvider: MessageProviderPort,
    private readonly ticketRepository: TicketRepository = new SequelizeTicketRepository(),
    private readonly instanceRepository: InstanceRepository = new SequelizeInstanceRepository(),
    private readonly messageRepository: MessageRepository = new SequelizeMessageRepository(),
    private readonly unitOfWork: UnitOfWork = new SequelizeUnitOfWork()
  ) {}

  async listTicketMessages(companyId: number, ticketId: number, limit = 200, offset = 0): Promise<Message[]> {
    const ticket = await this.ticketRepository.findByIdAndCompany(ticketId, companyId);

    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200;
    const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

    return this.messageRepository.listByTicket(companyId, ticketId, {
      limit: safeLimit,
      offset: safeOffset,
    });
  }

  async sendTextToTicket(
    companyId: number,
    ticketId: number,
    operatorName: string,
    text: string,
    operatorUserId?: number
  ): Promise<{ message: Message; provider: Record<string, unknown> }> {
    const ticket = await this.ticketRepository.findByIdAndCompany(ticketId, companyId);
    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    const instance = await this.instanceRepository.findByIdAndCompany(ticket.instance_id, companyId);
    if (!instance) {
      throw new DomainError('Instancia nao encontrada', 404);
    }

    const normalizedText = text.trim();
    const textWithOperator = `*${operatorName}*\n${normalizedText}`;

    const outbound = await this.messageProvider.sendText({
      instanceName: instance.evolution_instance,
      to: ticket.contact_phone,
      text: textWithOperator,
    });

    const message = await this.unitOfWork.runInTransaction(async ({ tx }) => {
      const persisted = await this.messageRepository.createOutbound(
        {
          companyId,
          ticketId: ticket.id,
          instanceId: instance.id,
          messageId: outbound.messageId,
          content: outbound.text,
          operatorName,
          originalText: normalizedText,
          status: outbound.status === 'sent' ? 'sent' : 'failed',
          sentAt: new Date(outbound.sentAt),
        },
        tx
      );

      await this.ticketRepository.touchLastMessage(ticket, ticket.contact_name || undefined, tx);

      await TicketAudit.create(
        {
          company_id: companyId,
          ticket_id: ticket.id,
          actor_user_id: operatorUserId,
          actor_name: operatorName,
          action: 'message_sent',
          new_value: persisted.status,
          metadata: {
            messageId: persisted.id,
            providerMessageId: outbound.messageId,
          },
        },
        { transaction: tx }
      );

      return persisted;
    });

    emitMessageCreated(message);
    emitTicketUpdated(ticket);

    return {
      message,
      provider: outbound,
    };
  }
}

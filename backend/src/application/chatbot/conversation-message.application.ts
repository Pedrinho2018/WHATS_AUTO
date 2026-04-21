import DomainError from '../../core/errors/domain.error';
import { Instance, Message, Ticket } from '../../models';
import { emitMessageCreated, emitTicketUpdated } from '../../realtime/events';
import { MessageProviderPort } from './providers/message-provider.port';

export default class ConversationMessageApplication {
  constructor(private readonly messageProvider: MessageProviderPort) {}

  async listTicketMessages(companyId: number, ticketId: number): Promise<Message[]> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });

    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    return Message.findAll({
      where: { company_id: companyId, ticket_id: ticketId },
      order: [['created_at', 'ASC']],
    });
  }

  async sendTextToTicket(
    companyId: number,
    ticketId: number,
    operatorName: string,
    text: string
  ): Promise<{ message: Message; provider: Record<string, unknown> }> {
    const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
    if (!ticket) {
      throw new DomainError('Conversa nao encontrada', 404);
    }

    const instance = await Instance.findOne({ where: { id: ticket.instance_id, company_id: companyId } });
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

    const message = await Message.create({
      company_id: companyId,
      ticket_id: ticket.id,
      instance_id: instance.id,
      message_id: outbound.messageId,
      direction: 'outbound',
      type: 'text',
      content: outbound.text,
      metadata: {
        operatorName,
        originalText: normalizedText,
      },
      status: outbound.status === 'sent' ? 'sent' : 'failed',
      sent_at: new Date(outbound.sentAt),
    });

    await ticket.update({ last_message_at: new Date() });
    emitMessageCreated(message);
    emitTicketUpdated(ticket);

    return {
      message,
      provider: outbound,
    };
  }
}

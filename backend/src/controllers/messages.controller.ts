import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import { Instance, Message, Ticket } from '../models';
import revolutionService from '../services/revolution.service';
import logger from '../utils';
import { emitMessageCreated, emitTicketUpdated } from '../realtime/events';

class MessagesController {
  async listTicketMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const ticketId = Number(req.params.ticketId);

      if (!companyId || Number.isNaN(ticketId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
      if (!ticket) {
        res.status(404).json({ error: 'Conversa nao encontrada' });
        return;
      }

      const messages = await Message.findAll({
        where: { company_id: companyId, ticket_id: ticketId },
        order: [['created_at', 'ASC']],
      });

      res.json(messages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao listar mensagens';
      res.status(500).json({ error: message });
    }
  }

  async sendTextToTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const operatorName = req.user?.name?.trim() || 'Operador';
      const ticketId = Number(req.params.ticketId);
      const { text } = req.body as { text?: string };

      if (!companyId || Number.isNaN(ticketId) || !text?.trim()) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const ticket = await Ticket.findOne({ where: { id: ticketId, company_id: companyId } });
      if (!ticket) {
        res.status(404).json({ error: 'Conversa nao encontrada' });
        return;
      }

      const instance = await Instance.findOne({ where: { id: ticket.instance_id, company_id: companyId } });
      if (!instance) {
        res.status(404).json({ error: 'Instancia nao encontrada' });
        return;
      }

      const normalizedText = text.trim();
      const textWithOperator = `*${operatorName}*\n${normalizedText}`;

      const outbound = await revolutionService.sendTextMessage({
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

      res.status(201).json({
        message,
        provider: outbound,
      });
    } catch (error) {
      logger.error('Falha ao enviar mensagem para conversa', error);
      const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      res.status(502).json({ error: message });
    }
  }
}

export default new MessagesController();
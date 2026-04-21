import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import ConversationMessageApplication from '../application/chatbot/conversation-message.application';
import RevolutionMessageProvider from '../application/chatbot/providers/revolution-message.provider';
import DomainError from '../core/errors/domain.error';
import logger from '../utils';

class MessagesController {
  private readonly conversationMessageApplication = new ConversationMessageApplication(new RevolutionMessageProvider());

  async listTicketMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user?.company_id;
      const ticketId = Number(req.params.ticketId);

      if (!companyId || Number.isNaN(ticketId)) {
        res.status(400).json({ error: 'Dados invalidos' });
        return;
      }

      const messages = await this.conversationMessageApplication.listTicketMessages(companyId, ticketId);

      res.json(messages);
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

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

      const result = await this.conversationMessageApplication.sendTextToTicket(
        companyId,
        ticketId,
        operatorName,
        text
      );

      res.status(201).json({
        message: result.message,
        provider: result.provider,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      logger.error('Falha ao enviar mensagem para conversa', error);
      const message = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      res.status(502).json({ error: message });
    }
  }
}

export default new MessagesController();
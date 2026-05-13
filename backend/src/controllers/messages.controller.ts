import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import ConversationMessageApplication from '../application/chatbot/conversation-message.application';
import RevolutionMessageProvider from '../application/chatbot/providers/revolution-message.provider';
import sendControllerError from '../core/http/controller-error';
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

      const rawLimit = Number(req.query.limit);
      const rawOffset = Number(req.query.offset);
      const limit = Number.isNaN(rawLimit) ? 200 : rawLimit;
      const offset = Number.isNaN(rawOffset) ? 0 : rawOffset;

      const messages = await this.conversationMessageApplication.listTicketMessages(companyId, ticketId, limit, offset);

      res.json(messages);
    } catch (error) {
      sendControllerError(res, error, 'Erro ao listar mensagens');
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
        text,
        req.user?.id
      );

      res.status(201).json({
        message: result.message,
        provider: result.provider,
      });
    } catch (error) {
      logger.error('Falha ao enviar mensagem para conversa', error);
      sendControllerError(res, error, 'Erro ao enviar mensagem', 502);
    }
  }
}

export default new MessagesController();

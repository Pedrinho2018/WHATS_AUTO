import { Request, Response } from 'express';
import ChatbotOrchestratorService from '../application/chatbot/chatbot-orchestrator.service';
import InboundMessageParser from '../application/chatbot/inbound-message.parser';
import operationalEventService from '../services/operational-event.service';
import logger from '../utils';

class WebhookController {
  private readonly parser = new InboundMessageParser();

  private readonly chatbotOrchestrator = new ChatbotOrchestratorService();

  async evolutionInbound(req: Request, res: Response): Promise<void> {
    try {
      const rawPayload = (req.body || {}) as Record<string, unknown>;
      const parsed = this.parser.parse(rawPayload);

      await operationalEventService.record({
        eventType: 'webhook_received',
        status: parsed ? 'success' : 'warning',
        source: 'evolution',
        detail: parsed ? 'Webhook inbound recebido' : 'Webhook inbound ignorado pelo parser',
        metadata: {
          instanceName: parsed?.instanceName,
          remoteJid: parsed?.remoteJid,
          fromMe: parsed?.fromMe,
          hasText: Boolean(parsed?.text),
        },
      });

      if (!parsed || !parsed.instanceName || !parsed.text || parsed.fromMe) {
        res.status(202).json({ received: true, processed: false });
        return;
      }

      const result = await this.chatbotOrchestrator.processInbound(parsed, rawPayload);
      res.status(202).json(result);
    } catch (error) {
      logger.error('Falha ao processar webhook inbound da Evolution', error);
      res.status(500).json({ error: 'Erro ao processar webhook inbound' });
    }
  }
}

export default new WebhookController();

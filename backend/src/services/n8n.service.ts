import logger from '../utils';

interface N8nInboundPayload {
  flowId?: string;
  companyId: number;
  ticketId: number;
  messageId: number;
  instanceName: string;
  phone: string;
  name?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

class N8nService {
  private get baseUrl(): string {
    return (process.env.N8N_WEBHOOK_URL || 'http://n8n:5678').replace(/\/$/, '');
  }

  private get secret(): string {
    return process.env.N8N_WEBHOOK_SECRET || '';
  }

  private buildWebhookPath(flowId?: string): string {
    if (flowId) {
      return `/webhook/${encodeURIComponent(flowId)}`;
    }

    return '/webhook/whatsapp';
  }

  async dispatchInboundMessage(payload: N8nInboundPayload): Promise<boolean> {
    const url = `${this.baseUrl}${this.buildWebhookPath(payload.flowId)}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.secret) {
      headers['x-webhook-secret'] = this.secret;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'message.inbound',
          companyId: payload.companyId,
          ticketId: payload.ticketId,
          messageId: payload.messageId,
          instanceName: payload.instanceName,
          phone: payload.phone,
          name: payload.name,
          text: payload.text,
          metadata: payload.metadata,
          receivedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        logger.warn('Falha ao despachar evento inbound para n8n', {
          url,
          status: response.status,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.warn('Erro ao despachar evento inbound para n8n', {
        url,
        error,
      });
      return false;
    }
  }
}

export default new N8nService();
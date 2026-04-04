import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Flow, Instance, Message, Ticket } from '../models';
import n8nService from '../services/n8n.service';
import typebotService from '../services/typebot.service';
import logger from '../utils';
import { emitMessageCreated, emitTicketCreated, emitTicketUpdated } from '../realtime/events';

type ParsedInbound = {
  instanceName: string;
  fromMe: boolean;
  remoteJid: string;
  phone: string;
  pushName?: string;
  text: string;
  externalMessageId?: string;
};

class WebhookController {
  private isTypebotFlow(flow: Flow): boolean {
    const settings = (flow.settings || {}) as Record<string, unknown>;
    return settings.source === 'typebot' && typeof settings.typebotUrl === 'string' && settings.typebotUrl.trim().length > 0;
  }

  private getTypebotSettings(flow: Flow): { typebotUrl: string; typebotPublicId: string | null } {
    const settings = (flow.settings || {}) as Record<string, unknown>;
    return {
      typebotUrl: String(settings.typebotUrl || '').trim(),
      typebotPublicId: typeof settings.typebotPublicId === 'string' ? settings.typebotPublicId : null,
    };
  }

  private getTicketTypebotSessionId(ticket: Ticket): string | null {
    const metadata = (ticket.metadata || {}) as Record<string, unknown>;
    const typebot = metadata.typebot;
    if (!typebot || typeof typebot !== 'object') {
      return null;
    }

    const sessionId = (typebot as Record<string, unknown>).sessionId;
    return typeof sessionId === 'string' && sessionId.trim().length > 0 ? sessionId : null;
  }

  private parseInboundPayload(body: Record<string, unknown>): ParsedInbound | null {
    const data = (body.data as Record<string, unknown> | undefined) || body;
    const key = (data.key as Record<string, unknown> | undefined) || {};
    const message = (data.message as Record<string, unknown> | undefined) || {};

    const fromMe = Boolean(key.fromMe || data.fromMe);
    const remoteJid = String(key.remoteJid || data.remoteJid || '');

    if (!remoteJid || remoteJid.includes('@g.us')) {
      return null;
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!phone) {
      return null;
    }

    const text = String(
      message.conversation ||
        ((message.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ||
        ((message.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ||
        ((message.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ||
        data.body ||
        ''
    ).trim();

    const instanceName = String(body.instance || body.instanceName || data.instanceName || '');

    return {
      instanceName,
      fromMe,
      remoteJid,
      phone,
      pushName: String(data.pushName || data.pushname || '').trim() || undefined,
      text,
      externalMessageId: String(key.id || data.id || '').trim() || undefined,
    };
  }

  async evolutionInbound(req: Request, res: Response): Promise<void> {
    try {
      const parsed = this.parseInboundPayload((req.body || {}) as Record<string, unknown>);

      if (!parsed || !parsed.instanceName || !parsed.text || parsed.fromMe) {
        res.status(202).json({ received: true, processed: false });
        return;
      }

      const instance = await Instance.findOne({
        where: { evolution_instance: parsed.instanceName },
      });

      if (!instance) {
        logger.warn('Webhook inbound ignorado: instancia nao encontrada', {
          instanceName: parsed.instanceName,
        });
        res.status(202).json({ received: true, processed: false, reason: 'instance_not_found' });
        return;
      }

      const openTicket = await Ticket.findOne({
        where: {
          company_id: instance.company_id,
          instance_id: instance.id,
          contact_phone: parsed.phone,
          status: { [Op.notIn]: ['resolved', 'closed'] },
        },
        order: [['updated_at', 'DESC']],
      });

      const wasNewTicket = !openTicket;
      const ticket =
        openTicket ||
        (await Ticket.create({
          company_id: instance.company_id,
          instance_id: instance.id,
          contact_phone: parsed.phone,
          contact_name: parsed.pushName,
          status: 'open',
          priority: 'medium',
          channel: 'whatsapp',
          last_message_at: new Date(),
        }));

      if (wasNewTicket) {
        emitTicketCreated(ticket);
      }

      await ticket.update({
        contact_name: ticket.contact_name || parsed.pushName,
        last_message_at: new Date(),
      });
      emitTicketUpdated(ticket);

      const message = await Message.create({
        company_id: instance.company_id,
        ticket_id: ticket.id,
        instance_id: instance.id,
        message_id: parsed.externalMessageId,
        direction: 'inbound',
        type: 'text',
        content: parsed.text,
        metadata: {
          remoteJid: parsed.remoteJid,
          rawPayload: req.body,
        },
        status: 'delivered',
        sent_at: new Date(),
      });
      emitMessageCreated(message);

      const flows = await Flow.findAll({
        where: {
          company_id: instance.company_id,
          is_active: true,
          trigger_type: 'webhook',
        },
        order: [['updated_at', 'DESC']],
      });

      const typebotFlow = flows.find((flow) => this.isTypebotFlow(flow));
      const fallbackFlow = flows.find((flow) => !this.isTypebotFlow(flow));

      let typebotDispatched = false;
      let typebotReason: string | null = null;

      if (typebotFlow) {
        const typebotSettings = this.getTypebotSettings(typebotFlow);
        const typebotResult = await typebotService.dispatchInboundMessage({
          typebotUrl: typebotSettings.typebotUrl,
          typebotPublicId: typebotSettings.typebotPublicId,
          message: parsed.text,
          contactPhone: parsed.phone,
          contactName: parsed.pushName,
          companyId: instance.company_id,
          ticketId: ticket.id,
          instanceName: parsed.instanceName,
          sessionId: this.getTicketTypebotSessionId(ticket),
        });

        typebotDispatched = typebotResult.delivered;
        typebotReason = typebotResult.reason || null;

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

      const shouldDispatchN8n = !typebotDispatched;
      const dispatched = shouldDispatchN8n
        ? await n8nService.dispatchInboundMessage({
            flowId: fallbackFlow?.n8n_workflow_id,
            companyId: instance.company_id,
            ticketId: ticket.id,
            messageId: message.id,
            instanceName: parsed.instanceName,
            phone: parsed.phone,
            name: parsed.pushName,
            text: parsed.text,
            metadata: {
              flowId: fallbackFlow?.id,
              flowName: fallbackFlow?.name,
              typebotFlowId: typebotFlow?.id,
              typebotFallbackReason: typebotReason,
            },
          })
        : false;

      res.status(202).json({
        received: true,
        processed: true,
        dispatched,
        typebotDispatched,
        typebotFallbackReason: typebotReason,
        ticketId: ticket.id,
        messageId: message.id,
      });
    } catch (error) {
      logger.error('Falha ao processar webhook inbound da Evolution', error);
      res.status(500).json({ error: 'Erro ao processar webhook inbound' });
    }
  }
}

export default new WebhookController();
import { Flow } from '../../../models';
import typebotService from '../../../services/typebot.service';
import { ChatbotDispatcherStrategy, DispatchContext, DispatchResult } from '../contracts';

export default class TypebotDispatcherStrategy implements ChatbotDispatcherStrategy {
  canHandle(flow: Flow): boolean {
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

  private getTicketTypebotSessionId(context: DispatchContext): string | null {
    const metadata = (context.ticket.metadata || {}) as Record<string, unknown>;
    const typebot = metadata.typebot;

    if (!typebot || typeof typebot !== 'object') {
      return null;
    }

    const sessionId = (typebot as Record<string, unknown>).sessionId;
    return typeof sessionId === 'string' && sessionId.trim().length > 0 ? sessionId : null;
  }

  async dispatch(context: DispatchContext): Promise<DispatchResult> {
    if (!context.flow) {
      return { delivered: false, reason: 'missing_flow' };
    }

    const settings = this.getTypebotSettings(context.flow);
    const typebotResult = await typebotService.dispatchInboundMessage({
      typebotUrl: settings.typebotUrl,
      typebotPublicId: settings.typebotPublicId,
      message: context.parsed.text,
      contactPhone: context.parsed.phone,
      contactName: context.parsed.pushName,
      companyId: context.instance.company_id,
      ticketId: context.ticket.id,
      instanceName: context.parsed.instanceName,
      sessionId: this.getTicketTypebotSessionId(context),
    });

    return {
      delivered: typebotResult.delivered,
      reason: typebotResult.reason || null,
      sessionId: typebotResult.sessionId,
    };
  }
}

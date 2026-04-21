import n8nService from '../../../services/n8n.service';
import { ChatbotDispatcherStrategy, DispatchContext, DispatchResult } from '../contracts';

export default class N8nDispatcherStrategy implements ChatbotDispatcherStrategy {
  canHandle(): boolean {
    return true;
  }

  async dispatch(context: DispatchContext): Promise<DispatchResult> {
    const dispatched = await n8nService.dispatchInboundMessage({
      flowId: context.flow?.n8n_workflow_id,
      companyId: context.instance.company_id,
      ticketId: context.ticket.id,
      messageId: context.messageId,
      instanceName: context.parsed.instanceName,
      phone: context.parsed.phone,
      name: context.parsed.pushName,
      text: context.parsed.text,
      metadata: {
        flowId: context.flow?.id,
        flowName: context.flow?.name,
        typebotFlowId: context.typebotFlowId,
        typebotFallbackReason: context.typebotFallbackReason || null,
      },
    });

    return {
      delivered: dispatched,
      reason: dispatched ? null : 'n8n_dispatch_failed',
    };
  }
}

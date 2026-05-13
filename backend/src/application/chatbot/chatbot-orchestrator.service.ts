import { Flow, Instance, Message, Ticket, TicketAudit } from '../../models';
import { Transaction } from 'sequelize';
import { emitMessageCreated, emitTicketCreated, emitTicketUpdated } from '../../realtime/events';
import logger from '../../utils';
import { ParsedInbound } from './contracts';
import {
  FlowRepository,
  InstanceRepository,
  MessageRepository,
  TicketRepository,
} from './persistence/repositories';
import { UnitOfWork } from './persistence/unit-of-work';
import N8nDispatcherStrategy from './strategies/n8n-dispatcher.strategy';
import TypebotDispatcherStrategy from './strategies/typebot-dispatcher.strategy';
import {
  SequelizeFlowRepository,
  SequelizeInstanceRepository,
  SequelizeMessageRepository,
  SequelizeTicketRepository,
} from '../../infrastructure/persistence/sequelize/sequelize-chatbot.repositories';
import SequelizeUnitOfWork from '../../infrastructure/persistence/sequelize/sequelize-unit-of-work';
import operationalEventService from '../../services/operational-event.service';

export type InboundProcessingResult = {
  received: boolean;
  processed: boolean;
  dispatched?: boolean;
  typebotDispatched?: boolean;
  typebotFallbackReason?: string | null;
  ticketId?: number;
  messageId?: number;
  reason?: string;
};

export default class ChatbotOrchestratorService {
  constructor(
    private readonly instanceRepository: InstanceRepository = new SequelizeInstanceRepository(),
    private readonly ticketRepository: TicketRepository = new SequelizeTicketRepository(),
    private readonly messageRepository: MessageRepository = new SequelizeMessageRepository(),
    private readonly flowRepository: FlowRepository = new SequelizeFlowRepository(),
    private readonly unitOfWork: UnitOfWork = new SequelizeUnitOfWork()
  ) {}

  private readonly typebotStrategy = new TypebotDispatcherStrategy();

  private readonly n8nStrategy = new N8nDispatcherStrategy();

  private async findOrCreateTicket(instance: Instance, parsed: ParsedInbound, tx: Transaction): Promise<{ ticket: Ticket; wasNew: boolean }> {
    const openTicket = await this.ticketRepository.findLatestOpenByContact(
      instance.company_id,
      instance.id,
      parsed.phone,
      tx
    );

    if (openTicket) {
      return { ticket: openTicket, wasNew: false };
    }

    const created = await this.ticketRepository.createInboundTicket(
      {
        companyId: instance.company_id,
        instanceId: instance.id,
        contactPhone: parsed.phone,
        contactName: parsed.pushName,
      },
      tx
    );

    return { ticket: created, wasNew: true };
  }

  private async persistInboundMessage(
    instance: Instance,
    ticket: Ticket,
    parsed: ParsedInbound,
    rawPayload: Record<string, unknown>,
    tx: Transaction
  ): Promise<Message> {
    return this.messageRepository.createInbound(
      {
        companyId: instance.company_id,
        ticketId: ticket.id,
        instanceId: instance.id,
        messageId: parsed.externalMessageId,
        content: parsed.text,
        remoteJid: parsed.remoteJid,
        rawPayload,
      },
      tx
    );
  }

  async processInbound(parsed: ParsedInbound, rawPayload: Record<string, unknown>): Promise<InboundProcessingResult> {
    const instance = await this.instanceRepository.findByEvolutionInstance(parsed.instanceName);

    if (!instance) {
      logger.warn('Webhook inbound ignorado: instancia nao encontrada', {
        instanceName: parsed.instanceName,
      });

      return {
        received: true,
        processed: false,
        reason: 'instance_not_found',
      };
    }

    const persistenceResult = await this.unitOfWork.runInTransaction(async ({ tx }) => {
      const { ticket, wasNew } = await this.findOrCreateTicket(instance, parsed, tx);
      await this.ticketRepository.touchLastMessage(ticket, parsed.pushName, tx);
      const inboundMessage = await this.persistInboundMessage(instance, ticket, parsed, rawPayload, tx);

      if (wasNew) {
        await TicketAudit.create(
          {
            company_id: instance.company_id,
            ticket_id: ticket.id,
            actor_name: parsed.pushName || 'Sistema',
            action: 'created',
            new_value: ticket.status,
            metadata: {
              source: 'inbound',
              contactPhone: parsed.phone,
              messageId: inboundMessage.id,
            },
          },
          { transaction: tx }
        );
      }

      return {
        ticket,
        wasNew,
        inboundMessage,
      };
    });

    if (persistenceResult.wasNew) {
      emitTicketCreated(persistenceResult.ticket);
    }
    emitTicketUpdated(persistenceResult.ticket);
    emitMessageCreated(persistenceResult.inboundMessage);

    await operationalEventService.record({
      companyId: instance.company_id,
      ticketId: persistenceResult.ticket.id,
      messageId: persistenceResult.inboundMessage.id,
      eventType: 'message_saved',
      status: 'success',
      source: 'chatbot-orchestrator',
      detail: 'Mensagem inbound salva',
      metadata: {
        externalMessageId: parsed.externalMessageId,
        wasNewTicket: persistenceResult.wasNew,
      },
    });

    const flows: Flow[] = await this.flowRepository.listActiveWebhookFlows(instance.company_id);

    const typebotFlow = flows.find((flow) => this.typebotStrategy.canHandle(flow));
    const fallbackFlow = flows.find((flow) => !this.typebotStrategy.canHandle(flow));

    let typebotDispatched = false;
    let typebotFallbackReason: string | null = null;

    if (typebotFlow) {
      const typebotResult = await this.typebotStrategy.dispatch({
        flow: typebotFlow,
        instance,
        ticket: persistenceResult.ticket,
        parsed,
        rawPayload,
        messageId: persistenceResult.inboundMessage.id,
      });

      typebotDispatched = typebotResult.delivered;
      typebotFallbackReason = typebotResult.reason || null;

      const sessionId = typebotResult.sessionId;
      if (typeof sessionId === 'string' && sessionId.trim().length > 0) {
        await this.unitOfWork.runInTransaction(async ({ tx }) => {
          await this.ticketRepository.updateTypebotSession(
            persistenceResult.ticket,
            typebotFlow.id,
            sessionId,
            tx
          );
        });
        emitTicketUpdated(persistenceResult.ticket);
      }
    }

    const shouldFallbackToN8n = !typebotDispatched;
    const n8nResult = shouldFallbackToN8n
      ? await this.n8nStrategy.dispatch({
          flow: fallbackFlow,
          typebotFlowId: typebotFlow?.id,
          instance,
          ticket: persistenceResult.ticket,
          parsed,
          rawPayload,
          messageId: persistenceResult.inboundMessage.id,
          typebotFallbackReason,
        })
      : { delivered: false };

    return {
      received: true,
      processed: true,
      dispatched: n8nResult.delivered,
      typebotDispatched,
      typebotFallbackReason,
      ticketId: persistenceResult.ticket.id,
      messageId: persistenceResult.inboundMessage.id,
    };
  }
}

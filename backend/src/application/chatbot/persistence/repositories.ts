import { Transaction } from 'sequelize';
import { Flow, Instance, Message, Ticket } from '../../../models';

export interface ListMessagesOptions {
  limit: number;
  offset: number;
}

export interface CreateInboundMessageInput {
  companyId: number;
  ticketId: number;
  instanceId: number;
  messageId?: string;
  content: string;
  remoteJid: string;
  rawPayload: Record<string, unknown>;
}

export interface CreateOutboundMessageInput {
  companyId: number;
  ticketId: number;
  instanceId: number;
  messageId?: string;
  content: string;
  operatorName: string;
  originalText: string;
  status: 'sent' | 'failed';
  sentAt: Date;
}

export interface InstanceRepository {
  findByEvolutionInstance(instanceName: string): Promise<Instance | null>;
  findByIdAndCompany(instanceId: number, companyId: number): Promise<Instance | null>;
}

export interface TicketRepository {
  findByIdAndCompany(ticketId: number, companyId: number): Promise<Ticket | null>;
  findLatestOpenByContact(companyId: number, instanceId: number, contactPhone: string, transaction?: Transaction): Promise<Ticket | null>;
  createInboundTicket(input: {
    companyId: number;
    instanceId: number;
    contactPhone: string;
    contactName?: string;
  }, transaction?: Transaction): Promise<Ticket>;
  touchLastMessage(ticket: Ticket, contactName?: string, transaction?: Transaction): Promise<Ticket>;
  updateTypebotSession(ticket: Ticket, flowId: number, sessionId: string, transaction?: Transaction): Promise<Ticket>;
}

export interface MessageRepository {
  listByTicket(companyId: number, ticketId: number, options: ListMessagesOptions): Promise<Message[]>;
  createInbound(input: CreateInboundMessageInput, transaction?: Transaction): Promise<Message>;
  createOutbound(input: CreateOutboundMessageInput, transaction?: Transaction): Promise<Message>;
}

export interface FlowRepository {
  listActiveWebhookFlows(companyId: number): Promise<Flow[]>;
}

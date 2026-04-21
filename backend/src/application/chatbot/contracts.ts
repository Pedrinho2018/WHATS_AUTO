import { Flow, Instance, Ticket } from '../../models';

export type ParsedInbound = {
  instanceName: string;
  fromMe: boolean;
  remoteJid: string;
  phone: string;
  pushName?: string;
  text: string;
  externalMessageId?: string;
};

export type DispatchResult = {
  delivered: boolean;
  reason?: string | null;
  sessionId?: string | null;
};

export type DispatchContext = {
  flow?: Flow;
  typebotFlowId?: number;
  instance: Instance;
  ticket: Ticket;
  parsed: ParsedInbound;
  rawPayload: Record<string, unknown>;
  messageId: number;
  typebotFallbackReason?: string | null;
};

export interface ChatbotDispatcherStrategy {
  canHandle(flow: Flow): boolean;
  dispatch(context: DispatchContext): Promise<DispatchResult>;
}

export type ServerToClientEvents = {
  'server:welcome': (payload: { message: string; timestamp: string }) => void;
  'server:pong': (payload: { timestamp: string }) => void;
  'server:ticket.created': (payload: { ticket: Record<string, unknown>; timestamp: string }) => void;
  'server:ticket.updated': (payload: { ticket: Record<string, unknown>; timestamp: string }) => void;
  'server:message.created': (payload: { message: Record<string, unknown>; timestamp: string }) => void;
};

export type ClientToServerEvents = {
  'client:ping': () => void;
  'client:join-ticket': (payload: { ticketId: number }) => void;
};

export type InterServerEvents = {
  'server:broadcast': (payload: { event: string; timestamp: string }) => void;
};

export type SocketData = {
  connectedAt: string;
  userId: number;
  companyId: number;
  role: string;
};

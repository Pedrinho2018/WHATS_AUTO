import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import logger from '../utils';
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types';
import { authenticateSocketToken } from './auth';

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:18081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:18081',
];

const resolveAllowedOrigins = (): string[] => {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;
};

const extractSocketToken = (socket: {
  handshake: {
    auth?: { token?: unknown };
    headers?: { authorization?: unknown };
  };
}): string | null => {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const rawHeader = socket.handshake.headers?.authorization;
  if (typeof rawHeader !== 'string' || !rawHeader.trim()) {
    return null;
  }

  if (rawHeader.toLowerCase().startsWith('bearer ')) {
    return rawHeader.slice(7).trim();
  }

  return rawHeader.trim();
};

export const initSocketServer = (
  httpServer: HttpServer
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: resolveAllowedOrigins(),
      credentials: true,
    },
    path: process.env.SOCKET_IO_PATH || '/socket.io',
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        next(new Error('Autenticacao obrigatoria'));
        return;
      }

      const auth = await authenticateSocketToken(token);

      socket.data.userId = auth.userId;
      socket.data.companyId = auth.companyId;
      socket.data.role = auth.role;

      next();
    } catch (error) {
      logger.warn('Handshake Socket.IO rejeitado', {
        reason: error instanceof Error ? error.message : 'nao autorizado',
      });
      next(new Error('Nao autorizado'));
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.data.connectedAt = new Date().toISOString();
    socket.join(`company:${socket.data.companyId}`);
    socket.join(`user:${socket.data.userId}`);

    logger.info('Socket conectado', {
      socketId: socket.id,
      connectedAt: socket.data.connectedAt,
      userId: socket.data.userId,
      companyId: socket.data.companyId,
    });

    socket.emit('server:welcome', {
      message: 'Conexao Socket.IO estabelecida com sucesso',
      timestamp: new Date().toISOString(),
    });

    socket.on('client:ping', () => {
      socket.emit('server:pong', {
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('client:join-ticket', ({ ticketId }) => {
      if (!Number.isFinite(ticketId) || ticketId <= 0) {
        return;
      }

      socket.join(`ticket:${ticketId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket desconectado', {
        socketId: socket.id,
        reason,
        userId: socket.data.userId,
        companyId: socket.data.companyId,
      });
    });
  });

  logger.info('Socket.IO inicializado', {
    path: process.env.SOCKET_IO_PATH || '/socket.io',
  });

  return ioInstance;
};

export const getSocketServer = (): Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> => {
  if (!ioInstance) {
    throw new Error('Socket.IO ainda nao foi inicializado. Chame initSocketServer antes.');
  }

  return ioInstance;
};

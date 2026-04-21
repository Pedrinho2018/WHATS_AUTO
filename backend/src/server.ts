import app from './app';
import http from 'http';
import bootstrapService from './services/bootstrap.service';
import logger from './utils';
import { initSocketServer } from './realtime/socket';

const port = process.env.PORT || 3001;

const server = http.createServer(app);
server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30_000);
server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 15_000);
server.keepAliveTimeout = Number(process.env.HTTP_KEEPALIVE_TIMEOUT_MS || 5_000);
server.maxRequestsPerSocket = Number(process.env.HTTP_MAX_REQUESTS_PER_SOCKET || 1_000);
initSocketServer(server);

const ensureSecurityEnv = (): void => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET deve estar configurado com no minimo 32 caracteres');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    throw new Error('ALLOWED_ORIGINS deve ser configurado em producao');
  }
};

const startServer = async (): Promise<void> => {
  try {
    ensureSecurityEnv();
    const bootstrap = await bootstrapService.run();

    server.listen(port, () => {
      logger.info('Servidor iniciado', { port });
      logger.info('Bootstrap concluido', bootstrap);
    });
  } catch (error) {
    logger.error('Falha ao iniciar servidor', error);
    process.exit(1);
  }
};

void startServer();

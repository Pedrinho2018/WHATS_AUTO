import app from './app';
import http from 'http';
import dotenv from 'dotenv';
import bootstrapService from './services/bootstrap.service';
import logger from './utils';
import { initSocketServer } from './realtime/socket';

dotenv.config();

const port = process.env.PORT || 3001;

const server = http.createServer(app);
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

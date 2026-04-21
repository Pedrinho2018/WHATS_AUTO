import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { randomUUID } from 'crypto';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import openApiSpec from './docs/openapi';
import logger from './utils';

const defaultAllowedOrigins = [
	'http://localhost:5173',
	'http://localhost:18081',
	'http://127.0.0.1:5173',
	'http://127.0.0.1:18081',
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const docsEnabled = process.env.ENABLE_API_DOCS === 'true' || process.env.NODE_ENV !== 'production';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
	cors({
		origin(origin, callback) {
			if (!origin) {
				callback(null, true);
				return;
			}

			const isAllowed = allowedOrigins.length > 0
				? allowedOrigins.includes(origin)
				: defaultAllowedOrigins.includes(origin);

			if (isAllowed) {
				callback(null, true);
				return;
			}

			callback(new Error(`CORS bloqueado para a origem ${origin}`));
		},
		credentials: true,
	})
);
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: 'cross-origin' },
	})
);
app.use(compression());
app.use((req, res, next) => {
	const requestId = (req.headers['x-request-id'] as string | undefined) || randomUUID();
	res.setHeader('x-request-id', requestId);
	req.headers['x-request-id'] = requestId;
	next();
});

morgan.token('request-id', (req) => (req.headers['x-request-id'] as string | undefined) || '-');

app.use(
	morgan(':method :url :status :res[content-length] - :response-time ms request_id=:request-id', {
		skip: (req) => req.path === '/api/health',
		stream: {
			write: (message: string) => {
				logger.info(message.trim());
			},
		},
	})
);
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

if (docsEnabled) {
	app.get('/api/docs.json', (_req, res) => {
		return res.json(openApiSpec);
	});

	app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

app.use('/api', routes);

export default app;

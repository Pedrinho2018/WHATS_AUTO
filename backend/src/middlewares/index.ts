import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import { User, Company } from '../models';
import logger from '../utils';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type AuthCacheEntry = {
  user: User;
  company?: Company;
  expiresAt: number;
};

const authCache = new Map<string, AuthCacheEntry>();
const authCacheTtlMs = Number(process.env.AUTH_CACHE_TTL_MS || 30_000);

const getAuthCacheKey = (userId: number, companyId: number): string => `${userId}:${companyId}`;

const setAuthCache = (key: string, user: User): void => {
  authCache.set(key, {
    user,
    company: user.company,
    expiresAt: Date.now() + authCacheTtlMs,
  });
};

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

const createInMemoryRateLimit = ({
  windowMs,
  max,
  message,
  keyGenerator,
}: RateLimitOptions) => {
  const hits = new Map<string, RateLimitEntry>();
  const intervalMs = 60 * 1000;
  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, intervalMs);

  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator?.(req) || req.ip || req.socket.remoteAddress || 'anonymous';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - entry.count, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: message,
      });
      return;
    }

    entry.count += 1;
    hits.set(key, entry);
    next();
  };
};

export const authRateLimit = createInMemoryRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas. Tente novamente em alguns minutos.',
});

export const webhookRateLimit = createInMemoryRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Muitas requisicoes de webhook. Tente novamente em alguns segundos.',
});

export const sensitiveActionRateLimit = createInMemoryRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas acoes sensiveis. Aguarde alguns segundos antes de tentar novamente.',
  keyGenerator: (req) => {
    const user = (req as Request & { user?: { id?: number; company_id?: number } }).user;
    return user?.id && user?.company_id
      ? `${user.company_id}:${user.id}`
      : req.ip || req.socket.remoteAddress || 'anonymous';
  },
});

const secureCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const extractBearerOrRawToken = (value: string): string => {
  if (value.toLowerCase().startsWith('bearer ')) {
    return value.slice(7).trim();
  }

  return value.trim();
};

const readSingleHeader = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
};

export const webhookAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const configuredSecret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY;

  if (!configuredSecret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('Webhook inbound sem segredo configurado (EVOLUTION_WEBHOOK_SECRET/EVOLUTION_API_KEY)');
      res.status(500).json({ error: 'Configuracao de webhook ausente' });
      return;
    }

    next();
    return;
  }

  const providedRaw =
    readSingleHeader(req.headers['x-webhook-secret']) ||
    readSingleHeader(req.headers['x-evolution-api-key']) ||
    readSingleHeader(req.headers['x-api-key']) ||
    readSingleHeader(req.headers.apikey) ||
    readSingleHeader(req.headers.authorization);

  if (!providedRaw) {
    res.status(401).json({ error: 'Webhook sem autenticacao' });
    return;
  }

  const providedSecret = extractBearerOrRawToken(providedRaw);

  if (!secureCompare(configuredSecret, providedSecret)) {
    res.status(401).json({ error: 'Webhook nao autorizado' });
    return;
  }

  next();
};

// ═══════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════

export interface AuthRequest extends Request {
  user?: User;
  company?: Company;
}

interface JwtPayload {
  userId: number;
  companyId: number;
}

// ═══════════════════════════════════════════════════════════════
// Middleware de Autenticação
// ═══════════════════════════════════════════════════════════════

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      logger.error('JWT_SECRET nao configurado');
      res.status(500).json({ error: 'Configuracao de autenticacao ausente' });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const cacheKey = getAuthCacheKey(decoded.userId, decoded.companyId);
    const cached = authCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      req.company = cached.company;
      next();
      return;
    }

    if (cached) {
      authCache.delete(cacheKey);
    }

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Company, as: 'company' }],
    });

    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      return;
    }

    if (user.company_id !== decoded.companyId) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    setAuthCache(cacheKey, user);
    req.user = user;
    req.company = user.company;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ═══════════════════════════════════════════════════════════════
// Middleware de Autorização por Role
// ═══════════════════════════════════════════════════════════════

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    next();
  };
};

// ═══════════════════════════════════════════════════════════════
// Middleware de Tratamento de Erros
// ═══════════════════════════════════════════════════════════════

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Erro nao tratado', error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

export default {
  authRateLimit,
  webhookRateLimit,
  sensitiveActionRateLimit,
  webhookAuthMiddleware,
  authMiddleware,
  roleMiddleware,
  errorHandler,
};

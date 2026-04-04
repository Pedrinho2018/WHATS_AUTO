import jwt from 'jsonwebtoken';
import { User } from '../models';

interface JwtPayload {
  userId: number;
  companyId: number;
}

export interface RealtimeAuthContext {
  userId: number;
  companyId: number;
  role: string;
}

export const authenticateSocketToken = async (token: string): Promise<RealtimeAuthContext> => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET nao configurado');
  }

  const decoded = jwt.verify(token, secret) as JwtPayload;

  const user = await User.findByPk(decoded.userId);

  if (!user || !user.is_active) {
    throw new Error('Usuario nao encontrado ou inativo');
  }

  if (user.company_id !== decoded.companyId) {
    throw new Error('Token invalido para a empresa informada');
  }

  return {
    userId: user.id,
    companyId: user.company_id,
    role: user.role,
  };
};

import { Response } from 'express';
import DomainError from '../errors/domain.error';

export const sendControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string,
  fallbackStatusCode = 500
): void => {
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(fallbackStatusCode).json({ error: message });
};

export default sendControllerError;

import { Request, Response } from 'express';
import messagesController from '../../../controllers';
import messagesService from '../../../services';
import { AuthRequest } from '../../../middlewares';

jest.mock('../../../services', () => ({
  __esModule: true,
  default: {
    messages: {
      send: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const response = {} as MockResponse;
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const createMockAuthRequest = (overrides?: Partial<AuthRequest>): AuthRequest =>
  ({
    tenantId: 'tenant-1',
    userId: 'user-1',
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as AuthRequest);

describe('MessagesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('deve enviar mensagem com sucesso', async () => {
      const req = createMockAuthRequest({
        body: {
          contactId: 'contact-1',
          text: 'Olá, tudo bem?',
          type: 'text',
        },
      });
      const res = createMockResponse();

      const message = {
        id: 'msg-1',
        contactId: 'contact-1',
        text: 'Olá, tudo bem?',
        type: 'text',
        status: 'sent',
        createdAt: new Date(),
      };

      (messagesService.messages?.send as jest.Mock).mockResolvedValue(message);

      await messagesController.messages.send(req as any, res);

      expect(messagesService.messages?.send).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        contactId: 'contact-1',
        text: 'Olá, tudo bem?',
        type: 'text',
      });
      expect(res.json).toHaveBeenCalledWith(message);
    });

    it('deve retornar 400 quando contactId está ausente', async () => {
      const req = createMockAuthRequest({
        body: { text: 'Mensagem sem contato' },
      });
      const res = createMockResponse();

      await messagesController.messages.send(req as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(messagesService.messages?.send).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando text está vazio', async () => {
      const req = createMockAuthRequest({
        body: { contactId: 'contact-1', text: '' },
      });
      const res = createMockResponse();

      await messagesController.messages.send(req as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getHistory', () => {
    it('deve retornar histórico de mensagens', async () => {
      const req = createMockAuthRequest({
        params: { contactId: 'contact-1' },
        query: { limit: '50', offset: '0' },
      });
      const res = createMockResponse();

      const messages = [
        { id: 'msg-1', text: 'Olá', status: 'delivered', createdAt: new Date() },
        { id: 'msg-2', text: 'Tudo certo?', status: 'read', createdAt: new Date() },
      ];

      (messagesService.messages?.getHistory as jest.Mock).mockResolvedValue(messages);

      await messagesController.messages.getHistory(req as any, res);

      expect(messagesService.messages?.getHistory).toHaveBeenCalledWith('contact-1', {
        limit: 50,
        offset: 0,
      });
      expect(res.json).toHaveBeenCalledWith(messages);
    });

    it('deve usar valores padrão para limit e offset', async () => {
      const req = createMockAuthRequest({
        params: { contactId: 'contact-1' },
        query: {},
      });
      const res = createMockResponse();

      (messagesService.messages?.getHistory as jest.Mock).mockResolvedValue([]);

      await messagesController.messages.getHistory(req as any, res);

      expect(messagesService.messages?.getHistory).toHaveBeenCalledWith('contact-1', {
        limit: 100,
        offset: 0,
      });
    });
  });

  describe('markAsRead', () => {
    it('deve marcar mensagem como lida', async () => {
      const req = createMockAuthRequest({
        params: { id: 'msg-1' },
      });
      const res = createMockResponse();

      const message = { id: 'msg-1', status: 'read', updatedAt: new Date() };

      (messagesService.messages?.markAsRead as jest.Mock).mockResolvedValue(message);

      await messagesController.messages.markAsRead(req as any, res);

      expect(messagesService.messages?.markAsRead).toHaveBeenCalledWith('msg-1');
      expect(res.json).toHaveBeenCalledWith(message);
    });
  });

  describe('delete', () => {
    it('deve deletar mensagem', async () => {
      const req = createMockAuthRequest({
        params: { id: 'msg-1' },
      });
      const res = createMockResponse();

      (messagesService.messages?.delete as jest.Mock).mockResolvedValue({ success: true });

      await messagesController.messages.delete(req as any, res);

      expect(messagesService.messages?.delete).toHaveBeenCalledWith('msg-1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('deve retornar 404 quando mensagem não existe', async () => {
      const req = createMockAuthRequest({
        params: { id: 'inexistente' },
      });
      const res = createMockResponse();

      (messagesService.messages?.delete as jest.Mock).mockRejectedValue(
        new Error('Mensagem não encontrada')
      );

      await messagesController.messages.delete(req as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

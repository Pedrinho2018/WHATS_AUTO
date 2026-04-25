import { Request, Response } from 'express';
import botConfigController from '../../../controllers';
import botConfigService from '../../../services';
import { AuthRequest } from '../../../middlewares';

jest.mock('../../../services', () => ({
  __esModule: true,
  default: {
    botConfig: {
      create: jest.fn(),
      update: jest.fn(),
      getById: jest.fn(),
      listByCompany: jest.fn(),
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
    ...overrides,
  } as AuthRequest);

describe('BotConfigController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar nova configuração de bot com sucesso', async () => {
      const req = createMockAuthRequest({
        body: {
          name: 'Bot Principal',
          description: 'Bot para atendimento',
          isActive: true,
        },
      });
      const res = createMockResponse();

      const botConfig = {
        id: 'bot-1',
        tenantId: 'tenant-1',
        name: 'Bot Principal',
        description: 'Bot para atendimento',
        isActive: true,
        createdAt: new Date(),
      };

      (botConfigService.botConfig?.create as jest.Mock).mockResolvedValue(botConfig);

      await botConfigController.botConfig.create(req as any, res);

      expect(botConfigService.botConfig?.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        name: 'Bot Principal',
        description: 'Bot para atendimento',
        isActive: true,
      });
      expect(res.json).toHaveBeenCalledWith(botConfig);
    });

    it('deve retornar 400 quando nome está vazio', async () => {
      const req = createMockAuthRequest({
        body: { description: 'Bot sem nome' },
      });
      const res = createMockResponse();

      await botConfigController.botConfig.create(req as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(botConfigService.botConfig?.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar configuração de bot existente', async () => {
      const req = createMockAuthRequest({
        params: { id: 'bot-1' },
        body: { name: 'Bot Atualizado', isActive: false },
      });
      const res = createMockResponse();

      const updatedBot = {
        id: 'bot-1',
        name: 'Bot Atualizado',
        isActive: false,
        updatedAt: new Date(),
      };

      (botConfigService.botConfig?.update as jest.Mock).mockResolvedValue(updatedBot);

      await botConfigController.botConfig.update(req as any, res);

      expect(botConfigService.botConfig?.update).toHaveBeenCalledWith('bot-1', {
        name: 'Bot Atualizado',
        isActive: false,
      });
      expect(res.json).toHaveBeenCalledWith(updatedBot);
    });
  });

  describe('getById', () => {
    it('deve retornar configuração de bot por ID', async () => {
      const req = createMockAuthRequest({ params: { id: 'bot-1' } });
      const res = createMockResponse();

      const botConfig = { id: 'bot-1', name: 'Bot Principal', isActive: true };

      (botConfigService.botConfig?.getById as jest.Mock).mockResolvedValue(botConfig);

      await botConfigController.botConfig.getById(req as any, res);

      expect(botConfigService.botConfig?.getById).toHaveBeenCalledWith('bot-1');
      expect(res.json).toHaveBeenCalledWith(botConfig);
    });

    it('deve retornar 404 quando bot não existe', async () => {
      const req = createMockAuthRequest({ params: { id: 'inexistente' } });
      const res = createMockResponse();

      (botConfigService.botConfig?.getById as jest.Mock).mockResolvedValue(null);

      await botConfigController.botConfig.getById(req as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listByCompany', () => {
    it('deve listar todas as configurações de bot da empresa', async () => {
      const req = createMockAuthRequest();
      const res = createMockResponse();

      const bots = [
        { id: 'bot-1', name: 'Bot 1', isActive: true },
        { id: 'bot-2', name: 'Bot 2', isActive: false },
      ];

      (botConfigService.botConfig?.listByCompany as jest.Mock).mockResolvedValue(bots);

      await botConfigController.botConfig.listByCompany(req as any, res);

      expect(botConfigService.botConfig?.listByCompany).toHaveBeenCalledWith('tenant-1');
      expect(res.json).toHaveBeenCalledWith(bots);
    });
  });

  describe('delete', () => {
    it('deve deletar configuração de bot', async () => {
      const req = createMockAuthRequest({ params: { id: 'bot-1' } });
      const res = createMockResponse();

      (botConfigService.botConfig?.delete as jest.Mock).mockResolvedValue({ success: true });

      await botConfigController.botConfig.delete(req as any, res);

      expect(botConfigService.botConfig?.delete).toHaveBeenCalledWith('bot-1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});

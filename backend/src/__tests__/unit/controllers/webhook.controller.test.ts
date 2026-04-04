import { Request, Response } from 'express';
import webhookController from '../../../controllers/webhook.controller';
import { Flow, Instance, Message, Ticket } from '../../../models';
import n8nService from '../../../services/n8n.service';
import typebotService from '../../../services/typebot.service';

jest.mock('../../../models', () => ({
  __esModule: true,
  Flow: {
    findAll: jest.fn(),
  },
  Instance: {
    findOne: jest.fn(),
  },
  Message: {
    create: jest.fn(),
  },
  Ticket: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../../services/n8n.service', () => ({
  __esModule: true,
  default: {
    dispatchInboundMessage: jest.fn(),
  },
}));

jest.mock('../../../services/typebot.service', () => ({
  __esModule: true,
  default: {
    dispatchInboundMessage: jest.fn(),
  },
}));

jest.mock('../../../realtime/events', () => ({
  __esModule: true,
  emitMessageCreated: jest.fn(),
  emitTicketCreated: jest.fn(),
  emitTicketUpdated: jest.fn(),
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

const makeInboundRequest = (): Request => {
  return {
    body: {
      instanceName: 'empresa-principal',
      data: {
        key: {
          remoteJid: '5566999999999@s.whatsapp.net',
          fromMe: false,
          id: 'msg-id',
        },
        message: {
          conversation: 'Oi bot',
        },
      },
    },
  } as Request;
};

describe('WebhookController - Typebot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve despachar para Typebot automaticamente quando houver fluxo typebot ativo', async () => {
    const req = makeInboundRequest();
    const res = createMockResponse();

    const ticket = {
      id: 10,
      company_id: 1,
      instance_id: 2,
      metadata: {},
      contact_name: 'Cliente',
      update: jest.fn().mockResolvedValue(undefined),
    };

    (Instance.findOne as jest.Mock).mockResolvedValue({ id: 2, company_id: 1, evolution_instance: 'empresa-principal' });
    (Ticket.findOne as jest.Mock).mockResolvedValue(ticket);
    (Message.create as jest.Mock).mockResolvedValue({ id: 20, ticket_id: 10, company_id: 1 });
    (Flow.findAll as jest.Mock).mockResolvedValue([
      {
        id: 99,
        name: 'Fluxo Typebot',
        settings: {
          source: 'typebot',
          typebotUrl: 'http://localhost:8080/meu-bot',
          typebotPublicId: 'meu-bot',
        },
      },
    ]);

    (typebotService.dispatchInboundMessage as jest.Mock).mockResolvedValue({
      delivered: true,
      sessionId: 'session-1',
    });

    await webhookController.evolutionInbound(req, res);

    expect(typebotService.dispatchInboundMessage).toHaveBeenCalledTimes(1);
    expect(n8nService.dispatchInboundMessage).not.toHaveBeenCalled();
    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          typebot: expect.objectContaining({
            sessionId: 'session-1',
          }),
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ typebotDispatched: true }));
  });

  it('deve usar fallback n8n quando o dispatch no Typebot falhar', async () => {
    const req = makeInboundRequest();
    const res = createMockResponse();

    const ticket = {
      id: 11,
      company_id: 1,
      instance_id: 2,
      metadata: {},
      contact_name: 'Cliente',
      update: jest.fn().mockResolvedValue(undefined),
    };

    (Instance.findOne as jest.Mock).mockResolvedValue({ id: 2, company_id: 1, evolution_instance: 'empresa-principal' });
    (Ticket.findOne as jest.Mock).mockResolvedValue(ticket);
    (Message.create as jest.Mock).mockResolvedValue({ id: 21, ticket_id: 11, company_id: 1 });
    (Flow.findAll as jest.Mock).mockResolvedValue([
      {
        id: 100,
        name: 'Typebot Principal',
        settings: {
          source: 'typebot',
          typebotUrl: 'https://typebot.meu-dominio.local/bot-a',
          typebotPublicId: 'bot-a',
        },
      },
      {
        id: 101,
        name: 'Fallback n8n',
        n8n_workflow_id: 'n8n-flow-101',
        settings: {
          source: 'internal',
        },
      },
    ]);

    (typebotService.dispatchInboundMessage as jest.Mock).mockResolvedValue({
      delivered: false,
      reason: 'typebot_http_500',
    });
    (n8nService.dispatchInboundMessage as jest.Mock).mockResolvedValue(true);

    await webhookController.evolutionInbound(req, res);

    expect(typebotService.dispatchInboundMessage).toHaveBeenCalledTimes(1);
    expect(n8nService.dispatchInboundMessage).toHaveBeenCalledTimes(1);
    expect(n8nService.dispatchInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'n8n-flow-101',
        metadata: expect.objectContaining({
          typebotFallbackReason: 'typebot_http_500',
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      dispatched: true,
      typebotDispatched: false,
    }));
  });
});
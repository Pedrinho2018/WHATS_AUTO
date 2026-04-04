import { ManagementService } from '../../../services/management.service';
import { Flow } from '../../../models';

jest.mock('../../../models', () => ({
  __esModule: true,
  Flow: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
  FlowWorkspace: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
  Instance: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
  Ticket: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  User: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}));

describe('ManagementService - Typebot self-host', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve permitir URL local/dominio proprio para fluxo com origem typebot', async () => {
    const service = new ManagementService();
    const createdFlow = { id: 1, is_active: true };

    (Flow.create as jest.Mock).mockResolvedValue(createdFlow);

    await service.createFlow(1, {
      name: 'Fluxo Local',
      source: 'typebot',
      typebot_url: 'http://localhost:8080/meu-typebot',
      trigger_type: 'webhook',
    });

    expect(Flow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          source: 'typebot',
          typebotUrl: 'http://localhost:8080/meu-typebot',
          typebotPublicId: 'meu-typebot',
        }),
      })
    );
  });
});
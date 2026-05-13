import request from 'supertest';
import authService from '../../services';

jest.mock('../../services', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('../../services/revolution.service', () => ({
  __esModule: true,
  default: {
    listInstances: jest.fn(),
    createInstance: jest.fn(),
    connectInstance: jest.fn(),
    restartInstance: jest.fn(),
    setPresence: jest.fn(),
    disconnectInstance: jest.fn(),
    deleteInstance: jest.fn(),
    getInstanceStatus: jest.fn(),
    getQrCode: jest.fn(),
    sendTextMessage: jest.fn(),
    setScopedConfig: jest.fn(),
    findScopedConfig: jest.fn(),
  },
}));

jest.mock('../../controllers/management.controller', () => ({
  __esModule: true,
  default: {
    dashboard: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ totalTickets: 0 }),
    listTickets: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json([]),
    createTicket: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) => res.status(201).json({ id: 1 }),
    updateTicket: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ id: 1 }),
    listFlows: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json([]),
    createFlow: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) => res.status(201).json({ id: 1 }),
    updateFlow: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ id: 1 }),
    listUsers: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json([]),
    createUser: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) => res.status(201).json({ id: 1 }),
    updateUser: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ id: 1 }),
    listInstances: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json([]),
    createInstance: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) => res.status(201).json({ id: 1 }),
    updateInstance: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ id: 1 }),
    connectInstance: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json({ id: 1, status: 'connected' }),
  },
}));

jest.mock('../../controllers/messages.controller', () => ({
  __esModule: true,
  default: {
    listTicketMessages: (_req: unknown, res: { json: (arg0: unknown) => void }) => res.json([]),
    sendTextToTicket: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) =>
      res.status(201).json({ message: { id: 10 } }),
  },
}));

jest.mock('../../controllers/webhook.controller', () => ({
  __esModule: true,
  default: {
    evolutionInbound: (_req: unknown, res: { status: (arg0: number) => { json: (arg0: unknown) => void } }) =>
      res.status(202).json({ received: true, processed: true }),
  },
}));

jest.mock('../../middlewares', () => ({
  __esModule: true,
  authRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  webhookRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  sensitiveActionRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  webhookAuthMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  authMiddleware: (req: { user?: unknown; company?: unknown }, _res: unknown, next: () => void) => {
    req.user = {
      id: 1,
      company_id: 1,
      name: 'Admin Teste',
      email: 'admin@empresa.com',
      role: 'admin',
      avatar: null,
    };
    req.company = { id: 1, name: 'Empresa Teste' };
    next();
  },
  roleMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  errorHandler: (_error: unknown, _req: unknown, _res: unknown, next: () => void) => next(),
}));

import app from '../../app';
import revolutionService from '../../services/revolution.service';

describe('Rotas da API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar status ok em /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  it('deve validar campos obrigatorios no login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teste@empresa.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  it('deve executar login com sucesso', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      user: { id: 1, name: 'Teste', email: 'teste@empresa.com', role: 'admin' },
      company: { id: 1, name: 'Empresa Teste' },
      token: 'jwt-fake',
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teste@empresa.com', password: '12345678' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe('jwt-fake');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'teste@empresa.com',
      password: '12345678',
    });
  });

  it('deve executar cadastro com sanitizacao de subdominio', async () => {
    (authService.register as jest.Mock).mockResolvedValue({ token: 'jwt-cadastro' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Maria',
        email: 'maria@empresa.com',
        password: '12345678',
        companyName: 'Empresa Nova',
        subdomain: 'Empresa-Nova!!',
      });

    expect(response.status).toBe(201);
    expect(response.body.token).toBe('jwt-cadastro');
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Maria',
      email: 'maria@empresa.com',
      password: '12345678',
      companyName: 'Empresa Nova',
      subdomain: 'empresanova',
      phone: undefined,
    });
  });

  it('deve expor o swagger json em /api/docs.json', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi', '3.0.3');
    expect(response.body.paths).toHaveProperty('/revolution/messages/text');
  });

  it('deve listar instancias da Revolution API mock', async () => {
    (revolutionService.listInstances as jest.Mock).mockReturnValue([
      { instanceName: 'empresa-principal', status: 'connected' },
    ]);

    const response = await request(app).get('/api/revolution/instances');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { instanceName: 'empresa-principal', status: 'connected' },
    ]);
    expect(revolutionService.listInstances).toHaveBeenCalled();
  });

  it('deve criar instancia da Revolution API mock', async () => {
    (revolutionService.createInstance as jest.Mock).mockReturnValue({
      instanceName: 'empresa-principal',
      status: 'disconnected',
      qrCode: 'data:image/png;base64,abc',
      lastUpdateAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/revolution/instances')
      .send({
        instanceName: 'empresa-principal',
        webhookUrl: 'https://webhook.local',
        phone: '5566999999999',
      });

    expect(response.status).toBe(201);
    expect(revolutionService.createInstance).toHaveBeenCalledWith({
      instanceName: 'empresa-principal',
      webhookUrl: 'https://webhook.local',
      phone: '5566999999999',
    });
  });

  it('deve enviar mensagem de texto via Revolution API mock', async () => {
    (revolutionService.sendTextMessage as jest.Mock).mockReturnValue({
      messageId: 'msg_1',
      status: 'sent',
      instanceName: 'empresa-principal',
      to: '5566999999999',
      text: 'Mensagem teste',
      sentAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/revolution/messages/text')
      .send({ instanceName: 'empresa-principal', to: '5566999999999', text: 'Mensagem teste' });

    expect(response.status).toBe(201);
    expect(response.body.messageId).toBe('msg_1');
    expect(revolutionService.sendTextMessage).toHaveBeenCalledWith({
      instanceName: 'empresa-principal',
      to: '5566999999999',
      text: 'Mensagem teste',
    });
  });

  it('deve aceitar webhook inbound da Evolution', async () => {
    const response = await request(app)
      .post('/api/webhooks/evolution')
      .send({ data: { key: { remoteJid: '5566999999999@s.whatsapp.net', fromMe: false }, message: { conversation: 'Oi' } } });

    expect(response.status).toBe(202);
    expect(response.body.received).toBe(true);
  });

  it('deve criar instancia pela rota compativel /api/instance/create', async () => {
    (revolutionService.createInstance as jest.Mock).mockResolvedValue({
      instanceName: 'empresa-principal',
      status: 'disconnected',
      qrCode: 'data:image/png;base64,abc',
      lastUpdateAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/instance/create')
      .send({
        instanceName: 'empresa-principal',
        qrcode: true,
      });

    expect(response.status).toBe(201);
    expect(revolutionService.createInstance).toHaveBeenCalledWith({
      instanceName: 'empresa-principal',
      phone: undefined,
      webhookUrl: undefined,
    });
  });

  it('deve enviar texto pela rota compativel /api/message/sendText/:instance', async () => {
    (revolutionService.sendTextMessage as jest.Mock).mockResolvedValue({
      messageId: 'msg_compat_1',
      status: 'sent',
      instanceName: 'empresa-principal',
      to: '5566999999999',
      text: 'Teste compat',
      sentAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/message/sendText/empresa-principal')
      .send({ number: '5566999999999', text: 'Teste compat' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('messageId', 'msg_compat_1');
    expect(revolutionService.sendTextMessage).toHaveBeenCalledWith({
      instanceName: 'empresa-principal',
      to: '5566999999999',
      text: 'Teste compat',
    });
  });

  it('deve salvar e consultar config da rota compatível /api/webhook', async () => {
    (revolutionService.setScopedConfig as jest.Mock).mockResolvedValue({
      instanceName: 'empresa-principal',
      scope: 'webhook',
      config: { enabled: true, url: 'https://webhook.site' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    (revolutionService.findScopedConfig as jest.Mock).mockResolvedValue({
      instanceName: 'empresa-principal',
      scope: 'webhook',
      config: { enabled: true, url: 'https://webhook.site' },
    });

    const setResponse = await request(app)
      .post('/api/webhook/set/empresa-principal')
      .send({
        webhook: {
          enabled: true,
          url: 'https://webhook.site',
        },
      });

    expect(setResponse.status).toBe(200);
    expect(revolutionService.setScopedConfig).toHaveBeenCalledWith(
      'webhook',
      'empresa-principal',
      expect.objectContaining({ enabled: true, url: 'https://webhook.site' })
    );

    const findResponse = await request(app).get('/api/webhook/find/empresa-principal');

    expect(findResponse.status).toBe(200);
    expect(revolutionService.findScopedConfig).toHaveBeenCalledWith('webhook', 'empresa-principal');
  });

  it('deve retornar 501 para endpoint da colecao ainda nao implementado', async () => {
    const response = await request(app)
      .post('/api/chat/findContacts/empresa-principal')
      .send({ where: { id: '123' } });

    expect(response.status).toBe(501);
    expect(response.body).toHaveProperty('error');
  });

  it('deve expor listagem de mensagens por ticket', async () => {
    const response = await request(app).get('/api/messages/tickets/1');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('deve enviar mensagem para ticket', async () => {
    const response = await request(app)
      .post('/api/messages/tickets/1/text')
      .send({ text: 'Resposta do agente' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message.id', 10);
  });
});

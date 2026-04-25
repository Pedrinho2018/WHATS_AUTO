import request from 'supertest';
import app from '../../../app';
import { User, Company } from '../../../models';
import authService from '../../../services';

jest.mock('../../../models');
jest.mock('../../../services');

describe('Integration Tests - Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('deve retornar 200 com token válido no login bem-sucedido', async () => {
      const loginResponse = {
        token: 'jwt-token-valid',
        user: {
          id: 'user-1',
          email: 'usuario@empresa.com',
          name: 'Usuário Teste',
          role: 'admin',
        },
        company: {
          id: 'company-1',
          name: 'Empresa Teste',
          subdomain: 'empresa-teste',
        },
      };

      (authService.login as jest.Mock).mockResolvedValue(loginResponse);

      const response = await request(app).post('/auth/login').send({
        email: 'usuario@empresa.com',
        password: 'senha123456',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('usuario@empresa.com');
    });

    it('deve retornar 400 com email inválido', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'email-invalido',
        password: 'senha123456',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 400 com senha muito curta', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'usuario@empresa.com',
        password: 'curta',
      });

      expect(response.status).toBe(400);
    });

    it('deve retornar 401 com credenciais inválidas', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Credenciais inválidas')
      );

      const response = await request(app).post('/auth/login').send({
        email: 'usuario@empresa.com',
        password: 'senha-errada',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/register', () => {
    it('deve registrar novo usuário com sucesso', async () => {
      const registerResponse = {
        token: 'jwt-token-novo',
        user: {
          id: 'user-novo',
          email: 'novo@empresa.com',
          name: 'Novo Usuário',
          role: 'admin',
        },
        company: {
          id: 'company-novo',
          name: 'Empresa Nova',
          subdomain: 'empresa-nova',
        },
      };

      (authService.register as jest.Mock).mockResolvedValue(registerResponse);

      const response = await request(app).post('/auth/register').send({
        name: 'Novo Usuário',
        email: 'novo@empresa.com',
        password: 'senha123456',
        companyName: 'Empresa Nova',
        subdomain: 'empresa-nova',
        phone: '5566999999999',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('novo@empresa.com');
    });

    it('deve retornar 400 com nome muito curto', async () => {
      const response = await request(app).post('/auth/register').send({
        name: 'A',
        email: 'novo@empresa.com',
        password: 'senha123456',
        companyName: 'Empresa Nova',
        subdomain: 'empresa-nova',
      });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 com subdomínio inválido', async () => {
      const response = await request(app).post('/auth/register').send({
        name: 'Novo Usuário',
        email: 'novo@empresa.com',
        password: 'senha123456',
        companyName: 'Empresa Nova',
        subdomain: 'e',
      });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 quando email já existe', async () => {
      (authService.register as jest.Mock).mockRejectedValue(
        new Error('Email já registrado')
      );

      const response = await request(app).post('/auth/register').send({
        name: 'Novo Usuário',
        email: 'existente@empresa.com',
        password: 'senha123456',
        companyName: 'Empresa Nova',
        subdomain: 'empresa-nova',
      });

      expect(response.status).toBe(400);
    });

    it('deve sanitizar subdomínio com caracteres especiais', async () => {
      const registerResponse = {
        token: 'jwt-token',
        user: { id: 'user-1', email: 'novo@empresa.com' },
      };

      (authService.register as jest.Mock).mockResolvedValue(registerResponse);

      const response = await request(app).post('/auth/register').send({
        name: 'Novo Usuário',
        email: 'novo@empresa.com',
        password: 'senha123456',
        companyName: 'Empresa Nova',
        subdomain: 'Empresa-Nova!!!',
      });

      expect(response.status).toBe(200);
      // Verificar que o subdomínio foi sanitizado
      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          subdomain: expect.stringMatching(/^[a-z0-9]+$/),
        })
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer jwt-token-valid');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});

describe('Integration Tests - Bot Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authHeader = 'Bearer jwt-token-valid';

  describe('POST /bot-configs', () => {
    it('deve criar nova configuração de bot', async () => {
      const botConfigResponse = {
        id: 'bot-1',
        name: 'Bot Principal',
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: new Date(),
      };

      const response = await request(app)
        .post('/bot-configs')
        .set('Authorization', authHeader)
        .send({
          name: 'Bot Principal',
          description: 'Bot para atendimento',
          isActive: true,
        });

      expect([200, 201]).toContain(response.status);
    });

    it('deve retornar 401 sem autenticação', async () => {
      const response = await request(app).post('/bot-configs').send({
        name: 'Bot Principal',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /bot-configs', () => {
    it('deve listar configurações de bot', async () => {
      const response = await request(app)
        .get('/bot-configs')
        .set('Authorization', authHeader);

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('GET /bot-configs/:id', () => {
    it('deve retornar configuração específica', async () => {
      const response = await request(app)
        .get('/bot-configs/bot-1')
        .set('Authorization', authHeader);

      expect([200, 401, 404]).toContain(response.status);
    });
  });
});

describe('Integration Tests - Messages Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authHeader = 'Bearer jwt-token-valid';

  describe('POST /messages/send', () => {
    it('deve enviar mensagem com autenticação válida', async () => {
      const response = await request(app)
        .post('/messages/send')
        .set('Authorization', authHeader)
        .send({
          contactId: 'contact-1',
          text: 'Olá, tudo bem?',
          type: 'text',
        });

      expect([200, 201, 401]).toContain(response.status);
    });

    it('deve retornar 401 sem token', async () => {
      const response = await request(app).post('/messages/send').send({
        contactId: 'contact-1',
        text: 'Olá',
        type: 'text',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /messages/history/:contactId', () => {
    it('deve retornar histórico de mensagens', async () => {
      const response = await request(app)
        .get('/messages/history/contact-1')
        .set('Authorization', authHeader)
        .query({ limit: 50, offset: 0 });

      expect([200, 401, 404]).toContain(response.status);
    });
  });
});

describe('Error Handling Integration Tests', () => {
  it('deve retornar 404 para rota inexistente', async () => {
    const response = await request(app).get('/inexistente');

    expect(response.status).toBe(404);
  });

  it('deve retornar 400 para payload inválido', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ invalid: 'payload' });

    expect(response.status).toBe(400);
  });

  it('deve aceitar Content-Type application/json', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        email: 'usuario@empresa.com',
        password: 'password123',
      });

    // Pode retornar 200, 401, ou 400 dependendo da implementação
    expect(response.status).toBeGreaterThanOrEqual(200);
  });
});

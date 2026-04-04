import { Request, Response } from 'express';
import authController from '../../../controllers';
import authService from '../../../services';
import { AuthRequest } from '../../../middlewares';

jest.mock('../../../services', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
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

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 400 no login sem email ou senha', async () => {
    const req = { body: { email: 'teste@empresa.com' } } as Request;
    const res = createMockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('deve retornar dados de login com sucesso', async () => {
    const req = {
      body: { email: 'teste@empresa.com', password: '12345678' },
    } as Request;
    const res = createMockResponse();

    const loginResult = {
      user: { id: 1, name: 'Teste', email: 'teste@empresa.com', role: 'admin' },
      company: { id: 1, name: 'Empresa Teste' },
      token: 'token-fake',
    };

    (authService.login as jest.Mock).mockResolvedValue(loginResult);

    await authController.login(req, res);

    expect(authService.login).toHaveBeenCalledWith({ email: 'teste@empresa.com', password: '12345678' });
    expect(res.json).toHaveBeenCalledWith(loginResult);
  });

  it('deve sanitizar subdominio no register', async () => {
    const req = {
      body: {
        name: 'Maria',
        email: 'maria@empresa.com',
        password: '12345678',
        companyName: 'Empresa Nova',
        subdomain: 'Empresa-Nova!!',
        phone: '5566999999999',
      },
    } as Request;
    const res = createMockResponse();

    (authService.register as jest.Mock).mockResolvedValue({ token: 'token-registro' });

    await authController.register(req, res);

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Maria',
      email: 'maria@empresa.com',
      password: '12345678',
      companyName: 'Empresa Nova',
      subdomain: 'empresanova',
      phone: '5566999999999',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve retornar dados do usuario em me', async () => {
    const req = {
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@empresa.com',
        role: 'admin',
        avatar: 'avatar.png',
      },
      company: {
        id: 1,
        name: 'Empresa',
      },
    } as unknown as AuthRequest;

    const res = createMockResponse();

    await authController.me(req, res);

    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@empresa.com',
        role: 'admin',
        avatar: 'avatar.png',
      },
      company: {
        id: 1,
        name: 'Empresa',
      },
    });
  });
});

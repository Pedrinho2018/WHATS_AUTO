import authService from '../../../services';
import { User, Company } from '../../../models';

jest.mock('../../../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Company: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-1', tenantId: 'tenant-1' }),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const user = {
        id: 'user-1',
        email: 'user@empresa.com',
        password: 'hashed-password',
        tenantId: 'tenant-1',
        role: 'admin',
      };

      const company = {
        id: 'tenant-1',
        name: 'Empresa Test',
        subdomain: 'empresa-test',
      };

      (User.findOne as jest.Mock).mockResolvedValue(user);
      (Company.findOne as jest.Mock).mockResolvedValue(company);

      const result = await authService.login({
        email: 'user@empresa.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('user@empresa.com');
      expect(result.company.name).toBe('Empresa Test');
    });

    it('deve retornar erro quando usuário não existe', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'inexistente@empresa.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it('deve retornar erro quando senha está incorreta', async () => {
      const user = {
        id: 'user-1',
        email: 'user@empresa.com',
        password: 'hashed-password',
      };

      (User.findOne as jest.Mock).mockResolvedValue(user);
      (require('bcrypt').compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'user@empresa.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('deve registrar novo usuário com sucesso', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (Company.create as jest.Mock).mockResolvedValue({ id: 'tenant-1' });
      (User.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'novo@empresa.com',
        name: 'Novo User',
      });

      const result = await authService.register({
        name: 'Novo User',
        email: 'novo@empresa.com',
        password: 'password123',
        companyName: 'Nova Empresa',
        subdomain: 'nova-empresa',
      });

      expect(result).toHaveProperty('token');
      expect(Company.create).toHaveBeenCalled();
      expect(User.create).toHaveBeenCalled();
    });

    it('deve retornar erro quando email já existe', async () => {
      const existingUser = { id: 'user-1', email: 'existe@empresa.com' };

      (User.findOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(
        authService.register({
          name: 'User',
          email: 'existe@empresa.com',
          password: 'password123',
          companyName: 'Empresa',
          subdomain: 'empresa',
        })
      ).rejects.toThrow();
    });

    it('deve retornar erro quando subdomínio já existe', async () => {
      const existingCompany = { id: 'company-1', subdomain: 'empresa' };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (Company.findOne as jest.Mock).mockResolvedValue(existingCompany);

      await expect(
        authService.register({
          name: 'User',
          email: 'novo@empresa.com',
          password: 'password123',
          companyName: 'Empresa',
          subdomain: 'empresa',
        })
      ).rejects.toThrow();
    });
  });

  describe('validateToken', () => {
    it('deve validar token JWT válido', async () => {
      const token = 'valid-jwt-token';

      const payload = await authService.validateToken(token);

      expect(payload).toEqual({ userId: 'user-1', tenantId: 'tenant-1' });
    });

    it('deve retornar erro para token inválido', async () => {
      (require('jsonwebtoken').verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken('invalid-token')).rejects.toThrow();
    });
  });
});

import jwt from 'jsonwebtoken';
import { User, Company, sequelize } from '../models';
import logger from '../utils';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName: string;
  subdomain: string;
  phone?: string;
}

class AuthService {
  async login(data: LoginData) {
    logger.debug('Tentativa de login recebida', { email: data.email });
    const user = await User.findOne({
      where: { email: data.email },
      include: [{ model: Company, as: 'company' }],
    });

    if (!user) {
      logger.warn('Login rejeitado: usuario nao encontrado', { email: data.email });
      throw new Error('Credenciais inválidas');
    }

    if (!user.is_active) {
      logger.warn('Login rejeitado: usuario inativo', { userId: user.id, companyId: user.company_id });
      throw new Error('Usuário inativo');
    }

    const isValidPassword = await user.validatePassword(data.password);
    if (!isValidPassword) {
      logger.warn('Login rejeitado: senha invalida', { userId: user.id, companyId: user.company_id });
      throw new Error('Credenciais inválidas');
    }

    await user.update({ last_login_at: new Date() });
    logger.info('Ultimo login atualizado', { userId: user.id, companyId: user.company_id });

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      company: user.company,
      token,
    };
  }

  async register(data: RegisterData) {
    logger.debug('Tentativa de cadastro recebida', {
      email: data.email,
      companyName: data.companyName,
      subdomain: data.subdomain,
    });
    const transaction = await sequelize.transaction();

    try {
      const existingCompany = await Company.findOne({
        where: { subdomain: data.subdomain },
        transaction,
      });

      if (existingCompany) {
        logger.warn('Cadastro rejeitado: subdominio em uso', { subdomain: data.subdomain });
        throw new Error('Subdomínio já está em uso');
      }

      const existingUser = await User.findOne({
        where: { email: data.email },
        transaction,
      });

      if (existingUser) {
        logger.warn('Cadastro rejeitado: email em uso', { email: data.email });
        throw new Error('Email já está cadastrado');
      }

      const company = await Company.create(
        {
          name: data.companyName,
          subdomain: data.subdomain,
          email: data.email,
          phone: data.phone,
          status: 'trial',
          plan: 'basic',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        { transaction }
      );

      const user = await User.create(
        {
          company_id: company.id,
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'admin',
        },
        { transaction }
      );

      await transaction.commit();
      logger.info('Novo cadastro persistido', {
        companyId: company.id,
        userId: user.id,
        subdomain: company.subdomain,
      });

      const token = this.generateToken(user);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        company,
        token,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Falha ao persistir cadastro', error);
      throw error;
    }
  }

  private generateToken(user: User): string {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET inseguro ou nao configurado');
    }

    return jwt.sign({ userId: user.id, companyId: user.company_id }, secret, { expiresIn: '7d' });
  }
}

const authService = new AuthService();

export { AuthService };
export default authService;

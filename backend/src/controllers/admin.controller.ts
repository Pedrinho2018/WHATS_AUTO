import { Request, Response } from 'express';
import { z } from 'zod';
import { Company, User, sequelize } from '../models';
import logger from '../utils';
import { AuthRequest } from '../middlewares';
import bcrypt from 'bcryptjs';

const createCompanySchema = z.object({
  name: z.string().trim().min(2, 'Nome da empresa é obrigatório').max(255),
  subdomain: z.string().trim().min(2, 'Subdomínio é obrigatório').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  phone: z.string().trim().regex(/^\d{10,15}$/, 'Telefone inválido').optional(),
  cnpj: z.string().trim().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido').optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).optional(),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome do usuário é obrigatório').max(255),
  email: z.string().trim().email('Email inválido').max(255),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  company_id: z.number().int().positive('ID da empresa inválido'),
  role: z.enum(['admin', 'manager', 'agent', 'viewer']).optional(),
});

const normalizeSubdomain = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// ═══════════════════════════════════════════════════════════════
// Admin Controller
// ═══════════════════════════════════════════════════════════════

class AdminController {
  /**
   * Criar nova empresa (apenas para master admin com ADMIN_PASSWORD)
   */
  async createCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validar se é admin da empresa raiz/master
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado: apenas administrador pode criar empresa' });
        return;
      }

      const parsed = createCompanySchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Payload inválido' });
        return;
      }

      const { name, subdomain, email, phone, cnpj, plan = 'basic' } = parsed.data;
      const normalizedSubdomain = normalizeSubdomain(subdomain);

      if (!normalizedSubdomain) {
        res.status(400).json({ error: 'Subdomínio inválido' });
        return;
      }

      const existingCompany = await Company.findOne({
        where: { subdomain: normalizedSubdomain },
      });

      if (existingCompany) {
        logger.warn('Criação de empresa rejeitada: subdomínio em uso', { subdomain: normalizedSubdomain });
        res.status(400).json({ error: 'Subdomínio já está em uso' });
        return;
      }

      const company = await Company.create({
        name,
        subdomain: normalizedSubdomain,
        email,
        phone,
        cnpj,
        status: 'active',
        plan,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      logger.info('Nova empresa criada', {
        companyId: company.id,
        subdomain: company.subdomain,
        createdBy: req.user?.id,
      });

      res.status(201).json({
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        email: company.email,
        phone: company.phone,
        cnpj: company.cnpj,
        status: company.status,
        plan: company.plan,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar empresa';
      logger.error('Falha ao criar empresa', error);
      res.status(400).json({ error: message });
    }
  }

  /**
   * Listar todas as empresas (apenas para master admin)
   */
  async listCompanies(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado: apenas administrador pode listar empresas' });
        return;
      }

      const companies = await Company.findAll({
        order: [['created_at', 'DESC']],
      });

      res.json(companies);
    } catch (error) {
      logger.error('Falha ao listar empresas', error);
      res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  }

  /**
   * Criar novo usuário em uma empresa (apenas para master admin)
   */
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado: apenas administrador pode criar usuário' });
        return;
      }

      const parsed = createUserSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Payload inválido' });
        return;
      }

      const { name, email, password, company_id, role = 'agent' } = parsed.data;

      const transaction = await sequelize.transaction();

      try {
        // Validar que a empresa existe
        const company = await Company.findByPk(company_id, { transaction });
        if (!company) {
          await transaction.rollback();
          res.status(404).json({ error: 'Empresa não encontrada' });
          return;
        }

        // Validar que o email não existe na empresa
        const existingUser = await User.findOne({
          where: { email, company_id },
          transaction,
        });

        if (existingUser) {
          await transaction.rollback();
          logger.warn('Criação de usuário rejeitada: email em uso', { email, company_id });
          res.status(400).json({ error: 'Email já está cadastrado nesta empresa' });
          return;
        }

        const user = await User.create(
          {
            company_id,
            name,
            email,
            password,
            role,
            is_active: true,
          },
          { transaction }
        );

        await transaction.commit();

        logger.info('Novo usuário criado', {
          userId: user.id,
          email: user.email,
          company_id,
          role,
          createdBy: req.user?.id,
        });

        res.status(201).json({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_id: user.company_id,
          is_active: user.is_active,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
      logger.error('Falha ao criar usuário', error);
      res.status(400).json({ error: message });
    }
  }

  /**
   * Listar usuários de uma empresa
   */
  async listUsersByCompany(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado: apenas administrador pode listar usuários' });
        return;
      }

      const users = await User.findAll({
        where: { company_id: parseInt(String(companyId), 10) },
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      });

      res.json(users);
    } catch (error) {
      logger.error('Falha ao listar usuários', error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  /**
   * Resetar senha de um usuário (apenas para master admin)
   */
  async resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado: apenas administrador pode resetar senha' });
        return;
      }

      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });
        return;
      }

      const user = await User.findByPk(String(userId));
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      await user.update({ password: newPassword });

      logger.info('Senha do usuário resetada', {
        userId: user.id,
        email: user.email,
        resetBy: req.user?.id,
      });

      res.json({ message: 'Senha resetada com sucesso' });
    } catch (error) {
      logger.error('Falha ao resetar senha', error);
      res.status(500).json({ error: 'Erro ao resetar senha' });
    }
  }
}

export default new AdminController();

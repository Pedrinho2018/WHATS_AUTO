import { Request, Response } from 'express';
import { z } from 'zod';
import authService from '../services';
import { AuthRequest } from '../middlewares';

const loginSchema = z.object({
  email: z.string().trim().email('Email invalido').max(255),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres').max(128),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome invalido').max(120),
  email: z.string().trim().email('Email invalido').max(255),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres').max(128),
  companyName: z.string().trim().min(2, 'Nome da empresa invalido').max(120),
  subdomain: z.string().trim().min(2, 'Subdominio invalido').max(60),
  phone: z.string().trim().regex(/^\d{10,15}$/, 'Telefone invalido').optional(),
});

const normalizeSubdomain = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// ═══════════════════════════════════════════════════════════════
// Auth Controller
// ═══════════════════════════════════════════════════════════════

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Payload de login invalido' });
        return;
      }

      const { email, password } = parsed.data;

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro no login';
      res.status(401).json({ error: message });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Payload de cadastro invalido' });
        return;
      }

      const { name, email, password, companyName, subdomain, phone } = parsed.data;
      const normalizedSubdomain = normalizeSubdomain(subdomain);

      if (!normalizedSubdomain) {
        res.status(400).json({ error: 'Subdominio invalido' });
        return;
      }

      const result = await authService.register({
        name,
        email,
        password,
        companyName,
        subdomain: normalizedSubdomain,
        phone,
      });

      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro no registro';
      res.status(400).json({ error: message });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json({
        user: {
          id: req.user?.id,
          name: req.user?.name,
          email: req.user?.email,
          role: req.user?.role,
          avatar: req.user?.avatar,
        },
        company: req.company,
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  }
}

export default new AuthController();
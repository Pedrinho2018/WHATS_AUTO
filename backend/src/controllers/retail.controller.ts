import { Response } from 'express';
import { AuthRequest } from '../middlewares';
import retailService from '../services/retail.service';
import logger from '../utils';

// ═══════════════════════════════════════════════════════════════
// CONTROLLER VAREJO - MVP 2.0
// ═══════════════════════════════════════════════════════════════

class RetailController {
  private getCompanyId(req: AuthRequest, res: Response): number | null {
    const companyId = req.user?.company_id;

    if (typeof companyId !== 'number') {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return null;
    }

    return companyId;
  }

  // ─── CATÁLOGO ──────────────────────────────────────────────────

  async searchProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { q, categoryId, limit } = req.query;

      const products = await retailService.searchProducts({
        companyId,
        query: String(q || ''),
        categoryId: categoryId ? Number(categoryId) : undefined,
        limit: limit ? Number(limit) : 10,
      });

      res.json({ success: true, data: products });
    } catch (error) {
      logger.error('Erro ao buscar produtos', error);
      res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  }

  async getCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const categories = await retailService.getCategories(companyId);
      res.json({ success: true, data: categories });
    } catch (error) {
      logger.error('Erro ao buscar categorias', error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  async getFeaturedProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const products = await retailService.getFeaturedProducts(companyId);
      res.json({ success: true, data: products });
    } catch (error) {
      logger.error('Erro ao buscar destaques', error);
      res.status(500).json({ error: 'Erro ao buscar produtos em destaque' });
    }
  }

  async getProductById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { id } = req.params;

      const product = await retailService.getProductById(companyId, Number(id));

      if (!product) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }

      res.json({ success: true, data: product });
    } catch (error) {
      logger.error('Erro ao buscar produto', error);
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  }

  // ─── CARRINHO ──────────────────────────────────────────────────

  async getCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone, ticketId } = req.query;

      const cart = await retailService.getOrCreateCart(
        companyId,
        String(phone),
        ticketId ? Number(ticketId) : undefined
      );

      res.json({ success: true, data: cart });
    } catch (error) {
      logger.error('Erro ao buscar carrinho', error);
      res.status(500).json({ error: 'Erro ao buscar carrinho' });
    }
  }

  async addToCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { ticketId, phone, productId, quantity, notes } = req.body;

      const cart = await retailService.addToCart({
        companyId,
        ticketId,
        phone,
        productId,
        quantity,
        notes,
      });

      res.json({ success: true, data: cart });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar ao carrinho';
      logger.error('Erro ao adicionar ao carrinho', error);
      res.status(400).json({ error: message });
    }
  }

  async removeFromCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { cartId, productId } = req.params;

      const cart = await retailService.removeFromCart(companyId, Number(cartId), Number(productId));
      res.json({ success: true, data: cart });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover do carrinho';
      logger.error('Erro ao remover do carrinho', error);
      res.status(400).json({ error: message });
    }
  }

  async updateCartQuantity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { cartId, productId } = req.params;
      const { quantity } = req.body;

      const cart = await retailService.updateCartItemQuantity(
        companyId,
        Number(cartId),
        Number(productId),
        quantity
      );

      res.json({ success: true, data: cart });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
      logger.error('Erro ao atualizar quantidade', error);
      res.status(400).json({ error: message });
    }
  }

  async clearCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { cartId } = req.params;

      const cart = await retailService.clearCart(companyId, Number(cartId));
      res.json({ success: true, data: cart });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao limpar carrinho';
      logger.error('Erro ao limpar carrinho', error);
      res.status(400).json({ error: message });
    }
  }

  // ─── PEDIDOS ──────────────────────────────────────────────────

  async finalizeCart(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { cartId, deliveryAddress, deliveryNotes, paymentMethod, couponCode } = req.body;

      const order = await retailService.finalizeCart({
        companyId,
        cartId,
        deliveryAddress,
        deliveryNotes,
        paymentMethod,
        couponCode,
      });

      res.json({ success: true, data: order });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao finalizar pedido';
      logger.error('Erro ao finalizar pedido', error);
      res.status(400).json({ error: message });
    }
  }

  async getOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { id } = req.params;

      const { Order } = await import('../models/retail.models');
      const order = await Order.findOne({
        where: { id: Number(id), company_id: companyId },
      });

      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Erro ao buscar pedido', error);
      res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
  }

  async listOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { status, limit = 20, offset = 0 } = req.query;

      const { Order } = await import('../models/retail.models');

      const where: Record<string, unknown> = { company_id: companyId };
      if (status) {
        where.status = status;
      }

      const orders = await Order.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['created_at', 'DESC']],
      });

      res.json({ success: true, data: orders.rows, total: orders.count });
    } catch (error) {
      logger.error('Erro ao listar pedidos', error);
      res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
  }

  async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { id } = req.params;
      const { status, cancelReason } = req.body;

      const { Order } = await import('../models/retail.models');
      const order = await Order.findOne({ where: { id: Number(id), company_id: companyId } });

      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      const updates: Record<string, unknown> = { status };

      if (status === 'confirmed') {
        updates.confirmed_at = new Date();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date();
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date();
        updates.cancel_reason = cancelReason;
      }

      await order.update(updates);
      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Erro ao atualizar status', error);
      res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  }

  // ─── CLIENTES ──────────────────────────────────────────────────

  async getCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone } = req.params;

      const customer = await retailService.getOrCreateCustomer(companyId, String(phone));
      res.json({ success: true, data: customer });
    } catch (error) {
      logger.error('Erro ao buscar cliente', error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  async getCustomerAddresses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone } = req.params;

      const addresses = await retailService.getCustomerAddresses(companyId, String(phone));
      res.json({ success: true, data: addresses });
    } catch (error) {
      logger.error('Erro ao buscar endereços', error);
      res.status(500).json({ error: 'Erro ao buscar endereços' });
    }
  }

  async addCustomerAddress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone } = req.params;
      const { label, address, city, isDefault } = req.body;

      await retailService.addCustomerAddress(companyId, String(phone), {
        label,
        address,
        city,
        is_default: isDefault || false,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao adicionar endereço', error);
      res.status(500).json({ error: 'Erro ao adicionar endereço' });
    }
  }

  // ─── FIDELIDADE ──────────────────────────────────────────────────

  async getLoyaltyInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone } = req.params;

      const info = await retailService.getCustomerLoyaltyInfo(companyId, String(phone));
      res.json({ success: true, data: info });
    } catch (error) {
      logger.error('Erro ao buscar fidelidade', error);
      res.status(500).json({ error: 'Erro ao buscar informações de fidelidade' });
    }
  }

  async redeemPoints(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { phone } = req.params;
      const { points } = req.body;

      const discountValue = await retailService.redeemLoyaltyPoints(companyId, String(phone), points);
      res.json({ success: true, data: { discountValue } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao resgatar pontos';
      logger.error('Erro ao resgatar pontos', error);
      res.status(400).json({ error: message });
    }
  }

  // ─── PROMOÇÕES ──────────────────────────────────────────────────

  async getPromotions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const promotions = await retailService.getActivePromotions(companyId);
      res.json({ success: true, data: promotions });
    } catch (error) {
      logger.error('Erro ao buscar promoções', error);
      res.status(500).json({ error: 'Erro ao buscar promoções' });
    }
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = this.getCompanyId(req, res);
      if (companyId === null) return;
      const { period } = req.query;

      const stats = await retailService.getOrderStats(companyId, (period as 'today' | 'week' | 'month') || 'today');
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Erro ao buscar estatísticas', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
}

export default new RetailController();
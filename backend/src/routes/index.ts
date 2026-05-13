import { Router } from 'express';
import authController from '../controllers';
import adminController from '../controllers/admin.controller';
import evolutionCompatController from '../controllers/evolution-compat.controller';
import managementController from '../controllers/management.controller';
import messagesController from '../controllers/messages.controller';
import revolutionController from '../controllers/revolution.controller';
import webhookController from '../controllers/webhook.controller';
import botConfigController from '../controllers/bot-config.controller';
import {
  authMiddleware,
  authRateLimit,
  roleMiddleware,
  sensitiveActionRateLimit,
  webhookAuthMiddleware,
  webhookRateLimit,
} from '../middlewares';

// ═══════════════════════════════════════════════════════════════
// Rotas
// ═══════════════════════════════════════════════════════════════

const routes = Router();

// ─── Health Check ───────────────────────────────────────────────
routes.get('/health', (_req, res) => {
  return res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── Rotas Públicas ─────────────────────────────────────────────
routes.use('/auth', authRateLimit);
routes.post('/auth/login', authController.login.bind(authController));
// routes.post('/auth/register', authController.register.bind(authController)); // DESABILITADO - Use admin portal
routes.post('/webhooks/evolution', webhookRateLimit, webhookAuthMiddleware, webhookController.evolutionInbound.bind(webhookController));

// Evolution API compatibility
routes.use([
  '/instance',
  '/message',
  '/proxy',
  '/settings',
  '/webhook',
  '/rabbitmq',
  '/sqs',
  '/websocket',
  '/chatwoot',
  '/chat',
  '/label',
  '/group',
  '/call',
  '/typebot',
  '/evolutionBot',
  '/openai',
  '/dify',
  '/flowise',
  '/template',
  '/s3',
], webhookAuthMiddleware);

routes.post('/instance/create', evolutionCompatController.createInstance.bind(evolutionCompatController));
routes.get('/instance/fetchInstances', evolutionCompatController.fetchInstances.bind(evolutionCompatController));
routes.get('/instance/connect/:instance', evolutionCompatController.connectInstance.bind(evolutionCompatController));
routes.post('/instance/restart/:instance', evolutionCompatController.restartInstance.bind(evolutionCompatController));
routes.post('/instance/setPresence/:instance', evolutionCompatController.setPresence.bind(evolutionCompatController));
routes.get('/instance/connectionState/:instance', evolutionCompatController.connectionState.bind(evolutionCompatController));
routes.delete('/instance/logout/:instance', evolutionCompatController.logoutInstance.bind(evolutionCompatController));
routes.delete('/instance/delete/:instance', evolutionCompatController.deleteInstance.bind(evolutionCompatController));

routes.post('/message/sendText/:instance', evolutionCompatController.sendText.bind(evolutionCompatController));

routes.post('/typebot/create/:instance', evolutionCompatController.createTypebot.bind(evolutionCompatController));
routes.get('/typebot/find/:instance', evolutionCompatController.findTypebot.bind(evolutionCompatController));
routes.post('/typebot/changeStatus/:instance', evolutionCompatController.changeStatusTypebot.bind(evolutionCompatController));
routes.post('/typebot/start/:instance', evolutionCompatController.startTypebot.bind(evolutionCompatController));

const compatScopes = ['proxy', 'settings', 'webhook', 'rabbitmq', 'sqs', 'websocket', 'chatwoot', 'n8n'];

compatScopes.forEach((scope) => {
  routes.post(`/${scope}/set/:instance`, evolutionCompatController.setConfig.bind(evolutionCompatController));
  routes.get(`/${scope}/find/:instance`, evolutionCompatController.findConfig.bind(evolutionCompatController));
});

routes.all('/message/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/chat/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/label/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/group/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/call/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/evolutionBot/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/openai/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/dify/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/flowise/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/template/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));
routes.all('/s3/*rest', evolutionCompatController.notImplemented.bind(evolutionCompatController));

// ─── Rotas Protegidas ───────────────────────────────────────────
routes.use(authMiddleware);

// Auth
routes.get('/auth/me', authController.me.bind(authController));

// Admin: Empresas e usuários (acesso restrito a super admin)
routes.post('/admin/companies', roleMiddleware('admin'), adminController.createCompany.bind(adminController));
routes.get('/admin/companies', roleMiddleware('admin'), adminController.listCompanies.bind(adminController));
routes.post('/admin/users', roleMiddleware('admin'), adminController.createUser.bind(adminController));
routes.get('/admin/companies/:companyId/users', roleMiddleware('admin'), adminController.listUsersByCompany.bind(adminController));
routes.patch('/admin/users/:userId/reset-password', roleMiddleware('admin'), adminController.resetUserPassword.bind(adminController));

// Dashboard
routes.get('/dashboard/summary', managementController.dashboard.bind(managementController));
routes.get('/diagnostics/events', roleMiddleware('admin', 'manager'), sensitiveActionRateLimit, managementController.diagnostics.bind(managementController));

// Privacidade e LGPD
routes.get('/privacy/contacts/:contactPhone/export', roleMiddleware('admin', 'manager'), sensitiveActionRateLimit, managementController.exportContactData.bind(managementController));
routes.delete('/privacy/contacts/:contactPhone', roleMiddleware('admin'), sensitiveActionRateLimit, managementController.deleteContactData.bind(managementController));
routes.post('/privacy/retention/apply', roleMiddleware('admin'), sensitiveActionRateLimit, managementController.applyPrivacyRetention.bind(managementController));

// Conversas (area do usuario/agente)
routes.get('/tickets', managementController.listTickets.bind(managementController));
routes.get('/tickets/history/:contactPhone', managementController.listTicketHistory.bind(managementController));
routes.post('/tickets', managementController.createTicket.bind(managementController));
routes.patch('/tickets/:id', managementController.updateTicket.bind(managementController));
routes.get('/tickets/:id/audit', managementController.listTicketAudit.bind(managementController));
routes.post('/tickets/:id/transfer', roleMiddleware('admin', 'manager', 'agent'), managementController.transferTicket.bind(managementController));
routes.get('/messages/tickets/:ticketId', messagesController.listTicketMessages.bind(messagesController));
routes.post('/messages/tickets/:ticketId/text', roleMiddleware('admin', 'manager', 'agent', 'viewer'), messagesController.sendTextToTicket.bind(messagesController));

// Templates de Mensagem
routes.get('/templates/messages', managementController.listMessageTemplates.bind(managementController));
routes.post('/templates/messages', roleMiddleware('admin', 'manager'), managementController.createMessageTemplate.bind(managementController));
routes.post('/templates/messages/standardize', roleMiddleware('admin', 'manager'), managementController.seedStandardMessageTemplates.bind(managementController));
routes.patch('/templates/messages/:id', roleMiddleware('admin', 'manager'), managementController.updateMessageTemplate.bind(managementController));
routes.delete('/templates/messages/:id', roleMiddleware('admin', 'manager'), managementController.deleteMessageTemplate.bind(managementController));

// Fluxos
routes.get('/flows', managementController.listFlows.bind(managementController));
routes.post('/flows', roleMiddleware('admin', 'manager'), managementController.createFlow.bind(managementController));
routes.patch('/flows/:id', roleMiddleware('admin', 'manager'), managementController.updateFlow.bind(managementController));

// Admin: usuarios/agentes
routes.get('/users', roleMiddleware('admin', 'manager'), managementController.listUsers.bind(managementController));
routes.post('/users', roleMiddleware('admin'), managementController.createUser.bind(managementController));
routes.patch('/users/me/settings', managementController.updateUserSettings.bind(managementController));
routes.patch('/users/:id', roleMiddleware('admin'), managementController.updateUser.bind(managementController));

// Admin: numeros/instancias
routes.get('/instances', roleMiddleware('admin', 'manager', 'agent', 'viewer'), managementController.listInstances.bind(managementController));
routes.post('/instances', roleMiddleware('admin', 'manager'), managementController.createInstance.bind(managementController));
routes.patch('/instances/:id', roleMiddleware('admin', 'manager'), managementController.updateInstance.bind(managementController));
routes.post('/instances/:id/connect', roleMiddleware('admin', 'manager'), managementController.connectInstance.bind(managementController));

// Revolution API (mock)
routes.get('/revolution/instances', roleMiddleware('admin', 'manager', 'agent', 'viewer'), revolutionController.listInstances.bind(revolutionController));
routes.post('/revolution/instances', roleMiddleware('admin', 'manager'), revolutionController.createInstance.bind(revolutionController));
routes.post('/revolution/instances/:instanceName/connect', roleMiddleware('admin', 'manager'), revolutionController.connectInstance.bind(revolutionController));
routes.post('/revolution/instances/:instanceName/disconnect', roleMiddleware('admin', 'manager'), revolutionController.disconnectInstance.bind(revolutionController));
routes.get('/revolution/instances/:instanceName/status', roleMiddleware('admin', 'manager', 'agent', 'viewer'), revolutionController.getStatus.bind(revolutionController));
routes.get('/revolution/instances/:instanceName/qrcode', roleMiddleware('admin', 'manager', 'agent', 'viewer'), revolutionController.getQrCode.bind(revolutionController));
routes.post('/revolution/messages/text', roleMiddleware('admin', 'manager', 'agent'), revolutionController.sendTextMessage.bind(revolutionController));

// Bot Configuration
routes.post('/bot-config', roleMiddleware('admin', 'manager'), botConfigController.upsertBotConfig.bind(botConfigController));
routes.get('/bot-config', roleMiddleware('admin', 'manager', 'agent', 'viewer'), botConfigController.getBotConfig.bind(botConfigController));
routes.get('/bot-config/all', roleMiddleware('admin', 'manager'), botConfigController.getAllBotConfigs.bind(botConfigController));
routes.get('/bot-config/:id', roleMiddleware('admin', 'manager'), botConfigController.getBotConfigById.bind(botConfigController));
routes.get('/bot-config/check/hours', botConfigController.checkBusinessHours.bind(botConfigController));
routes.get('/bot-config/messages/welcome', botConfigController.getWelcomeMessage.bind(botConfigController));
routes.get('/bot-config/messages/standard', botConfigController.getStandardMessages.bind(botConfigController));
routes.delete('/bot-config/:id', roleMiddleware('admin'), botConfigController.deleteBotConfig.bind(botConfigController));

export default routes;

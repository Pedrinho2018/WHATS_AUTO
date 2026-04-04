import { Request, Response } from 'express';
import revolutionService, { EvolutionConfigScope } from '../services/revolution.service';

const CONFIG_SCOPES: EvolutionConfigScope[] = [
  'proxy',
  'settings',
  'webhook',
  'rabbitmq',
  'sqs',
  'websocket',
  'chatwoot',
];

const isConfigScope = (scope: string): scope is EvolutionConfigScope =>
  CONFIG_SCOPES.includes(scope as EvolutionConfigScope);

const NOT_IMPLEMENTED_PATTERNS = [
  '/message/sendMedia/:instance',
  '/message/sendPtv/:instance',
  '/message/sendWhatsAppAudio/:instance',
  '/message/sendStatus/:instance',
  '/message/sendSticker/:instance',
  '/message/sendLocation/:instance',
  '/message/sendContact/:instance',
  '/message/sendReaction/:instance',
  '/message/sendPoll/:instance',
  '/message/sendList/:instance',
  '/message/sendButtons/:instance',
  '/chat/*',
  '/label/*',
  '/group/*',
  '/call/*',
  '/typebot/*',
  '/evolutionBot/*',
  '/openai/*',
  '/dify/*',
  '/flowise/*',
  '/template/*',
  '/s3/*',
];

class EvolutionCompatController {
  private getInstanceParam(req: Request): string {
    return String(req.params.instance || '').trim();
  }

  private readConfigPayload(req: Request, scope: EvolutionConfigScope): Record<string, unknown> {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const nested = body[scope];

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }

    return body;
  }

  private parsePresence(value: unknown): 'available' | 'unavailable' {
    return String(value || '').toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
  }

  private resolveScope(req: Request): EvolutionConfigScope | '' {
    const fromParams = String(req.params.scope || '').trim();
    if (fromParams) {
      return fromParams as EvolutionConfigScope;
    }

    const firstPathSegment = String(req.path || '').split('/').filter(Boolean)[0] || '';
    return firstPathSegment as EvolutionConfigScope;
  }

  async createInstance(req: Request, res: Response): Promise<void> {
    const payload = req.body as { instanceName?: string; webhook?: unknown; number?: string };
    const instanceName = String(payload?.instanceName || '').trim();

    if (!instanceName) {
      res.status(400).json({ error: 'instanceName e obrigatorio' });
      return;
    }

    try {
      const webhookRecord = payload.webhook && typeof payload.webhook === 'object'
        ? (payload.webhook as Record<string, unknown>)
        : null;
      const webhookUrl = webhookRecord ? String(webhookRecord.url || '') : undefined;
      const data = await revolutionService.createInstance({
        instanceName,
        phone: payload.number,
        webhookUrl: webhookUrl || undefined,
      });
      res.status(201).json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar instancia';
      res.status(400).json({ error: message });
    }
  }

  async fetchInstances(req: Request, res: Response): Promise<void> {
    try {
      const instanceName = String(req.query.instanceName || '').trim();
      const all = await revolutionService.listInstances();
      const filtered = instanceName ? all.filter((item) => item.instanceName === instanceName) : all;
      res.json(filtered);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao listar instancias';
      res.status(400).json({ error: message });
    }
  }

  async connectInstance(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.connectInstance(instanceName);
      res.json({
        instance: {
          instanceName: result.instanceName,
          status: result.status,
        },
        base64: result.qrCode,
        code: result.pairingCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao conectar instancia';
      res.status(404).json({ error: message });
    }
  }

  async restartInstance(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.restartInstance(instanceName);
      res.json({
        instanceName: result.instanceName,
        status: result.status,
        base64: result.qrCode,
        code: result.pairingCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao reiniciar instancia';
      res.status(400).json({ error: message });
    }
  }

  async setPresence(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);
    const presence = this.parsePresence((req.body as { presence?: unknown })?.presence);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.setPresence(instanceName, presence);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao definir presenca';
      res.status(400).json({ error: message });
    }
  }

  async connectionState(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const status = await revolutionService.getInstanceStatus(instanceName);
      res.json({
        instanceName: status.instanceName,
        state: status.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar status';
      res.status(404).json({ error: message });
    }
  }

  async logoutInstance(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.disconnectInstance(instanceName);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao desconectar instancia';
      res.status(400).json({ error: message });
    }
  }

  async deleteInstance(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.deleteInstance(instanceName);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir instancia';
      res.status(400).json({ error: message });
    }
  }

  async sendText(req: Request, res: Response): Promise<void> {
    const instanceName = this.getInstanceParam(req);
    const payload = req.body as { number?: string; text?: string };

    if (!instanceName || !payload?.number || !payload?.text) {
      res.status(400).json({ error: 'instance, number e text sao obrigatorios' });
      return;
    }

    try {
      const result = await revolutionService.sendTextMessage({
        instanceName,
        to: payload.number,
        text: payload.text,
      });
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem';
      res.status(400).json({ error: message });
    }
  }

  async setConfig(req: Request, res: Response): Promise<void> {
    const scope = this.resolveScope(req);
    const instanceName = this.getInstanceParam(req);

    if (!isConfigScope(scope)) {
      res.status(404).json({ error: 'Escopo nao suportado' });
      return;
    }

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.setScopedConfig(scope, instanceName, this.readConfigPayload(req, scope));
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar configuracao';
      res.status(400).json({ error: message });
    }
  }

  async findConfig(req: Request, res: Response): Promise<void> {
    const scope = this.resolveScope(req);
    const instanceName = this.getInstanceParam(req);

    if (!isConfigScope(scope)) {
      res.status(404).json({ error: 'Escopo nao suportado' });
      return;
    }

    if (!instanceName) {
      res.status(400).json({ error: 'instance e obrigatorio' });
      return;
    }

    try {
      const result = await revolutionService.findScopedConfig(scope, instanceName);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar configuracao';
      res.status(400).json({ error: message });
    }
  }

  async notImplemented(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      error: 'Endpoint da colecao Evolution ainda nao implementado',
      method: req.method,
      path: req.path,
      implementedExamples: [
        '/instance/create',
        '/instance/fetchInstances',
        '/instance/connect/:instance',
        '/instance/restart/:instance',
        '/instance/setPresence/:instance',
        '/instance/connectionState/:instance',
        '/instance/logout/:instance',
        '/instance/delete/:instance',
        '/message/sendText/:instance',
        '/proxy/set/:instance',
        '/proxy/find/:instance',
        '/settings/set/:instance',
        '/settings/find/:instance',
        '/webhook/set/:instance',
        '/webhook/find/:instance',
        '/rabbitmq/set/:instance',
        '/rabbitmq/find/:instance',
        '/sqs/set/:instance',
        '/sqs/find/:instance',
        '/websocket/set/:instance',
        '/websocket/find/:instance',
        '/chatwoot/set/:instance',
        '/chatwoot/find/:instance',
      ],
      pendingPatterns: NOT_IMPLEMENTED_PATTERNS,
    });
  }
}

export default new EvolutionCompatController();

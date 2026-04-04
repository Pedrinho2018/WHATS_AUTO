type RevolutionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface RevolutionInstancePayload {
  instanceName: string;
  webhookUrl?: string;
  phone?: string;
}

interface RevolutionMessagePayload {
  instanceName: string;
  to: string;
  text: string;
}

interface RevolutionInstanceMock {
  instanceName: string;
  status: RevolutionStatus;
  webhookUrl?: string;
  phone?: string;
  qrCode: string;
  pairingCode: string;
  lastUpdateAt: string;
}

interface RevolutionMessageResponse {
  messageId: string;
  status: 'queued' | 'sent';
  instanceName: string;
  to: string;
  text: string;
  sentAt: string;
}

type EvolutionConfigScope =
  | 'proxy'
  | 'settings'
  | 'webhook'
  | 'rabbitmq'
  | 'sqs'
  | 'websocket'
  | 'chatwoot';

class RevolutionService {
  private readonly instances = new Map<string, RevolutionInstanceMock>();
  private readonly integrationConfigs = new Map<EvolutionConfigScope, Map<string, Record<string, unknown>>>();

  private get mode(): string {
    return process.env.REVOLUTION_API_MODE || 'mock';
  }

  private get baseUrl(): string {
    return (
      process.env.REVOLUTION_API_URL ||
      process.env.EVOLUTION_SERVER_URL ||
      ''
    ).replace(/\/$/, '');
  }

  private get apiKey(): string {
    return process.env.REVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY || '';
  }

  private get endpoints(): {
    list: string;
    create: string;
    connect: string;
    disconnect: string;
    status: string;
    qrcode: string;
    sendText: string;
  } {
    return {
      list: process.env.REVOLUTION_ENDPOINT_LIST || '/instance/fetchInstances',
      create: process.env.REVOLUTION_ENDPOINT_CREATE || '/instance/create',
      connect: process.env.REVOLUTION_ENDPOINT_CONNECT || '/instance/connect/{instanceName}',
      disconnect: process.env.REVOLUTION_ENDPOINT_DISCONNECT || '/instance/logout/{instanceName}',
      status: process.env.REVOLUTION_ENDPOINT_STATUS || '/instance/connectionState/{instanceName}',
      qrcode: process.env.REVOLUTION_ENDPOINT_QRCODE || '/instance/connect/{instanceName}',
      sendText: process.env.REVOLUTION_ENDPOINT_SEND_TEXT || '/message/sendText/{instanceName}',
    };
  }

  private buildQrCode(instanceName: string): string {
    const label = instanceName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">',
      '<rect width="320" height="320" fill="#ffffff"/>',
      '<rect x="20" y="20" width="280" height="280" fill="#f8fafc" stroke="#0f172a" stroke-width="8"/>',
      '<rect x="44" y="44" width="64" height="64" fill="#0f172a"/>',
      '<rect x="212" y="44" width="64" height="64" fill="#0f172a"/>',
      '<rect x="44" y="212" width="64" height="64" fill="#0f172a"/>',
      '<text x="160" y="160" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">QR MOCK</text>',
      `<text x="160" y="286" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#334155">${label}</text>`,
      '</svg>',
    ].join('');

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private buildPairingCode(instanceName: string): string {
    const cleaned = instanceName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 8).padEnd(8, '0');
  }

  private extractRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private extractString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private extractQrCode(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return this.extractString(value);
    }

    const record = value as Record<string, unknown>;
    const directCandidates = [record.base64, record.qrCode, record.qrcode];

    for (const candidate of directCandidates) {
      if (typeof candidate === 'string' && candidate) {
        return candidate;
      }

      if (candidate && typeof candidate === 'object') {
        const nested = this.extractQrCode(candidate);
        if (nested) {
          return nested;
        }
      }
    }

    return '';
  }

  private extractPairingCode(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return this.extractString(value);
    }

    const record = value as Record<string, unknown>;
    const directCandidates = [
      record.pairingCode,
      record.pairing_code,
      record.code,
      record.pin,
      record.pair,
    ];

    for (const candidate of directCandidates) {
      if (typeof candidate === 'string' && candidate) {
        return candidate;
      }

      if (candidate && typeof candidate === 'object') {
        const nested = this.extractPairingCode(candidate);
        if (nested) {
          return nested;
        }
      }
    }

    return '';
  }

  private normalizeInstanceName(value: unknown, fallback: string): string {
    if (!value || typeof value !== 'object') {
      return fallback;
    }

    const record = value as Record<string, unknown>;
    return this.extractString(record.instanceName || record.name || record.instance) || fallback;
  }

  private normalizeInstancePayload(
    payload: Record<string, unknown>,
    fallbackName: string
  ): RevolutionInstanceMock {
    const nestedInstance = this.extractRecord(payload.instance);
    const instanceSource = Object.keys(nestedInstance).length > 0 ? nestedInstance : payload;
    const qrSource =
      payload.qrcode ?? payload.qrCode ?? payload.base64 ?? nestedInstance.qrcode ?? nestedInstance.qrCode ?? nestedInstance.base64;
    const qrCode = this.extractQrCode(qrSource);
    const pairingSource =
      payload.pairingCode ??
      payload.pairing_code ??
      payload.code ??
      payload.pin ??
      nestedInstance.pairingCode ??
      nestedInstance.pairing_code ??
      nestedInstance.code ??
      nestedInstance.pin;
    const pairingCode = this.extractPairingCode(pairingSource);
    const status = this.normalizeStatus(
      instanceSource.status ||
        instanceSource.connectionStatus ||
        payload.status ||
        payload.connectionStatus ||
        payload.state
    );

    return {
      instanceName: this.normalizeInstanceName(instanceSource, fallbackName),
      status: status === 'error' && (qrCode || pairingCode) ? 'connecting' : status,
      webhookUrl: this.extractString(instanceSource.webhookUrl || payload.webhookUrl) || undefined,
      phone: this.extractString(instanceSource.phone || payload.phone) || undefined,
      qrCode,
      pairingCode,
      lastUpdateAt: new Date().toISOString(),
    };
  }

  private buildEndpoint(pathTemplate: string, instanceName?: string): string {
    const withParams = instanceName
      ? pathTemplate.replace('{instanceName}', encodeURIComponent(instanceName))
      : pathTemplate;

    if (!this.baseUrl) {
      throw new Error('REVOLUTION_API_URL ou EVOLUTION_SERVER_URL nao configurada');
    }

    return `${this.baseUrl}${withParams.startsWith('/') ? '' : '/'}${withParams}`;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    pathTemplate: string,
    body?: Record<string, unknown>,
    instanceName?: string
  ): Promise<T> {
    const url = this.buildEndpoint(pathTemplate, instanceName);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.apikey = this.apiKey;
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    let parsed = {} as T;

    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as T;
      } catch {
        parsed = { message: rawText } as T;
      }
    }

    if (!response.ok) {
      const details =
        typeof parsed === 'object' && parsed !== null && 'message' in parsed
          ? String((parsed as Record<string, unknown>).message)
          : rawText;
      throw new Error(`Revolution API retornou ${response.status}: ${details}`);
    }

    return parsed;
  }

  private getOrCreateMockInstance(instanceName: string): RevolutionInstanceMock {
    const existing = this.instances.get(instanceName);
    if (existing) {
      return existing;
    }

    const instance: RevolutionInstanceMock = {
      instanceName,
      status: 'disconnected',
      qrCode: this.buildQrCode(instanceName),
      pairingCode: this.buildPairingCode(instanceName),
      lastUpdateAt: new Date().toISOString(),
    };

    this.instances.set(instanceName, instance);
    return instance;
  }

  private normalizeStatus(rawStatus: unknown): RevolutionStatus {
    const status = String(rawStatus || '').toLowerCase();

    if (status.includes('open') || status.includes('connected')) return 'connected';
    if (status.includes('connect')) return 'connecting';
    if (status.includes('close') || status.includes('disconnect')) return 'disconnected';
    return 'error';
  }

  private getScopeStore(scope: EvolutionConfigScope): Map<string, Record<string, unknown>> {
    const existing = this.integrationConfigs.get(scope);
    if (existing) {
      return existing;
    }

    const created = new Map<string, Record<string, unknown>>();
    this.integrationConfigs.set(scope, created);
    return created;
  }

  private isInstanceNotFoundError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (
      message.includes('does not exist') ||
      message.includes('nao existe') ||
      message.includes('not found')
    );
  }

  async listInstances(): Promise<RevolutionInstanceMock[]> {
    if (this.mode !== 'mock') {
      const data = await this.request<unknown>('GET', this.endpoints.list);
      const list = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.instances ||
          (data as Record<string, unknown>)?.data ||
          [];

      if (!Array.isArray(list)) {
        return [];
      }

      return list.map((item) => {
        const parsed = item as Record<string, unknown>;
        const instanceName = this.normalizeInstanceName(parsed, '');
        const qrCode = this.extractQrCode(parsed.qrcode || parsed.qrCode || parsed.base64 || parsed.instance);
        const pairingCode = this.extractPairingCode(
          parsed.pairingCode || parsed.pairing_code || parsed.code || parsed.pin || parsed.instance
        );
        return {
          instanceName,
          status: this.normalizeStatus(
            parsed.status || parsed.connectionStatus || parsed.state || this.extractRecord(parsed.instance).state
          ) === 'error' && (qrCode || pairingCode) ? 'connecting' : this.normalizeStatus(
            parsed.status || parsed.connectionStatus || parsed.state || this.extractRecord(parsed.instance).state
          ),
          webhookUrl: parsed.webhookUrl ? String(parsed.webhookUrl) : undefined,
          phone: parsed.phone ? String(parsed.phone) : undefined,
          qrCode,
          pairingCode,
          lastUpdateAt: new Date().toISOString(),
        };
      });
    }

    return Array.from(this.instances.values());
  }

  async createInstance(payload: RevolutionInstancePayload): Promise<RevolutionInstanceMock> {
    if (this.mode !== 'mock') {
      const data = await this.request<Record<string, unknown>>('POST', this.endpoints.create, {
        instanceName: payload.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        token: this.apiKey || undefined,
        webhook: payload.webhookUrl || undefined,
      });

      return this.normalizeInstancePayload(data, payload.instanceName);
    }

    if (this.instances.has(payload.instanceName)) {
      throw new Error('Instancia ja existe na Revolution API');
    }

    const instance: RevolutionInstanceMock = {
      instanceName: payload.instanceName,
      status: 'disconnected',
      webhookUrl: payload.webhookUrl,
      phone: payload.phone,
      qrCode: this.buildQrCode(payload.instanceName),
      pairingCode: this.buildPairingCode(payload.instanceName),
      lastUpdateAt: new Date().toISOString(),
    };

    this.instances.set(payload.instanceName, instance);
    return instance;
  }

  async connectInstance(instanceName: string): Promise<RevolutionInstanceMock> {
    if (this.mode !== 'mock') {
      let result: Record<string, unknown>;

      try {
        result = await this.request<Record<string, unknown>>(
          'GET',
          this.endpoints.connect,
          undefined,
          instanceName
        );
      } catch (error) {
        if (!this.isInstanceNotFoundError(error)) {
          throw error;
        }

        await this.createInstance({ instanceName });
        result = await this.request<Record<string, unknown>>(
          'GET',
          this.endpoints.connect,
          undefined,
          instanceName
        );
      }

      return this.normalizeInstancePayload(result, instanceName);
    }

    const instance = this.getOrCreateMockInstance(instanceName);
    instance.status = 'connected';
    if (!instance.pairingCode) {
      instance.pairingCode = this.buildPairingCode(instanceName);
    }
    instance.lastUpdateAt = new Date().toISOString();
    this.instances.set(instanceName, instance);
    return instance;
  }

  async disconnectInstance(instanceName: string): Promise<RevolutionInstanceMock> {
    if (this.mode !== 'mock') {
      await this.request<unknown>('DELETE', this.endpoints.disconnect, undefined, instanceName);
      return {
        instanceName,
        status: 'disconnected',
        webhookUrl: undefined,
        phone: undefined,
        qrCode: '',
        pairingCode: '',
        lastUpdateAt: new Date().toISOString(),
      };
    }

    const instance = this.getOrCreateMockInstance(instanceName);
    instance.status = 'disconnected';
    instance.lastUpdateAt = new Date().toISOString();
    this.instances.set(instanceName, instance);
    return instance;
  }

  async restartInstance(instanceName: string): Promise<RevolutionInstanceMock> {
    if (this.mode !== 'mock') {
      return this.connectInstance(instanceName);
    }

    const instance = this.getOrCreateMockInstance(instanceName);
    instance.status = 'connecting';
    instance.lastUpdateAt = new Date().toISOString();
    this.instances.set(instanceName, instance);

    instance.status = 'connected';
    instance.lastUpdateAt = new Date().toISOString();
    this.instances.set(instanceName, instance);

    return instance;
  }

  async deleteInstance(instanceName: string): Promise<{ instanceName: string; deleted: boolean }> {
    if (this.mode !== 'mock') {
      await this.request<unknown>('DELETE', '/instance/delete/{instanceName}', undefined, instanceName);
      return { instanceName, deleted: true };
    }

    const deleted = this.instances.delete(instanceName);

    for (const [, store] of this.integrationConfigs) {
      store.delete(instanceName);
    }

    return { instanceName, deleted };
  }

  async setPresence(
    instanceName: string,
    presence: 'available' | 'unavailable'
  ): Promise<{ instanceName: string; presence: 'available' | 'unavailable'; updatedAt: string }> {
    const instance = this.getOrCreateMockInstance(instanceName);
    instance.status = presence === 'available' ? 'connected' : 'disconnected';
    instance.lastUpdateAt = new Date().toISOString();
    this.instances.set(instanceName, instance);

    return {
      instanceName,
      presence,
      updatedAt: instance.lastUpdateAt,
    };
  }

  async setScopedConfig(
    scope: EvolutionConfigScope,
    instanceName: string,
    payload: Record<string, unknown>
  ): Promise<{ instanceName: string; scope: EvolutionConfigScope; config: Record<string, unknown>; updatedAt: string }> {
    const store = this.getScopeStore(scope);
    const updatedAt = new Date().toISOString();

    store.set(instanceName, {
      ...payload,
      updatedAt,
    });

    return {
      instanceName,
      scope,
      config: store.get(instanceName) || {},
      updatedAt,
    };
  }

  async findScopedConfig(
    scope: EvolutionConfigScope,
    instanceName: string
  ): Promise<{ instanceName: string; scope: EvolutionConfigScope; config: Record<string, unknown> | null }> {
    const store = this.getScopeStore(scope);

    return {
      instanceName,
      scope,
      config: store.get(instanceName) || null,
    };
  }

  async getInstanceStatus(instanceName: string): Promise<Pick<RevolutionInstanceMock, 'instanceName' | 'status' | 'lastUpdateAt'>> {
    if (this.mode !== 'mock') {
      const data = await this.request<Record<string, unknown>>(
        'GET',
        this.endpoints.status,
        undefined,
        instanceName
      );

      const instanceData = (data.instance as Record<string, unknown> | undefined) || undefined;

      return {
        instanceName: this.normalizeInstanceName(instanceData || data, instanceName),
        status: this.normalizeStatus(
          data.status ||
          data.state ||
          data.connectionStatus ||
          instanceData?.state ||
          instanceData?.status
        ),
        lastUpdateAt: new Date().toISOString(),
      };
    }

    const instance = this.getOrCreateMockInstance(instanceName);
    return {
      instanceName: instance.instanceName,
      status: instance.status,
      lastUpdateAt: instance.lastUpdateAt,
    };
  }

  async getQrCode(instanceName: string): Promise<{ instanceName: string; qrCode: string; pairingCode: string }> {
    if (this.mode !== 'mock') {
      let data: Record<string, unknown>;

      try {
        data = await this.request<Record<string, unknown>>(
          'GET',
          this.endpoints.qrcode,
          undefined,
          instanceName
        );
      } catch (error) {
        if (!this.isInstanceNotFoundError(error)) {
          throw error;
        }

        const connected = await this.connectInstance(instanceName);
        if (connected.qrCode) {
          return {
            instanceName: connected.instanceName,
            qrCode: connected.qrCode,
            pairingCode: connected.pairingCode,
          };
        }

        data = await this.request<Record<string, unknown>>(
          'GET',
          this.endpoints.qrcode,
          undefined,
          instanceName
        );
      }

      return {
        instanceName: this.normalizeInstanceName(data.instance || data, instanceName),
        qrCode: this.extractQrCode(data.base64 || data.qrcode || data.qrCode || data.instance || data),
        pairingCode: this.extractPairingCode(data.pairingCode || data.pairing_code || data.code || data.pin || data.instance || data),
      };
    }

    const instance = this.getOrCreateMockInstance(instanceName);
    return {
      instanceName: instance.instanceName,
      qrCode: instance.qrCode,
      pairingCode: instance.pairingCode,
    };
  }

  async sendTextMessage(payload: RevolutionMessagePayload): Promise<RevolutionMessageResponse> {
    if (this.mode !== 'mock') {
      const data = await this.request<Record<string, unknown>>(
        'POST',
        this.endpoints.sendText,
        {
          number: payload.to,
          text: payload.text,
          options: {
            delay: 0,
            presence: 'composing',
          },
        },
        payload.instanceName
      );

      return {
        messageId: String(data.key || data.id || `msg_${Date.now()}`),
        status: 'sent',
        instanceName: payload.instanceName,
        to: payload.to,
        text: payload.text,
        sentAt: new Date().toISOString(),
      };
    }

    const instance = this.getOrCreateMockInstance(payload.instanceName);
    if (instance.status !== 'connected') {
      throw new Error('Instancia precisa estar conectada para enviar mensagens');
    }

    return {
      messageId: `msg_${Date.now()}`,
      status: 'sent',
      instanceName: payload.instanceName,
      to: payload.to,
      text: payload.text,
      sentAt: new Date().toISOString(),
    };
  }
}

export default new RevolutionService();
export type { EvolutionConfigScope };
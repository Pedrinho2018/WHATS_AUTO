import logger from '../utils';

export interface TypebotInboundInput {
  typebotUrl: string;
  typebotPublicId?: string | null;
  message: string;
  contactPhone: string;
  contactName?: string;
  companyId: number;
  ticketId: number;
  instanceName: string;
  sessionId?: string | null;
}

export interface TypebotDispatchResult {
  delivered: boolean;
  sessionId?: string | null;
  reason?: string;
}

class TypebotService {
  private resolveTypebotPublicId(typebotUrl: string, configuredId?: string | null): string | null {
    if (configuredId && configuredId.trim().length > 0) {
      return configuredId.trim();
    }

    const parsedUrl = new URL(typebotUrl);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    return pathParts[0] || null;
  }

  private buildBaseOrigin(typebotUrl: string): string {
    const parsedUrl = new URL(typebotUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  }

  private extractSessionId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const possibleValues = [
      record.sessionId,
      record.session_id,
      (record.result as Record<string, unknown> | undefined)?.sessionId,
      (record.result as Record<string, unknown> | undefined)?.session_id,
      (record.data as Record<string, unknown> | undefined)?.sessionId,
      (record.data as Record<string, unknown> | undefined)?.session_id,
    ];

    for (const value of possibleValues) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private async sendStartChat(
    baseOrigin: string,
    typebotId: string,
    input: TypebotInboundInput
  ): Promise<TypebotDispatchResult> {
    const endpoint = `${baseOrigin}/api/v1/typebots/${encodeURIComponent(typebotId)}/startChat`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input.message,
        isOnlyRegistering: false,
        prefilledVariables: {
          phone: input.contactPhone,
          name: input.contactName || '',
          companyId: String(input.companyId),
          ticketId: String(input.ticketId),
          instanceName: input.instanceName,
        },
      }),
    });

    if (!response.ok) {
      return {
        delivered: false,
        reason: `typebot_http_${response.status}`,
      };
    }

    const payload = (await response.json()) as unknown;
    return {
      delivered: true,
      sessionId: this.extractSessionId(payload),
    };
  }

  private async sendContinueChat(baseOrigin: string, sessionId: string, message: string): Promise<TypebotDispatchResult> {
    const endpoint = `${baseOrigin}/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      return {
        delivered: false,
        reason: `typebot_http_${response.status}`,
      };
    }

    const payload = (await response.json()) as unknown;
    return {
      delivered: true,
      sessionId: this.extractSessionId(payload) || sessionId,
    };
  }

  async dispatchInboundMessage(input: TypebotInboundInput): Promise<TypebotDispatchResult> {
    try {
      const baseOrigin = this.buildBaseOrigin(input.typebotUrl);

      if (input.sessionId) {
        const continued = await this.sendContinueChat(baseOrigin, input.sessionId, input.message);
        if (continued.delivered) {
          return continued;
        }
      }

      const typebotId = this.resolveTypebotPublicId(input.typebotUrl, input.typebotPublicId);
      if (!typebotId) {
        return {
          delivered: false,
          reason: 'missing_typebot_id',
        };
      }

      return await this.sendStartChat(baseOrigin, typebotId, input);
    } catch (error) {
      logger.warn('Falha ao despachar mensagem para Typebot', {
        error,
        typebotUrl: input.typebotUrl,
        ticketId: input.ticketId,
      });

      return {
        delivered: false,
        reason: 'typebot_exception',
      };
    }
  }
}

export default new TypebotService();
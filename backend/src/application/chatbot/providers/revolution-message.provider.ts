import revolutionService from '../../../services/revolution.service';
import operationalEventService from '../../../services/operational-event.service';
import { MessageProviderPort, SendTextInput, SendTextOutput } from './message-provider.port';

export default class RevolutionMessageProvider implements MessageProviderPort {
  async sendText(input: SendTextInput): Promise<SendTextOutput> {
    const maxAttempts = Number(process.env.MESSAGE_SEND_MAX_ATTEMPTS || 3);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await revolutionService.sendTextMessage({
          instanceName: input.instanceName,
          to: input.to,
          text: input.text,
        });

        return {
          messageId: result.messageId,
          text: result.text,
          status: result.status,
          sentAt: result.sentAt,
        };
      } catch (error) {
        lastError = error;

        await operationalEventService.record({
          eventType: attempt < maxAttempts ? 'message_send_retry' : 'message_send_failed',
          status: attempt < maxAttempts ? 'warning' : 'error',
          source: 'revolution-message-provider',
          detail: `Tentativa ${attempt}/${maxAttempts} de envio falhou`,
          metadata: {
            instanceName: input.instanceName,
            to: input.to,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Falha ao enviar mensagem');
  }
}

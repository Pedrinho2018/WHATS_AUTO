import revolutionService from '../../../services/revolution.service';
import { MessageProviderPort, SendTextInput, SendTextOutput } from './message-provider.port';

export default class RevolutionMessageProvider implements MessageProviderPort {
  async sendText(input: SendTextInput): Promise<SendTextOutput> {
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
  }
}

export type SendTextInput = {
  instanceName: string;
  to: string;
  text: string;
};

export type SendTextOutput = {
  messageId: string;
  text: string;
  status: string;
  sentAt: string;
};

export interface MessageProviderPort {
  sendText(input: SendTextInput): Promise<SendTextOutput>;
}

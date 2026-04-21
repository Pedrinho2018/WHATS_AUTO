import { ParsedInbound } from './contracts';

export default class InboundMessageParser {
  parse(body: Record<string, unknown>): ParsedInbound | null {
    const data = (body.data as Record<string, unknown> | undefined) || body;
    const key = (data.key as Record<string, unknown> | undefined) || {};
    const message = (data.message as Record<string, unknown> | undefined) || {};

    const fromMe = Boolean(key.fromMe || data.fromMe);
    const remoteJid = String(key.remoteJid || data.remoteJid || '');

    if (!remoteJid || remoteJid.includes('@g.us')) {
      return null;
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!phone) {
      return null;
    }

    const text = String(
      message.conversation ||
        ((message.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ||
        ((message.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ||
        ((message.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ||
        data.body ||
        ''
    ).trim();

    const instanceName = String(body.instance || body.instanceName || data.instanceName || '');

    return {
      instanceName,
      fromMe,
      remoteJid,
      phone,
      pushName: String(data.pushName || data.pushname || '').trim() || undefined,
      text,
      externalMessageId: String(key.id || data.id || '').trim() || undefined,
    };
  }
}

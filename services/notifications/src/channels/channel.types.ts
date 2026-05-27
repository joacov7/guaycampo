// Shared types for all notification channels

export interface ChannelResult {
  externalId: string;
  status: 'sent' | 'queued' | 'failed';
}

export interface WhatsAppProvider {
  sendMessage(phone: string, text: string, mediaUrl?: string): Promise<ChannelResult>;
  sendDocument(phone: string, documentUrl: string, filename: string): Promise<ChannelResult>;
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

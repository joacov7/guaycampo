/**
 * Evolution API provider for WhatsApp Business messages.
 * Self-hosted, open-source: https://github.com/EvolutionAPI/evolution-api
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { WhatsAppProvider, ChannelResult } from '../channel.types';

interface EvolutionMessageResponse {
  key?: { id?: string };
  status?: string;
}

@Injectable()
export class EvolutionProvider implements WhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);
  private readonly baseUrl: string;
  private readonly instanceName: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    this.instanceName = config.get<string>('EVOLUTION_INSTANCE', 'guaycampo');
    this.apiKey = config.get<string>('EVOLUTION_API_KEY', '');
  }

  async sendMessage(phone: string, text: string, mediaUrl?: string): Promise<ChannelResult> {
    if (mediaUrl) {
      const response = await axios.post<EvolutionMessageResponse>(
        `${this.baseUrl}/message/sendMedia/${this.instanceName}`,
        {
          number: phone,
          mediatype: this.detectMediaType(mediaUrl),
          media: mediaUrl,
          caption: text,
        },
        { headers: { apikey: this.apiKey } },
      );
      this.logger.debug(`Evolution sendMedia response for ${phone}: ${response.status}`);
      return { externalId: response.data.key?.id ?? '', status: 'sent' };
    }

    const response = await axios.post<EvolutionMessageResponse>(
      `${this.baseUrl}/message/sendText/${this.instanceName}`,
      { number: phone, text },
      { headers: { apikey: this.apiKey } },
    );
    this.logger.debug(`Evolution sendText response for ${phone}: ${response.status}`);
    return { externalId: response.data.key?.id ?? '', status: 'sent' };
  }

  async sendDocument(
    phone: string,
    documentUrl: string,
    filename: string,
  ): Promise<ChannelResult> {
    const response = await axios.post<EvolutionMessageResponse>(
      `${this.baseUrl}/message/sendMedia/${this.instanceName}`,
      {
        number: phone,
        mediatype: 'document',
        media: documentUrl,
        fileName: filename,
      },
      { headers: { apikey: this.apiKey } },
    );
    return { externalId: response.data.key?.id ?? '', status: 'sent' };
  }

  private detectMediaType(url: string): string {
    if (/\.pdf$/i.test(url)) return 'document';
    if (/\.(jpg|jpeg|png|webp)$/i.test(url)) return 'image';
    if (/\.(mp4|avi|mov)$/i.test(url)) return 'video';
    return 'document';
  }
}

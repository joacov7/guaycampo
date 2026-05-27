import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvolutionProvider } from './evolution.provider';
import { TwilioProvider } from './twilio.provider';
import type { ChannelResult, WhatsAppProvider } from '../channel.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: WhatsAppProvider;

  constructor(
    private readonly evolutionProvider: EvolutionProvider,
    private readonly twilioProvider: TwilioProvider,
    private readonly config: ConfigService,
  ) {
    this.provider =
      config.get<string>('WHATSAPP_PROVIDER') === 'twilio'
        ? twilioProvider
        : evolutionProvider;
  }

  async send(phone: string, message: string, mediaUrl?: string): Promise<ChannelResult> {
    const normalizedPhone = this.normalizeArgentinePhone(phone);
    this.logger.debug(`Sending WhatsApp to ${normalizedPhone}`);
    return this.provider.sendMessage(normalizedPhone, message, mediaUrl);
  }

  async sendDocument(
    phone: string,
    documentUrl: string,
    filename: string,
  ): Promise<ChannelResult> {
    const normalizedPhone = this.normalizeArgentinePhone(phone);
    this.logger.debug(`Sending WhatsApp document to ${normalizedPhone}: ${filename}`);
    return this.provider.sendDocument(normalizedPhone, documentUrl, filename);
  }

  /**
   * Normalizes Argentine phone numbers to E.164 format (+549XXXXXXXXXX).
   *
   * Argentina country code: 54
   * Mobile prefix for WhatsApp: 549 (adds 9 between country code and area code)
   *
   * Examples:
   *   1123456789    (10 digits)  → +5491123456789
   *   01123456789   (11 digits, starts with 0) → +5491123456789
   *   5491123456789 (starts with 549) → +5491123456789
   *   541123456789  (starts with 54) → +5491123456789
   */
  normalizeArgentinePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Already has +549 prefix
    if (cleaned.startsWith('549') && cleaned.length >= 12) return `+${cleaned}`;

    // Has 54 country code but missing mobile 9
    if (cleaned.startsWith('54') && cleaned.length >= 11) {
      const withoutCountry = cleaned.slice(2);
      return `+549${withoutCountry}`;
    }

    // 11 digits starting with 0 (local format with leading 0)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `+549${cleaned.slice(1)}`;
    }

    // 10 digits (area code + number, no country code)
    if (cleaned.length === 10) return `+549${cleaned}`;

    // Fallback: prepend +549
    return `+549${cleaned}`;
  }
}

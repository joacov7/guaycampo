/**
 * Twilio provider for WhatsApp Business messages (fallback to Evolution API).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WhatsAppProvider, ChannelResult } from '../channel.types';

@Injectable()
export class TwilioProvider implements WhatsAppProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(private readonly config: ConfigService) {
    this.accountSid = config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = config.get<string>('TWILIO_WHATSAPP_FROM', '');
  }

  async sendMessage(phone: string, text: string, _mediaUrl?: string): Promise<ChannelResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: `whatsapp:${phone}`,
      Body: text,
    });

    if (_mediaUrl) {
      body.append('MediaUrl', _mediaUrl);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio WhatsApp error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { sid?: string };
    this.logger.debug(`Twilio WhatsApp sent to ${phone}: ${data.sid}`);
    return { externalId: data.sid ?? '', status: 'sent' };
  }

  async sendDocument(phone: string, documentUrl: string, _filename: string): Promise<ChannelResult> {
    // Twilio WhatsApp sends documents via MediaUrl
    return this.sendMessage(phone, '', documentUrl);
  }
}

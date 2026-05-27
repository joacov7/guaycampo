/**
 * SMS notification service via Twilio.
 * Used as last-resort fallback when WhatsApp and push are unavailable.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChannelResult } from '../channel.types';

interface TwilioMessageResponse {
  sid?: string;
  status?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(config: ConfigService) {
    this.accountSid = config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = config.get<string>('TWILIO_SMS_FROM', '');
  }

  async send(phone: string, message: string): Promise<ChannelResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      this.logger.warn('SMS skipped: Twilio credentials not configured');
      return { externalId: '', status: 'failed' };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: this.fromNumber,
      To: phone,
      Body: message,
    });

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
      throw new Error(`Twilio SMS error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as TwilioMessageResponse;
    this.logger.debug(`SMS sent to ${phone}: ${data.sid}`);
    return { externalId: data.sid ?? '', status: 'sent' };
  }
}

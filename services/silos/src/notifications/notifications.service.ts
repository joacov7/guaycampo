import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SiloAlertNotificationData {
  phone: string;
  siloName: string;
  alertMessage: string;
  severity: string;
  triggeredAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly provider: string;
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;
  private readonly evolutionInstance: string;
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioFromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('WHATSAPP_PROVIDER', 'evolution');
    this.evolutionApiUrl = this.configService.get<string>(
      'EVOLUTION_API_URL',
      'http://localhost:8080',
    );
    this.evolutionApiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.evolutionInstance = this.configService.get<string>(
      'EVOLUTION_INSTANCE',
      'guaycampo',
    );
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');
  }

  async sendSiloAlert(data: SiloAlertNotificationData): Promise<void> {
    const severityEmoji: Record<string, string> = {
      warning: '⚠️',
      critical: '🚨',
      emergency: '🆘',
      info: 'ℹ️',
    };
    const emoji = severityEmoji[data.severity] ?? '⚠️';

    const message =
      `${emoji} *Alerta de Silo - GuayCampo*\n\n` +
      `*Silo:* ${data.siloName}\n` +
      `*Severidad:* ${data.severity.toUpperCase()}\n` +
      `*Mensaje:* ${data.alertMessage}\n` +
      `*Hora:* ${data.triggeredAt}\n\n` +
      `_Por favor verificar el estado del silo inmediatamente._`;

    await this.sendMessage(data.phone, message);
  }

  private async sendMessage(phone: string, message: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.provider === 'twilio') {
          await this.sendViaTwilio(normalizedPhone, message);
        } else {
          await this.sendViaEvolution(normalizedPhone, message);
        }
        this.logger.log(`WhatsApp sent to ${normalizedPhone} [attempt ${attempt}]`);
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `WhatsApp send failed (attempt ${attempt}/${maxRetries}) to ${normalizedPhone}: ${String(err)}`,
        );
        if (attempt < maxRetries) {
          await this.sleep(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    this.logger.error(
      `WhatsApp send permanently failed after ${maxRetries} attempts to ${normalizedPhone}: ${String(lastError)}`,
    );
  }

  private async sendViaEvolution(phone: string, message: string): Promise<void> {
    const url = `${this.evolutionApiUrl}/message/sendText/${this.evolutionInstance}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.evolutionApiKey,
      },
      body: JSON.stringify({ number: phone, text: message }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Evolution API error ${response.status}: ${body}`);
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
    const credentials = Buffer.from(
      `${this.twilioAccountSid}:${this.twilioAuthToken}`,
    ).toString('base64');

    const body = new URLSearchParams({
      From: `whatsapp:${this.twilioFromNumber}`,
      To: `whatsapp:${phone}`,
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
      const text = await response.text();
      throw new Error(`Twilio error ${response.status}: ${text}`);
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) return `54${digits.substring(1)}`;
    if (!digits.startsWith('54')) return `54${digits}`;
    return digits;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

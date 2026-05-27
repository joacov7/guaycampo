import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShiftConfirmationData {
  phone: string;
  driverName: string;
  shiftDate: string;
  timeFrom: string;
  commodity: string;
  qrCodeUrl: string;
  shiftNumber: string;
}

export interface QueuePositionData {
  phone: string;
  driverName: string;
  plate: string;
  position: number;
  estimatedWaitMin: number;
}

export interface DriverCalledData {
  phone: string;
  driverName: string;
  plate: string;
  scaleNumber?: string;
}

export interface TicketReadyData {
  phone: string;
  driverName: string;
  ticketNumber: string;
  netWeightKg: number;
  pdfUrl?: string;
}

export interface ShiftReminderData {
  phone: string;
  driverName: string;
  hoursUntil: number;
  shiftDate: string;
  timeFrom: string;
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
    this.evolutionApiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    this.evolutionApiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.evolutionInstance = this.configService.get<string>('EVOLUTION_INSTANCE', 'guaycampo');
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.twilioFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');
  }

  async sendShiftConfirmation(data: ShiftConfirmationData): Promise<void> {
    const message =
      `✅ *Turno confirmado - GuayCampo*\n\n` +
      `Hola *${data.driverName}*,\n\n` +
      `Tu turno ha sido asignado:\n` +
      `📅 Fecha: *${data.shiftDate}*\n` +
      `🕐 Horario: *${data.timeFrom}*\n` +
      `🌾 Mercadería: *${data.commodity}*\n` +
      `🔢 N° de turno: *${data.shiftNumber}*\n\n` +
      `Tu código QR: ${data.qrCodeUrl}\n\n` +
      `_Presentá este código al llegar a la planta._`;

    await this.sendMessage(data.phone, message);
  }

  async sendQueuePosition(data: QueuePositionData): Promise<void> {
    const message =
      `🚛 *Ingreso registrado - GuayCampo*\n\n` +
      `Hola *${data.driverName}*,\n\n` +
      `Tu camión *${data.plate}* fue registrado.\n\n` +
      `📍 Posición en cola: *#${data.position}*\n` +
      `⏱ Tiempo estimado de espera: *${data.estimatedWaitMin} minutos*\n\n` +
      `_Te avisaremos cuando sea tu turno._`;

    await this.sendMessage(data.phone, message);
  }

  async sendDriverCalled(data: DriverCalledData): Promise<void> {
    const scaleText = data.scaleNumber ? ` en *${data.scaleNumber}*` : '';
    const message =
      `🔔 *¡Es tu turno! - GuayCampo*\n\n` +
      `Hola *${data.driverName}*,\n\n` +
      `El camión *${data.plate}* fue llamado a báscula${scaleText}.\n\n` +
      `_Por favor dirigite a la báscula inmediatamente._`;

    await this.sendMessage(data.phone, message);
  }

  async sendTicketReady(data: TicketReadyData): Promise<void> {
    const pdfText = data.pdfUrl ? `\n📄 Ticket PDF: ${data.pdfUrl}` : '';
    const message =
      `📊 *Ticket listo - GuayCampo*\n\n` +
      `Hola *${data.driverName}*,\n\n` +
      `Tu ticket de balanza está completo:\n` +
      `🎫 N° de ticket: *${data.ticketNumber}*\n` +
      `⚖️ Peso neto: *${data.netWeightKg.toLocaleString('es-AR')} kg*` +
      pdfText +
      `\n\n_Gracias por operar con GuayCampo._`;

    await this.sendMessage(data.phone, message);
  }

  async sendShiftReminder(data: ShiftReminderData): Promise<void> {
    const timeText =
      data.hoursUntil >= 1
        ? `en *${data.hoursUntil} ${data.hoursUntil === 1 ? 'hora' : 'horas'}*`
        : 'en *menos de 1 hora*';

    const message =
      `⏰ *Recordatorio de turno - GuayCampo*\n\n` +
      `Hola *${data.driverName}*,\n\n` +
      `Tenés un turno programado ${timeText}.\n\n` +
      `📅 Fecha: *${data.shiftDate}*\n` +
      `🕐 Horario: *${data.timeFrom}*\n\n` +
      `_Recordá tener tu QR listo al llegar._`;

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
          // Exponential backoff: 1s, 2s, 4s
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
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
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
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');
    // Argentina: ensure it starts with 54
    if (digits.startsWith('0')) {
      return `54${digits.substring(1)}`;
    }
    if (!digits.startsWith('54')) {
      return `54${digits}`;
    }
    return digits;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

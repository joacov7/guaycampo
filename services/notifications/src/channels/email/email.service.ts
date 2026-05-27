/**
 * Email notification service.
 * Uses Resend if RESEND_API_KEY is configured, falls back to SMTP via Nodemailer.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { ChannelResult, Attachment } from '../channel.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(
    to: string,
    subject: string,
    html: string,
    attachments?: Attachment[],
  ): Promise<ChannelResult> {
    if (process.env.RESEND_API_KEY) {
      return this.sendWithResend(to, subject, html, attachments);
    }
    return this.sendWithSmtp(to, subject, html, attachments);
  }

  private async sendWithResend(
    to: string,
    subject: string,
    html: string,
    attachments?: Attachment[],
  ): Promise<ChannelResult> {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromDomain = process.env.EMAIL_DOMAIN ?? 'guaycampo.com';

    const result = await resend.emails.send({
      from: `GuayCampo <noreply@${fromDomain}>`,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content instanceof Buffer ? a.content : Buffer.from(a.content),
      })),
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    this.logger.debug(`Email sent via Resend to ${to}: ${result.data?.id}`);
    return { externalId: result.data?.id ?? '', status: 'sent' };
  }

  private async sendWithSmtp(
    to: string,
    subject: string,
    html: string,
    attachments?: Attachment[],
  ): Promise<ChannelResult> {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });

    const fromDomain = process.env.EMAIL_DOMAIN ?? 'guaycampo.com';
    const info = await transporter.sendMail({
      from: `GuayCampo <noreply@${fromDomain}>`,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    this.logger.debug(`Email sent via SMTP to ${to}: ${info.messageId}`);
    return { externalId: info.messageId as string, status: 'sent' };
  }
}

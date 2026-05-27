import { Injectable, NotFoundException } from '@nestjs/common';
import { turnoConfirmadoTemplate } from './templates/whatsapp/turno-confirmado';
import { posicionColaTemplate } from './templates/whatsapp/posicion-cola';
import { conductorLlamadoTemplate } from './templates/whatsapp/conductor-llamado';
import { ticketListoTemplate } from './templates/whatsapp/ticket-listo';
import { recordatorioTurnoTemplate } from './templates/whatsapp/recordatorio-turno';
import { alertaSiloTemplate } from './templates/whatsapp/alerta-silo';
import { liquidacionEmitidaTemplate } from './templates/email/liquidacion-emitida';
import { turnoConfirmadoEmailTemplate } from './templates/email/turno-confirmado';
import { bienvenidaEmailTemplate } from './templates/email/bienvenida';

export interface NotificationTemplate {
  id: string;
  whatsapp?: string;
  sms?: string;
  html?: string;
  subject?: string;
  pushTitle?: string;
  pushBody?: string;
}

export interface RenderedTemplate {
  message: string;
  html?: string;
  subject?: string;
  pushTitle?: string;
  pushBody?: string;
}

const TEMPLATES: Record<string, NotificationTemplate> = {
  [turnoConfirmadoTemplate.id]: turnoConfirmadoTemplate,
  [posicionColaTemplate.id]: posicionColaTemplate,
  [conductorLlamadoTemplate.id]: conductorLlamadoTemplate,
  [ticketListoTemplate.id]: ticketListoTemplate,
  [recordatorioTurnoTemplate.id]: recordatorioTurnoTemplate,
  [alertaSiloTemplate.id]: alertaSiloTemplate,
  [liquidacionEmitidaTemplate.id]: liquidacionEmitidaTemplate,
  [turnoConfirmadoEmailTemplate.id]: turnoConfirmadoEmailTemplate,
  [bienvenidaEmailTemplate.id]: bienvenidaEmailTemplate,
};

@Injectable()
export class TemplatesService {
  /**
   * Render a template by ID with the given data variables.
   * Uses {{variableName}} interpolation syntax.
   */
  render(templateId: string, data: Record<string, unknown>): RenderedTemplate {
    const template = this.getTemplate(templateId);
    if (!template) throw new NotFoundException(`Template '${templateId}' not found`);

    const message = this.interpolate(template.whatsapp ?? template.sms ?? '', data);
    const html = template.html ? this.interpolate(template.html, data) : undefined;
    const subject = template.subject ? this.interpolate(template.subject, data) : undefined;
    const pushTitle = template.pushTitle ? this.interpolate(template.pushTitle, data) : undefined;
    const pushBody = template.pushBody ? this.interpolate(template.pushBody, data) : undefined;

    return { message, html, subject, pushTitle, pushBody };
  }

  /** List all available templates. */
  listTemplates(): Array<{ id: string; channels: string[] }> {
    return Object.values(TEMPLATES).map((t) => ({
      id: t.id,
      channels: [
        ...(t.whatsapp ? ['whatsapp'] : []),
        ...(t.sms ? ['sms'] : []),
        ...(t.html ? ['email'] : []),
        ...(t.pushTitle ? ['push'] : []),
      ],
    }));
  }

  /** Get raw template definition by ID. */
  getTemplate(id: string): NotificationTemplate | null {
    return TEMPLATES[id] ?? null;
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(data[key] ?? ''));
  }
}

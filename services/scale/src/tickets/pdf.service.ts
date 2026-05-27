// =============================================================================
// GuayCampo - PDF Service
// Generates scale ticket PDF using PDFKit.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ScaleTicket, Vehicle, Driver, Client } from '@prisma/client';

// Ticket with all relations needed for the PDF
export interface ScaleTicketForPdf extends ScaleTicket {
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  client?: Client | null;
  commodity?: { name: string; code: string } | null;
  truckShift?: {
    shift?: { date: Date; operationType: string } | null;
    cpeNumber?: string | null;
  } | null;
}

const BRAND_COLOR = '#1a7f4f';
const TEXT_PRIMARY = '#1a1a2e';
const TEXT_SECONDARY = '#666666';
const ROW_BG_LIGHT = '#f8f9fa';
const BORDER_COLOR = '#dee2e6';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateScaleTicket(ticket: ScaleTicketForPdf): Promise<Buffer> {
    this.logger.debug(`Generating PDF for ticket ${ticket.ticketNumber}`);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderDocument(doc, ticket);
      doc.end();
    });
  }

  // ---------------------------------------------------------------------------
  // Document rendering
  // ---------------------------------------------------------------------------

  private renderDocument(doc: PDFKit.PDFDocument, ticket: ScaleTicketForPdf): void {
    this.renderHeader(doc, ticket);
    this.renderSeparator(doc);
    this.renderInfoGrid(doc, ticket);
    this.renderSeparator(doc);
    this.renderWeightsSection(doc, ticket);
    this.renderSeparator(doc);
    this.renderFooter(doc, ticket);
  }

  // Header — brand + ticket number
  private renderHeader(doc: PDFKit.PDFDocument, ticket: ScaleTicketForPdf): void {
    // Brand name
    doc
      .fontSize(22)
      .fillColor(BRAND_COLOR)
      .font('Helvetica-Bold')
      .text('GuayCampo', 40, 40, { continued: false });

    doc
      .fontSize(10)
      .fillColor(TEXT_SECONDARY)
      .font('Helvetica')
      .text('Sistema de Gestión de Granos', 40, 68);

    // Ticket number (top-right)
    doc
      .fontSize(12)
      .fillColor(TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text(`Ticket N° ${ticket.ticketNumber}`, 40, 40, { align: 'right' });

    doc
      .fontSize(10)
      .fillColor(TEXT_SECONDARY)
      .font('Helvetica')
      .text(
        `Fecha: ${this.formatDate(ticket.createdAt)}`,
        40,
        58,
        { align: 'right' },
      );

    doc
      .fontSize(14)
      .fillColor(BRAND_COLOR)
      .font('Helvetica-Bold')
      .text('TICKET DE BALANZA', 40, 95, { align: 'center' });

    doc.moveDown(0.5);
  }

  // 2-column grid with vehicle / client / commodity info
  private renderInfoGrid(doc: PDFKit.PDFDocument, ticket: ScaleTicketForPdf): void {
    const startY = doc.y + 10;
    const colW = 250;
    const leftX = 40;
    const rightX = 310;

    // Left column
    this.renderField(doc, 'Patente', ticket.plateConfirmed ?? ticket.plateDetected ?? '—', leftX, startY);
    this.renderField(doc, 'Chofer', ticket.driver?.fullName ?? '—', leftX, doc.y + 4);
    this.renderField(doc, 'Tipo de Vehículo', ticket.vehicle?.vehicleType ?? '—', leftX, doc.y + 4);

    // Right column
    this.renderField(doc, 'Cliente / Productor', ticket.client?.name ?? '—', rightX, startY);
    this.renderField(doc, 'CUIT', ticket.client?.cuit ?? '—', rightX, startY + 28);
    this.renderField(doc, 'Cultivo', ticket.commodity?.name ?? '—', rightX, startY + 56);

    if (ticket.truckShift?.cpeNumber) {
      doc.moveDown(0.3);
      this.renderField(doc, 'N° CPE', ticket.truckShift.cpeNumber, leftX, doc.y);
    }

    doc.moveDown(0.5);
  }

  // Weights section — the most important visual element
  private renderWeightsSection(doc: PDFKit.PDFDocument, ticket: ScaleTicketForPdf): void {
    const startY = doc.y + 10;

    doc
      .fontSize(13)
      .fillColor(TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text('PESOS', 40, startY);

    const tableY = startY + 24;
    const rowH = 28;
    const colLabelX = 40;
    const colValueX = 350;

    // Gross weight
    this.renderWeightRow(
      doc,
      'Peso Bruto',
      ticket.grossWeight ? this.formatKg(Number(ticket.grossWeight)) : '—',
      tableY,
      false,
    );
    if (ticket.grossAt) {
      doc
        .fontSize(8)
        .fillColor(TEXT_SECONDARY)
        .font('Helvetica')
        .text(`  ${this.formatDateTime(ticket.grossAt)}`, colValueX + 60, tableY + 6);
    }

    // Tare weight
    this.renderWeightRow(
      doc,
      'Tara',
      ticket.tareWeight ? this.formatKg(Number(ticket.tareWeight)) : '—',
      tableY + rowH,
      false,
    );

    // Net weight — highlighted
    this.renderNetWeightRow(
      doc,
      ticket.netWeight ? this.formatKg(Number(ticket.netWeight)) : '—',
      tableY + rowH * 2,
    );

    doc.moveDown(0.5);
  }

  private renderWeightRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    y: number,
    highlight: boolean,
  ): void {
    if (highlight) {
      doc.rect(40, y, 515, 28).fill(ROW_BG_LIGHT).fillColor(TEXT_PRIMARY);
    }
    doc
      .fontSize(11)
      .fillColor(TEXT_PRIMARY)
      .font('Helvetica')
      .text(label, 50, y + 8);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(value, 350, y + 8, { width: 200, align: 'right' });
  }

  private renderNetWeightRow(doc: PDFKit.PDFDocument, value: string, y: number): void {
    // Highlighted background for net weight
    doc.rect(40, y, 515, 34).fill(BRAND_COLOR);

    doc
      .fontSize(13)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('PESO NETO', 50, y + 10);

    doc
      .fontSize(16)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text(value, 350, y + 8, { width: 200, align: 'right' });

    doc.fillColor(TEXT_PRIMARY);
    doc.moveDown(1.2);
  }

  private renderFooter(doc: PDFKit.PDFDocument, ticket: ScaleTicketForPdf): void {
    const footerY = doc.page.height - 80;

    doc
      .fontSize(8)
      .fillColor(TEXT_SECONDARY)
      .font('Helvetica')
      .text(
        `Estado: ${ticket.status.toUpperCase()}  |  Generado: ${this.formatDateTime(new Date())}`,
        40,
        footerY,
        { align: 'center' },
      );

    doc.text(
      'GuayCampo — Sistema de Gestión de Granos  •  www.guaycampo.com',
      40,
      footerY + 14,
      { align: 'center' },
    );

    // Status badge
    if (ticket.status === 'completado') {
      doc
        .fontSize(10)
        .fillColor(BRAND_COLOR)
        .font('Helvetica-Bold')
        .text('✓ PESAJE FINALIZADO', 40, footerY - 20, { align: 'right' });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private renderSeparator(doc: PDFKit.PDFDocument): void {
    doc
      .strokeColor(BORDER_COLOR)
      .lineWidth(0.5)
      .moveTo(40, doc.y + 6)
      .lineTo(555, doc.y + 6)
      .stroke();
    doc.moveDown(0.8);
  }

  private renderField(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
  ): void {
    doc
      .fontSize(8)
      .fillColor(TEXT_SECONDARY)
      .font('Helvetica')
      .text(label.toUpperCase(), x, y);

    doc
      .fontSize(10)
      .fillColor(TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text(value, x, y + 12, { width: 240 });
  }

  private formatKg(value: number): string {
    return `${value.toLocaleString('es-AR')} kg`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AccountStatement } from '../account/account.service';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceType: string;
  issueDate: Date;
  dueDate?: Date;
  tenantName: string;
  tenantCuit: string;
  tenantAddress?: string;
  clientName: string;
  clientCuit: string;
  clientAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    ivaRate: number;
    subtotal: number;
  }>;
  subtotal: number;
  ivaAmount: number;
  ivaRate: number;
  total: number;
  cae?: string;
  caeExpiry?: Date;
  notes?: string;
  currency?: string;
}

export interface LiquidationPdfData {
  liquidationNumber: string;
  issueDate: Date;
  periodFrom: Date;
  periodTo: Date;
  tenantName: string;
  tenantCuit: string;
  tenantAddress?: string;
  clientName: string;
  clientCuit: string;
  commodityName: string;
  items: Array<{
    ticketNumber: string;
    date: Date;
    grossKg: number;
    tare: number;
    netKg: number;
    adjustment: number;
    adjustedKg: number;
    unitPrice: number;
    amount: number;
    humidity?: number;
    grade?: string;
  }>;
  totalGrossKg: number;
  totalNetKg: number;
  basePrice: number;
  grossAmount: number;
  commission: number;
  storageFee: number;
  retentionIva: number;
  retentionIibb: number;
  retentionGcias: number;
  totalToPay: number;
  currency?: string;
  notes?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.renderInvoiceHeader(doc, data);
        this.renderInvoiceParties(doc, data);
        this.renderInvoiceItems(doc, data);
        this.renderInvoiceTotals(doc, data);
        if (data.cae) {
          this.renderCaeBox(doc, data);
        }
        if (data.notes) {
          doc.moveDown().fontSize(9).text(`Observaciones: ${data.notes}`);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateLiquidationPdf(data: LiquidationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.renderLiquidationHeader(doc, data);
        this.renderLiquidationParties(doc, data);
        this.renderLiquidationItems(doc, data);
        this.renderLiquidationTotals(doc, data);
        if (data.notes) {
          doc.moveDown().fontSize(9).text(`Observaciones: ${data.notes}`);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderInvoiceHeader(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
    const typeLabel = data.invoiceType;

    // Left: company info
    doc.fontSize(16).font('Helvetica-Bold').text(data.tenantName, 50, 50);
    doc.fontSize(10).font('Helvetica').text(`CUIT: ${data.tenantCuit}`);
    if (data.tenantAddress) doc.text(data.tenantAddress);

    // Center: invoice type box
    doc
      .rect(240, 45, 115, 60)
      .stroke()
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(typeLabel, 242, 55, { width: 111, align: 'center' });

    // Right: invoice number & date
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`N° ${data.invoiceNumber}`, 370, 50)
      .fontSize(10)
      .text(`Fecha: ${format(data.issueDate, 'dd/MM/yyyy')}`, 370, 68);
    if (data.dueDate) {
      doc.text(`Vence: ${format(data.dueDate, 'dd/MM/yyyy')}`, 370, 84);
    }

    doc.moveTo(50, 120).lineTo(545, 120).stroke();
    doc.moveDown();
  }

  private renderInvoiceParties(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
    doc.y = 135;
    doc.fontSize(10).font('Helvetica-Bold').text('Receptor:');
    doc
      .font('Helvetica')
      .text(`Razón Social: ${data.clientName}`)
      .text(`CUIT: ${data.clientCuit}`);
    if (data.clientAddress) doc.text(`Domicilio: ${data.clientAddress}`);
    doc.moveDown();
  }

  private renderInvoiceItems(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
    const tableTop = doc.y + 10;
    const col = { desc: 50, qty: 300, price: 360, iva: 430, sub: 475 };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Descripción', col.desc, tableTop);
    doc.text('Cant.', col.qty, tableTop);
    doc.text('P. Unit.', col.price, tableTop);
    doc.text('IVA%', col.iva, tableTop);
    doc.text('Subtotal', col.sub, tableTop);

    doc
      .moveTo(50, tableTop + 14)
      .lineTo(545, tableTop + 14)
      .stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9);

    for (const item of data.items) {
      doc.text(item.description, col.desc, y, { width: 240 });
      doc.text(item.quantity.toFixed(2), col.qty, y);
      doc.text(this.formatCurrency(item.unitPrice, data.currency), col.price, y);
      doc.text(`${item.ivaRate}%`, col.iva, y);
      doc.text(this.formatCurrency(item.subtotal, data.currency), col.sub, y);
      y += 20;
    }

    doc.moveTo(50, y).lineTo(545, y).stroke();
    doc.y = y + 5;
  }

  private renderInvoiceTotals(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
    const x = 380;
    let y = doc.y + 10;

    doc.fontSize(9).font('Helvetica');
    doc.text('Neto gravado:', x, y);
    doc.text(this.formatCurrency(data.subtotal, data.currency), 490, y, { align: 'right' });
    y += 16;

    doc.text(`IVA ${data.ivaRate}%:`, x, y);
    doc.text(this.formatCurrency(data.ivaAmount, data.currency), 490, y, { align: 'right' });
    y += 16;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL:', x, y);
    doc.text(this.formatCurrency(data.total, data.currency), 490, y, { align: 'right' });
  }

  private renderCaeBox(doc: PDFKit.PDFDocument, data: InvoicePdfData): void {
    const y = doc.y + 30;
    doc
      .rect(50, y, 495, 40)
      .dash(3, { space: 2 })
      .stroke()
      .undash();

    doc.fontSize(8).font('Helvetica').text(
      `CAE: ${data.cae ?? ''}   Vto. CAE: ${data.caeExpiry ? format(data.caeExpiry, 'dd/MM/yyyy') : ''}`,
      55,
      y + 8,
    );
    doc.text('Este comprobante fue generado mediante AFIP — Web Service Factura Electrónica', 55, y + 22);
  }

  private renderLiquidationHeader(doc: PDFKit.PDFDocument, data: LiquidationPdfData): void {
    doc.fontSize(16).font('Helvetica-Bold').text('LIQUIDACIÓN DE GRANOS', 50, 50);
    doc.fontSize(12).font('Helvetica').text(data.tenantName, 50, 75);
    doc.text(`CUIT: ${data.tenantCuit}`);
    if (data.tenantAddress) doc.text(data.tenantAddress);

    doc.fontSize(10).text(`N° ${data.liquidationNumber}`, 400, 50);
    doc.text(`Fecha: ${format(data.issueDate, 'dd/MM/yyyy')}`, 400, 66);
    doc.text(
      `Período: ${format(data.periodFrom, 'dd/MM/yyyy')} al ${format(data.periodTo, 'dd/MM/yyyy')}`,
      400,
      82,
    );

    doc.moveTo(50, 125).lineTo(545, 125).stroke();
    doc.y = 135;
  }

  private renderLiquidationParties(doc: PDFKit.PDFDocument, data: LiquidationPdfData): void {
    doc.fontSize(10).font('Helvetica-Bold').text('Productor:');
    doc
      .font('Helvetica')
      .text(`${data.clientName}  —  CUIT: ${data.clientCuit}`)
      .text(`Cultivo: ${data.commodityName}`);
    doc.moveDown();
  }

  private renderLiquidationItems(doc: PDFKit.PDFDocument, data: LiquidationPdfData): void {
    const tableTop = doc.y + 5;
    const col = { ticket: 50, date: 115, gross: 175, tare: 225, net: 270, adj: 315, adjKg: 360, price: 405, amount: 480 };

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Ticket', col.ticket, tableTop);
    doc.text('Fecha', col.date, tableTop);
    doc.text('Bruto kg', col.gross, tableTop);
    doc.text('Tara', col.tare, tableTop);
    doc.text('Neto kg', col.net, tableTop);
    doc.text('Adj%', col.adj, tableTop);
    doc.text('Aj.kg', col.adjKg, tableTop);
    doc.text('Precio/tn', col.price, tableTop);
    doc.text('Importe', col.amount, tableTop);

    doc.moveTo(50, tableTop + 12).lineTo(545, tableTop + 12).stroke();

    let y = tableTop + 18;
    doc.font('Helvetica').fontSize(8);

    for (const item of data.items) {
      doc.text(item.ticketNumber, col.ticket, y);
      doc.text(format(item.date, 'dd/MM/yy'), col.date, y);
      doc.text(item.grossKg.toFixed(0), col.gross, y);
      doc.text(item.tare.toFixed(0), col.tare, y);
      doc.text(item.netKg.toFixed(0), col.net, y);
      doc.text(`${item.adjustment.toFixed(2)}%`, col.adj, y);
      doc.text(item.adjustedKg.toFixed(0), col.adjKg, y);
      doc.text(this.formatCurrency(item.unitPrice), col.price, y);
      doc.text(this.formatCurrency(item.amount), col.amount, y);
      y += 14;
    }

    doc.moveTo(50, y).lineTo(545, y).stroke();
    doc.y = y + 5;
  }

  private renderLiquidationTotals(doc: PDFKit.PDFDocument, data: LiquidationPdfData): void {
    const x = 350;
    let y = doc.y + 15;

    doc.fontSize(9).font('Helvetica');

    const rows: Array<[string, number]> = [
      [`Total bruto: ${data.totalGrossKg.toFixed(0)} kg`, data.grossAmount],
      ['Comisión:', -data.commission],
      ['Almacenaje:', -data.storageFee],
      ['Ret. IVA (10.5%):', -data.retentionIva],
      ['Ret. IIBB:', -data.retentionIibb],
      ['Ret. Ganancias:', -data.retentionGcias],
    ];

    for (const [label, amount] of rows) {
      doc.text(label, x, y);
      doc.text(this.formatCurrency(amount, data.currency), 490, y, { align: 'right' });
      y += 16;
    }

    doc.moveTo(x, y).lineTo(540, y).stroke();
    y += 8;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('LÍQUIDO A PAGAR:', x, y);
    doc.text(this.formatCurrency(data.totalToPay, data.currency), 490, y, { align: 'right' });
  }

  async generateAccountStatement(statement: AccountStatement): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('ESTADO DE CUENTA CORRIENTE', 50, 50);
        doc.fontSize(10).font('Helvetica').text(`Cliente: ${statement.clientName}`, 50, 75);
        doc.text(
          `Período: ${format(statement.from, 'dd/MM/yyyy', { locale: es })} al ${format(statement.to, 'dd/MM/yyyy', { locale: es })}`,
        );

        doc.moveTo(50, 105).lineTo(545, 105).stroke();
        doc.y = 115;

        // Opening balance
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Saldo inicial:', 50, doc.y);
        doc.text(this.formatCurrency(statement.openingBalance), 400, doc.y - 12, { width: 145, align: 'right' });
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y + 8;
        const col = { date: 50, type: 110, desc: 185, doc: 325, debit: 380, credit: 435, balance: 480 };

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Fecha', col.date, tableTop);
        doc.text('Tipo', col.type, tableTop);
        doc.text('Descripción', col.desc, tableTop);
        doc.text('Doc. N°', col.doc, tableTop);
        doc.text('Débito', col.debit, tableTop);
        doc.text('Crédito', col.credit, tableTop);
        doc.text('Saldo', col.balance, tableTop);

        doc.moveTo(50, tableTop + 13).lineTo(545, tableTop + 13).stroke();

        let y = tableTop + 20;
        doc.font('Helvetica').fontSize(8);

        for (const m of statement.movements) {
          if (y > 750) {
            doc.addPage();
            y = 50;
          }
          doc.text(format(m.movementDate, 'dd/MM/yyyy'), col.date, y);
          doc.text(m.movementType, col.type, y, { width: 70, lineBreak: false });
          doc.text(m.description ?? '—', col.desc, y, { width: 135, lineBreak: false });
          doc.text(m.documentNumber ?? '—', col.doc, y, { width: 50, lineBreak: false });
          doc.text(m.debit > 0 ? this.formatCurrency(m.debit) : '—', col.debit, y, { width: 50, lineBreak: false });
          doc.text(m.credit > 0 ? this.formatCurrency(m.credit) : '—', col.credit, y, { width: 50, lineBreak: false });
          doc.text(this.formatCurrency(m.balanceAfter), col.balance, y, { width: 65, lineBreak: false });
          y += 16;
        }

        doc.moveTo(50, y).lineTo(545, y).stroke();
        y += 10;

        // Closing balance
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Saldo final:', 50, y);
        doc.text(this.formatCurrency(statement.closingBalance), 400, y, { width: 145, align: 'right' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private formatCurrency(amount: number, currency = 'ARS'): string {
    const symbol = currency === 'USD' ? 'U$S ' : '$ ';
    return `${symbol}${Math.abs(amount).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

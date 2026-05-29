// =============================================================================
// CertificatesService — Certificados de Análisis de Calidad
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from '@guaycampo/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CertificateFilters {
  clientId?: string;
  commodityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  // -------------------------------------------------------------------------
  // Crear / emitir certificado a partir de una muestra aprobada
  // -------------------------------------------------------------------------
  async create(
    labSampleId: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<Record<string, unknown>> {
    // Fetch the lab sample with relations
    const sample = await (prisma as unknown as {
      labSample: {
        findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      };
    }).labSample.findFirst({
      where: { id: labSampleId, tenantId },
      include: {
        scaleTicket: {
          include: {
            client: true,
            commodity: true,
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Muestra ${labSampleId} no encontrada`);
    }

    if (sample['status'] !== 'aprobado' && sample['status'] !== 'condicionado') {
      throw new BadRequestException(
        `Solo se pueden emitir certificados para muestras aprobadas o condicionadas. Estado actual: ${String(sample['status'])}`,
      );
    }

    // Check if already has a certificate
    const existing = await (prisma as unknown as {
      qualityCertificate: {
        findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      };
    }).qualityCertificate.findFirst({
      where: {
        labSampleId,
        tenantId,
        status: { not: 'anulado' },
      },
    } as Record<string, unknown>);

    if (existing) {
      throw new BadRequestException(
        `Esta muestra ya tiene un certificado emitido: ${String(existing['certificateNumber'])}`,
      );
    }

    const scaleTicket = sample['scaleTicket'] as Record<string, unknown> | null;
    const client = scaleTicket?.['client'] as Record<string, unknown> | null;
    const commodity = scaleTicket?.['commodity'] as Record<string, unknown> | null;

    if (!scaleTicket || !client || !commodity) {
      throw new BadRequestException(
        'La muestra no tiene un ticket de balanza con cliente y cultivo asociados',
      );
    }

    // Fetch issuer name
    const user = await (prisma as unknown as {
      user: { findFirst: (args: Record<string, unknown>) => Promise<{ fullName: string } | null> };
    }).user.findFirst({
      where: { id: userId },
      select: { fullName: true },
    });

    // Generate certificate number: CCA-YYYY-NNNNNN
    const certNumber = await this.generateCertificateNumber(tenantId);

    // Generate QR token
    const qrToken = randomUUID().replace(/-/g, '');

    // Issue date + valid until (90 days)
    const issueDate = new Date();
    const validUntil = new Date(issueDate);
    validUntil.setDate(validUntil.getDate() + 90);

    const certificate = await (prisma as unknown as {
      qualityCertificate: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
      };
    }).qualityCertificate.create({
      data: {
        certificateNumber: certNumber,
        labSampleId,
        scaleTicketId: (scaleTicket['id'] as string) ?? null,
        clientId: client['id'] as string,
        commodityId: commodity['id'] as string,
        // Quality snapshot
        humidityPct: sample['humidity'] ?? null,
        proteinPct: sample['protein'] ?? null,
        oilPct: sample['oil'] as string | null ?? null,
        testWeightKgHl: sample['testWeight'] as string | null ?? null,
        impuritiesPct: sample['foreignMatter'] as string | null ?? null,
        damagedGrainsPct: sample['damagedGrains'] as string | null ?? null,
        foreignMatterPct: sample['foreignMatter'] as string | null ?? null,
        grade: sample['grade'] as string | null ?? null,
        netAdjustmentPct: sample['netAdjustment'] as string | null ?? null,
        // Weights from scale ticket
        grossWeightKg: scaleTicket['grossWeight'] as string | null ?? null,
        netWeightKg: scaleTicket['netWeight'] as string | null ?? null,
        issueDate,
        validUntil,
        issuedBy: userId,
        issuerName: user?.fullName ?? 'Sistema GuayCampo',
        qrToken,
        status: 'emitido',
        notes: notes ?? null,
        tenantId,
      },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        labSample: { select: { id: true, sampleNumber: true, grade: true } },
      },
    } as Record<string, unknown>);

    this.logger.log(
      `Certificado emitido: ${certNumber} (muestra: ${String(sample['sampleNumber'])}, cliente: ${String(client['name'])})`,
    );

    return certificate;
  }

  // -------------------------------------------------------------------------
  // Revocar certificado
  // -------------------------------------------------------------------------
  async revoke(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const cert = await this.findOne(id, tenantId);

    if (cert['status'] === 'anulado') {
      throw new BadRequestException('El certificado ya está anulado');
    }

    const updated = await (prisma as unknown as {
      qualityCertificate: {
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
      };
    }).qualityCertificate.update({
      where: { id },
      data: { status: 'anulado' },
    } as Record<string, unknown>);

    this.logger.warn(`Certificado anulado: ${String(cert['certificateNumber'])}`);
    return updated;
  }

  // -------------------------------------------------------------------------
  // Listar certificados con filtros
  // -------------------------------------------------------------------------
  async findAll(
    tenantId: string,
    filters: CertificateFilters = {},
  ): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number; totalPages: number }> {
    const { clientId, commodityId, status, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { tenantId };
    if (clientId) where['clientId'] = clientId;
    if (commodityId) where['commodityId'] = commodityId;
    if (status) where['status'] = status;
    if (dateFrom || dateTo) {
      where['issueDate'] = {};
      if (dateFrom) (where['issueDate'] as Record<string, unknown>)['gte'] = new Date(dateFrom);
      if (dateTo) (where['issueDate'] as Record<string, unknown>)['lte'] = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (prisma as unknown as {
        qualityCertificate: {
          findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
        };
      }).qualityCertificate.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, cuit: true } },
          commodity: { select: { id: true, name: true, code: true } },
          labSample: { select: { id: true, sampleNumber: true } },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      } as Record<string, unknown>),
      (prisma as unknown as {
        qualityCertificate: {
          count: (args: Record<string, unknown>) => Promise<number>;
        };
      }).qualityCertificate.count({ where } as Record<string, unknown>),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // -------------------------------------------------------------------------
  // Obtener certificado por ID (con auth)
  // -------------------------------------------------------------------------
  async findOne(id: string, tenantId: string): Promise<Record<string, unknown>> {
    const cert = await (prisma as unknown as {
      qualityCertificate: {
        findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      };
    }).qualityCertificate.findFirst({
      where: { id, tenantId },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        labSample: { select: { id: true, sampleNumber: true, grade: true, status: true } },
        scaleTicket: { select: { id: true, ticketNumber: true } },
      },
    } as Record<string, unknown>);

    if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);
    return cert;
  }

  // -------------------------------------------------------------------------
  // Obtener por QR token (public) — sin auth
  // -------------------------------------------------------------------------
  async findByQrToken(token: string): Promise<Record<string, unknown>> {
    const cert = await (prisma as unknown as {
      qualityCertificate: {
        findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      };
    }).qualityCertificate.findFirst({
      where: { qrToken: token },
      include: {
        client: { select: { id: true, name: true } },
        commodity: { select: { id: true, name: true, code: true } },
        labSample: { select: { id: true, sampleNumber: true } },
      },
    } as Record<string, unknown>);

    if (!cert) throw new NotFoundException('Certificado no encontrado o token inválido');
    return cert;
  }

  // -------------------------------------------------------------------------
  // Generar PDF del certificado (Buffer)
  // -------------------------------------------------------------------------
  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const cert = await this.findOne(id, tenantId);
    return this.buildPdfBuffer(cert);
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------

  private async generateCertificateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    // Count existing certificates for this tenant+year
    const count = await (prisma as unknown as {
      qualityCertificate: {
        count: (args: Record<string, unknown>) => Promise<number>;
      };
    }).qualityCertificate.count({
      where: {
        tenantId,
        certificateNumber: { startsWith: `CCA-${year}-` },
      },
    } as Record<string, unknown>);

    const seq = count + 1;
    return `CCA-${year}-${String(seq).padStart(6, '0')}`;
  }

  private buildPdfBuffer(cert: Record<string, unknown>): Buffer {
    const client = cert['client'] as Record<string, unknown> | null;
    const commodity = cert['commodity'] as Record<string, unknown> | null;
    const labSample = cert['labSample'] as Record<string, unknown> | null;

    const issueDate = cert['issueDate']
      ? new Date(cert['issueDate'] as string).toLocaleDateString('es-AR')
      : '-';
    const validUntil = cert['validUntil']
      ? new Date(cert['validUntil'] as string).toLocaleDateString('es-AR')
      : '-';

    const verifyUrl = `https://guaycampo.com/verificar/${String(cert['qrToken'] ?? '')}`;

    const fmtNum = (v: unknown, decimals = 2) => {
      if (v == null) return '-';
      return Number(v).toFixed(decimals);
    };

    const lines: string[] = [
      '===============================================================',
      '       CERTIFICADO DE ANÁLISIS DE CALIDAD — GuayCampo          ',
      '===============================================================',
      '',
      `Número:        ${String(cert['certificateNumber'] ?? '-')}`,
      `Fecha emisión: ${issueDate}`,
      `Válido hasta:  ${validUntil}`,
      `Estado:        ${String(cert['status'] ?? '-').toUpperCase()}`,
      '',
      '--- CLIENTE ---',
      `Nombre:  ${String(client?.['name'] ?? '-')}`,
      `CUIT:    ${String(client?.['cuit'] ?? '-')}`,
      '',
      '--- PRODUCTO ---',
      `Cultivo: ${String(commodity?.['name'] ?? '-')} (${String(commodity?.['code'] ?? '-')})`,
      `Grado:   ${String(cert['grade'] ?? 'S/C')}`,
      `Muestra: ${String(labSample?.['sampleNumber'] ?? '-')}`,
      '',
      '--- PESOS ---',
      `Peso bruto:  ${fmtNum(cert['grossWeightKg'])} kg`,
      `Peso neto:   ${fmtNum(cert['netWeightKg'])} kg`,
      '',
      '--- PARÁMETROS DE CALIDAD ---',
      '',
      ' Parámetro              | Valor      | Base SENASA ',
      '------------------------|------------|-------------',
      ` Humedad                | ${String(fmtNum(cert['humidityPct'])).padEnd(10)}% | 13.5%       `,
      ` Proteína               | ${String(fmtNum(cert['proteinPct'])).padEnd(10)}% | -           `,
      ` Aceite                 | ${String(fmtNum(cert['oilPct'])).padEnd(10)}% | -           `,
      ` Peso hectolítrico      | ${String(fmtNum(cert['testWeightKgHl'])).padEnd(10)} kg/hl | -  `,
      ` Granos dañados         | ${String(fmtNum(cert['damagedGrainsPct'])).padEnd(10)}% | -      `,
      ` Materias extrañas      | ${String(fmtNum(cert['foreignMatterPct'])).padEnd(10)}% | -      `,
      '',
      `Ajuste neto: ${Number(cert['netAdjustmentPct'] ?? 0) >= 0 ? '+' : ''}${fmtNum(cert['netAdjustmentPct'], 4)}%`,
      '',
      '--- OBSERVACIONES ---',
      String(cert['notes'] ?? '-'),
      '',
      '--- EMISIÓN ---',
      `Emitido por:  ${String(cert['issuerName'] ?? '-')}`,
      `Firma:        _______________________________`,
      '',
      '--- VERIFICACIÓN QR ---',
      `Verificar en: ${verifyUrl}`,
      '',
      '===============================================================',
    ];

    return Buffer.from(lines.join('\n'), 'utf8');
  }
}

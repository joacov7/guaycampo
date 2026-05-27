import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface RetentionInput {
  producerCuit: string;
  subtotal: number;
  commodity: string;
  tenantId: string;
}

export interface RetentionResult {
  iva: number;
  iibb: number;
  ganancias: number;
  total: number;
  detail: {
    ivaRate: number;
    iibbRate: number;
    gananciasRate: number;
    ivaCondition?: string;
    province?: string;
  };
}

// IIBB rates by province — RG jurisdiccionales vigentes
const IIBB_RATES: Record<string, number> = {
  'Buenos Aires': 0.015,
  'Córdoba': 0.015,
  'Santa Fe': 0.01,
  'Entre Ríos': 0.015,
  'La Pampa': 0.01,
  'Chaco': 0.015,
  'Santiago del Estero': 0.015,
  'Tucumán': 0.015,
  'Salta': 0.015,
  'Jujuy': 0.015,
  'Misiones': 0.01,
  'Corrientes': 0.015,
  'Formosa': 0.015,
};

// Commodity codes with non-retention on ganancias (RG 830 — agro exemptions)
const AGRO_GANANCIAS_RATE = 0.02; // 2% standard agro rate (RG 830)
const AGRO_GANANCIAS_RATE_SOJA = 0.02; // same for soja

@Injectable()
export class RetentionsService {
  private readonly logger = new Logger(RetentionsService.name);
  private readonly prisma = new PrismaClient();

  async calculate(data: RetentionInput): Promise<RetentionResult> {
    const [ivaRate, iibbResult, gananciasRate] = await Promise.all([
      this.getIvaRate(data.producerCuit, data.commodity, data.tenantId),
      this.getIibbRate(data.producerCuit, data.tenantId),
      this.getGananciasRate(data.producerCuit, data.tenantId),
    ]);

    const iva = data.subtotal * ivaRate;
    const iibb = data.subtotal * iibbResult.rate;
    const ganancias = data.subtotal * gananciasRate;

    return {
      iva: Math.round(iva * 100) / 100,
      iibb: Math.round(iibb * 100) / 100,
      ganancias: Math.round(ganancias * 100) / 100,
      total: Math.round((iva + iibb + ganancias) * 100) / 100,
      detail: {
        ivaRate,
        iibbRate: iibbResult.rate,
        gananciasRate,
        ivaCondition: iibbResult.ivaCondition,
        province: iibbResult.province,
      },
    };
  }

  private async getIvaRate(
    cuit: string,
    _commodity: string,
    tenantId: string,
  ): Promise<number> {
    // Retención IVA granos — RG AFIP 2300/2007
    // RI: retener el 10.5% del precio neto
    // Monotributista / No Responsable / Exento: no corresponde retención IVA
    const client = await this.getClientByCuit(cuit, tenantId);

    if (client?.ivaCondition === 'responsable_inscripto') {
      return 0.105;
    }

    return 0;
  }

  private async getIibbRate(
    cuit: string,
    tenantId: string,
  ): Promise<{ rate: number; ivaCondition?: string; province?: string }> {
    // IIBB varía por provincia del productor
    // Exento → 0%
    const client = await this.getClientByCuit(cuit, tenantId);

    if (client?.ivaCondition === 'exento') {
      return { rate: 0, ivaCondition: 'exento', province: client.province ?? undefined };
    }

    const rate = IIBB_RATES[client?.province ?? ''] ?? 0.015;
    return { rate, ivaCondition: client?.ivaCondition ?? undefined, province: client?.province ?? undefined };
  }

  private async getGananciasRate(cuit: string, tenantId: string): Promise<number> {
    // RG AFIP 830 — retención Ganancias sobre granos
    // Si el productor tiene certificado de no retención → 0%
    // Para agro: 2% sobre precio neto (alícuota estándar)
    const hasCert = await this.checkNonRetentionCertificate(cuit, tenantId);
    if (hasCert) return 0;

    return AGRO_GANANCIAS_RATE;
  }

  private async getClientByCuit(
    cuit: string,
    tenantId: string,
  ): Promise<{ ivaCondition: string | null; province: string | null } | null> {
    try {
      return await this.prisma.client.findFirst({
        where: { cuit, tenantId },
        select: { ivaCondition: true, province: true },
      });
    } catch (error) {
      this.logger.warn(`Could not fetch client by CUIT ${cuit}:`, error);
      return null;
    }
  }

  private async checkNonRetentionCertificate(
    _cuit: string,
    _tenantId: string,
  ): Promise<boolean> {
    // TODO: integrate with AFIP Padrón or store certificate in DB
    // For now return false (no exemption certificates loaded)
    return false;
  }

  /**
   * Returns the applicable IVA retention rate for a given IVA condition string
   * (utility used by other services)
   */
  getIvaRateForCondition(ivaCondition: string): number {
    if (ivaCondition === 'responsable_inscripto') return 0.105;
    return 0;
  }

  /**
   * Returns IIBB rate for a given province string
   */
  getIibbRateForProvince(province: string): number {
    return IIBB_RATES[province] ?? 0.015;
  }

  /**
   * Standard ganancias rate for agro (no exemption)
   */
  getStandardGananciasRate(): number {
    return AGRO_GANANCIAS_RATE_SOJA;
  }
}

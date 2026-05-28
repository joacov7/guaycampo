/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface VolumeByCommodity {
  commodityName: string;
  grossKg: number;
  netKg: number;
  ticketCount: number;
}

export interface VolumeByDay {
  date: string;
  kg: number;
  tickets: number;
}

export interface TopTransporter {
  transporterName: string;
  grossKg: number;
  ticketCount: number;
  avgProcessMinutes: number;
}

export interface ProcessingTime {
  commodityName: string;
  avgMinutes: number;
  p50Minutes: number;
  p95Minutes: number;
  ticketCount: number;
}

export interface QualitySummary {
  commodityName: string;
  avgHumidity: number;
  avgProtein: number | null;
  gradeDistribution: Record<string, number>;
}

export interface ClientActivity {
  clientName: string;
  grossKg: number;
  netKg: number;
  ticketCount: number;
  lastActivity: string;
}

export interface SiloInventory {
  siloName: string;
  commodityName: string | null;
  capacityTon: number;
  currentStockTon: number;
  fillPct: number;
}

export interface WeeklySummary {
  week: string;
  totalKg: number;
  tickets: number;
  avgProcessMinutes: number;
}

interface VolByCommRow {
  commodity_name: string;
  gross_kg: string;
  net_kg: string;
  ticket_count: string;
}

interface VolByDayRow {
  day: Date;
  kg: string;
  tickets: string;
}

interface TransporterRow {
  transporter_name: string;
  gross_kg: string;
  ticket_count: string;
  avg_process_minutes: string;
}

interface ProcTimeRow {
  commodity_name: string;
  avg_minutes: string;
  p50_minutes: string;
  p95_minutes: string;
  ticket_count: string;
}

interface QualityRow {
  commodity_name: string;
  commodity_id: string;
  avg_humidity: string;
  avg_protein: string | null;
}

interface GradeRow {
  commodity_id: string;
  grade: string | null;
  grade_count: string;
}

interface ClientRow {
  client_name: string;
  gross_kg: string;
  net_kg: string;
  ticket_count: string;
  last_activity: Date;
}

interface WeeklyRow {
  week_start: Date;
  total_kg: string;
  tickets: string;
  avg_process_minutes: string;
}

function toNum(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  return parseFloat(s) || 0;
}

function toInt(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  return parseInt(s, 10) || 0;
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

function toDate10(d: Date | string | null | undefined): string {
  return toIso(d).slice(0, 10);
}

@Injectable()
export class ReportsService {
  private readonly prisma = new PrismaClient();

  async getVolumeByCommod(tenantId: string, from: Date, to: Date): Promise<VolumeByCommodity[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        c.name                                   AS commodity_name,
        COALESCE(SUM(st.gross_weight), 0)::text  AS gross_kg,
        COALESCE(SUM(st.net_weight), 0)::text    AS net_kg,
        COUNT(st.id)::text                        AS ticket_count
      FROM scale_tickets st
      JOIN commodities c ON c.id = st.commodity_id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
      GROUP BY c.id, c.name
      ORDER BY SUM(st.gross_weight) DESC NULLS LAST
    `) as unknown as VolByCommRow[];

    return rows.map((r: VolByCommRow) => ({
      commodityName: r.commodity_name,
      grossKg: toNum(r.gross_kg),
      netKg: toNum(r.net_kg),
      ticketCount: toInt(r.ticket_count),
    }));
  }

  async getVolumeByDay(tenantId: string, from: Date, to: Date): Promise<VolumeByDay[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        date_trunc('day', st.created_at)         AS day,
        COALESCE(SUM(st.gross_weight), 0)::text  AS kg,
        COUNT(st.id)::text                        AS tickets
      FROM scale_tickets st
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
      GROUP BY date_trunc('day', st.created_at)
      ORDER BY day ASC
    `) as unknown as VolByDayRow[];

    return rows.map((r: VolByDayRow) => ({
      date: toDate10(r.day),
      kg: toNum(r.kg),
      tickets: toInt(r.tickets),
    }));
  }

  async getTopTransporters(tenantId: string, from: Date, to: Date): Promise<TopTransporter[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        tc.name                                  AS transporter_name,
        COALESCE(SUM(st.gross_weight), 0)::text  AS gross_kg,
        COUNT(st.id)::text                        AS ticket_count,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0)
          FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
          0
        )::text                                  AS avg_process_minutes
      FROM scale_tickets st
      JOIN vehicles v ON v.id = st.vehicle_id
      LEFT JOIN transport_companies tc ON tc.id = v.transport_company_id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
        AND tc.name IS NOT NULL
      GROUP BY tc.id, tc.name
      ORDER BY SUM(st.gross_weight) DESC NULLS LAST
      LIMIT 10
    `) as unknown as TransporterRow[];

    return rows.map((r: TransporterRow) => ({
      transporterName: r.transporter_name,
      grossKg: toNum(r.gross_kg),
      ticketCount: toInt(r.ticket_count),
      avgProcessMinutes: toNum(r.avg_process_minutes),
    }));
  }

  async getProcessingTimes(tenantId: string, from: Date, to: Date): Promise<ProcessingTime[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        c.name                                      AS commodity_name,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0)
          FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
          0
        )::text                                     AS avg_minutes,
        COALESCE(
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
          ) FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
          0
        )::text                                     AS p50_minutes,
        COALESCE(
          PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
          ) FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
          0
        )::text                                     AS p95_minutes,
        COUNT(st.id)::text                          AS ticket_count
      FROM scale_tickets st
      JOIN commodities c ON c.id = st.commodity_id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
      GROUP BY c.id, c.name
      ORDER BY AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0) DESC NULLS LAST
    `) as unknown as ProcTimeRow[];

    return rows.map((r: ProcTimeRow) => ({
      commodityName: r.commodity_name,
      avgMinutes: toNum(r.avg_minutes),
      p50Minutes: toNum(r.p50_minutes),
      p95Minutes: toNum(r.p95_minutes),
      ticketCount: toInt(r.ticket_count),
    }));
  }

  async getQualitySummary(tenantId: string, from: Date, to: Date): Promise<QualitySummary[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        c.name                                  AS commodity_name,
        c.id                                    AS commodity_id,
        COALESCE(AVG(ls.humidity), 0)::text     AS avg_humidity,
        AVG(ls.protein)::text                   AS avg_protein
      FROM scale_tickets st
      JOIN commodities c ON c.id = st.commodity_id
      JOIN lab_samples ls ON ls.scale_ticket_id = st.id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
        AND ls.status IN ('aprobado', 'condicional')
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `) as unknown as QualityRow[];

    const gradeRows = (await this.prisma.$queryRaw`
      SELECT
        c.id                AS commodity_id,
        ls.grade            AS grade,
        COUNT(ls.id)::text  AS grade_count
      FROM scale_tickets st
      JOIN commodities c ON c.id = st.commodity_id
      JOIN lab_samples ls ON ls.scale_ticket_id = st.id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
        AND ls.status IN ('aprobado', 'condicional')
        AND ls.grade IS NOT NULL
      GROUP BY c.id, ls.grade
    `) as unknown as GradeRow[];

    const gradeMap: Record<string, Record<string, number>> = {};
    for (const gr of gradeRows) {
      if (!gradeMap[gr.commodity_id]) gradeMap[gr.commodity_id] = {};
      gradeMap[gr.commodity_id][gr.grade ?? 'Sin grado'] = toInt(gr.grade_count);
    }

    return rows.map((r: QualityRow) => ({
      commodityName: r.commodity_name,
      avgHumidity: toNum(r.avg_humidity),
      avgProtein:
        r.avg_protein !== null && r.avg_protein !== undefined ? toNum(r.avg_protein) : null,
      gradeDistribution: gradeMap[r.commodity_id] ?? {},
    }));
  }

  async getClientActivity(tenantId: string, from: Date, to: Date): Promise<ClientActivity[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        cl.name                                  AS client_name,
        COALESCE(SUM(st.gross_weight), 0)::text  AS gross_kg,
        COALESCE(SUM(st.net_weight), 0)::text    AS net_kg,
        COUNT(st.id)::text                        AS ticket_count,
        MAX(st.created_at)                        AS last_activity
      FROM scale_tickets st
      JOIN clients cl ON cl.id = st.client_id
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
      GROUP BY cl.id, cl.name
      ORDER BY SUM(st.gross_weight) DESC NULLS LAST
    `) as unknown as ClientRow[];

    return rows.map((r: ClientRow) => ({
      clientName: r.client_name,
      grossKg: toNum(r.gross_kg),
      netKg: toNum(r.net_kg),
      ticketCount: toInt(r.ticket_count),
      lastActivity: toIso(r.last_activity),
    }));
  }

  async getSiloInventory(tenantId: string): Promise<SiloInventory[]> {
    const silos = await this.prisma.silo.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const commodityIds = silos
      .map((s) => s.commodityId)
      .filter((id): id is string => id !== null);
    const uniqueIds = [...new Set(commodityIds)];

    const commodities =
      uniqueIds.length > 0
        ? await this.prisma.commodity.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          })
        : [];

    const commodityMap: Record<string, string> = Object.fromEntries(
      commodities.map((c) => [c.id, c.name]),
    );

    return silos.map((s) => {
      const capacityTon = Number(s.capacityTon);
      const currentStockTon = Number(s.currentStock);
      const fillPct =
        capacityTon > 0 ? Math.round((currentStockTon / capacityTon) * 10000) / 100 : 0;
      return {
        siloName: s.name,
        commodityName: s.commodityId ? (commodityMap[s.commodityId] ?? null) : null,
        capacityTon,
        currentStockTon,
        fillPct,
      };
    });
  }

  async getWeeklySummary(tenantId: string, from: Date, to: Date): Promise<WeeklySummary[]> {
    const rows = (await this.prisma.$queryRaw`
      SELECT
        date_trunc('week', st.created_at)        AS week_start,
        COALESCE(SUM(st.gross_weight), 0)::text  AS total_kg,
        COUNT(st.id)::text                        AS tickets,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0)
          FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
          0
        )::text                                  AS avg_process_minutes
      FROM scale_tickets st
      WHERE st.tenant_id = ${tenantId}
        AND st.status = 'completado'
        AND st.created_at >= ${from}
        AND st.created_at <= ${to}
      GROUP BY date_trunc('week', st.created_at)
      ORDER BY week_start ASC
    `) as unknown as WeeklyRow[];

    return rows.map((r: WeeklyRow) => ({
      week: toDate10(r.week_start),
      totalKg: toNum(r.total_kg),
      tickets: toInt(r.tickets),
      avgProcessMinutes: toNum(r.avg_process_minutes),
    }));
  }

  async exportCsv(tenantId: string, type: string, from: Date, to: Date): Promise<string> {
    switch (type) {
      case 'volume-by-commodity': {
        const data = await this.getVolumeByCommod(tenantId, from, to);
        const header = 'Commodity,Peso Bruto (kg),Peso Neto (kg),Tickets\n';
        const body = data
          .map((r) => `${r.commodityName},${r.grossKg},${r.netKg},${r.ticketCount}`)
          .join('\n');
        return header + body;
      }
      case 'top-transporters': {
        const data = await this.getTopTransporters(tenantId, from, to);
        const header = 'Transportista,Peso Bruto (kg),Tickets,Tiempo Promedio (min)\n';
        const body = data
          .map(
            (r) =>
              `${r.transporterName},${r.grossKg},${r.ticketCount},${r.avgProcessMinutes.toFixed(1)}`,
          )
          .join('\n');
        return header + body;
      }
      case 'client-activity': {
        const data = await this.getClientActivity(tenantId, from, to);
        const header = 'Cliente,Peso Bruto (kg),Peso Neto (kg),Tickets,Ultima Actividad\n';
        const body = data
          .map(
            (r) =>
              `${r.clientName},${r.grossKg},${r.netKg},${r.ticketCount},${r.lastActivity}`,
          )
          .join('\n');
        return header + body;
      }
      default:
        return '';
    }
  }
}

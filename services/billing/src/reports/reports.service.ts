import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

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

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly prisma = new PrismaClient();

  // -----------------------------------------------------------------------
  // Volume by commodity
  // -----------------------------------------------------------------------
  async getVolumeByCommod(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<VolumeByCommodity[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        commodity_name: string;
        gross_kg: string;
        net_kg: string;
        ticket_count: string;
      }>
    >(
      Prisma.sql`
        SELECT
          c.name              AS commodity_name,
          COALESCE(SUM(st.gross_weight), 0)::text  AS gross_kg,
          COALESCE(SUM(st.net_weight), 0)::text    AS net_kg,
          COUNT(st.id)::text                       AS ticket_count
        FROM scale_tickets st
        JOIN commodities c ON c.id = st.commodity_id
        WHERE st.tenant_id = ${tenantId}
          AND st.status = 'completado'
          AND st.created_at >= ${from}
          AND st.created_at <= ${to}
        GROUP BY c.id, c.name
        ORDER BY SUM(st.gross_weight) DESC NULLS LAST
      `,
    );

    return rows.map((r) => ({
      commodityName: r.commodity_name,
      grossKg: parseFloat(r.gross_kg) || 0,
      netKg: parseFloat(r.net_kg) || 0,
      ticketCount: parseInt(r.ticket_count, 10) || 0,
    }));
  }

  // -----------------------------------------------------------------------
  // Volume by day
  // -----------------------------------------------------------------------
  async getVolumeByDay(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<VolumeByDay[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; kg: string; tickets: string }>
    >(
      Prisma.sql`
        SELECT
          date_trunc('day', st.created_at)        AS day,
          COALESCE(SUM(st.gross_weight), 0)::text AS kg,
          COUNT(st.id)::text                       AS tickets
        FROM scale_tickets st
        WHERE st.tenant_id = ${tenantId}
          AND st.status = 'completado'
          AND st.created_at >= ${from}
          AND st.created_at <= ${to}
        GROUP BY date_trunc('day', st.created_at)
        ORDER BY day ASC
      `,
    );

    return rows.map((r) => ({
      date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      kg: parseFloat(r.kg) || 0,
      tickets: parseInt(r.tickets, 10) || 0,
    }));
  }

  // -----------------------------------------------------------------------
  // Top 10 transporters by volume
  // -----------------------------------------------------------------------
  async getTopTransporters(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<TopTransporter[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        transporter_name: string;
        gross_kg: string;
        ticket_count: string;
        avg_process_minutes: string;
      }>
    >(
      Prisma.sql`
        SELECT
          tc.name                                   AS transporter_name,
          COALESCE(SUM(st.gross_weight), 0)::text  AS gross_kg,
          COUNT(st.id)::text                        AS ticket_count,
          COALESCE(
            AVG(
              EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
            ) FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
            0
          )::text                                   AS avg_process_minutes
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
      `,
    );

    return rows.map((r) => ({
      transporterName: r.transporter_name,
      grossKg: parseFloat(r.gross_kg) || 0,
      ticketCount: parseInt(r.ticket_count, 10) || 0,
      avgProcessMinutes: parseFloat(r.avg_process_minutes) || 0,
    }));
  }

  // -----------------------------------------------------------------------
  // Processing time distribution per commodity
  // -----------------------------------------------------------------------
  async getProcessingTimes(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ProcessingTime[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        commodity_name: string;
        avg_minutes: string;
        p50_minutes: string;
        p95_minutes: string;
        ticket_count: string;
      }>
    >(
      Prisma.sql`
        SELECT
          c.name                                           AS commodity_name,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0)
            FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
            0
          )::text                                          AS avg_minutes,
          COALESCE(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
            ) FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
            0
          )::text                                          AS p50_minutes,
          COALESCE(
            PERCENTILE_CONT(0.95) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
            ) FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
            0
          )::text                                          AS p95_minutes,
          COUNT(st.id)::text                               AS ticket_count
        FROM scale_tickets st
        JOIN commodities c ON c.id = st.commodity_id
        WHERE st.tenant_id = ${tenantId}
          AND st.status = 'completado'
          AND st.created_at >= ${from}
          AND st.created_at <= ${to}
        GROUP BY c.id, c.name
        ORDER BY AVG(
          EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0
        ) DESC NULLS LAST
      `,
    );

    return rows.map((r) => ({
      commodityName: r.commodity_name,
      avgMinutes: parseFloat(r.avg_minutes) || 0,
      p50Minutes: parseFloat(r.p50_minutes) || 0,
      p95Minutes: parseFloat(r.p95_minutes) || 0,
      ticketCount: parseInt(r.ticket_count, 10) || 0,
    }));
  }

  // -----------------------------------------------------------------------
  // Quality summary by commodity
  // -----------------------------------------------------------------------
  async getQualitySummary(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<QualitySummary[]> {
    // Aggregate averages
    const rows = await this.prisma.$queryRaw<
      Array<{
        commodity_name: string;
        commodity_id: string;
        avg_humidity: string;
        avg_protein: string | null;
      }>
    >(
      Prisma.sql`
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
      `,
    );

    // Grade distribution per commodity
    const gradeRows = await this.prisma.$queryRaw<
      Array<{ commodity_id: string; grade: string | null; grade_count: string }>
    >(
      Prisma.sql`
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
      `,
    );

    const gradeMap: Record<string, Record<string, number>> = {};
    for (const gr of gradeRows) {
      if (!gradeMap[gr.commodity_id]) gradeMap[gr.commodity_id] = {};
      gradeMap[gr.commodity_id][gr.grade ?? 'Sin grado'] = parseInt(gr.grade_count, 10) || 0;
    }

    return rows.map((r) => ({
      commodityName: r.commodity_name,
      avgHumidity: parseFloat(r.avg_humidity) || 0,
      avgProtein: r.avg_protein !== null ? parseFloat(r.avg_protein) || null : null,
      gradeDistribution: gradeMap[r.commodity_id] ?? {},
    }));
  }

  // -----------------------------------------------------------------------
  // Client activity ranking
  // -----------------------------------------------------------------------
  async getClientActivity(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ClientActivity[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        client_name: string;
        gross_kg: string;
        net_kg: string;
        ticket_count: string;
        last_activity: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          cl.name                                  AS client_name,
          COALESCE(SUM(st.gross_weight), 0)::text AS gross_kg,
          COALESCE(SUM(st.net_weight), 0)::text   AS net_kg,
          COUNT(st.id)::text                       AS ticket_count,
          MAX(st.created_at)                       AS last_activity
        FROM scale_tickets st
        JOIN clients cl ON cl.id = st.client_id
        WHERE st.tenant_id = ${tenantId}
          AND st.status = 'completado'
          AND st.created_at >= ${from}
          AND st.created_at <= ${to}
        GROUP BY cl.id, cl.name
        ORDER BY SUM(st.gross_weight) DESC NULLS LAST
      `,
    );

    return rows.map((r) => ({
      clientName: r.client_name,
      grossKg: parseFloat(r.gross_kg) || 0,
      netKg: parseFloat(r.net_kg) || 0,
      ticketCount: parseInt(r.ticket_count, 10) || 0,
      lastActivity:
        r.last_activity instanceof Date
          ? r.last_activity.toISOString()
          : String(r.last_activity),
    }));
  }

  // -----------------------------------------------------------------------
  // Silo inventory snapshot (no date filter — current state)
  // -----------------------------------------------------------------------
  async getSiloInventory(tenantId: string): Promise<SiloInventory[]> {
    const silos = await this.prisma.silo.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const commodityIds = [...new Set(silos.map((s) => s.commodityId).filter(Boolean))] as string[];
    const commodities =
      commodityIds.length > 0
        ? await this.prisma.commodity.findMany({
            where: { id: { in: commodityIds } },
            select: { id: true, name: true },
          })
        : [];
    const commodityMap = Object.fromEntries(commodities.map((c) => [c.id, c.name]));

    return silos.map((s) => {
      const capacityTon = Number(s.capacityTon);
      const currentStockTon = Number(s.currentStock);
      const fillPct = capacityTon > 0 ? Math.round((currentStockTon / capacityTon) * 100 * 100) / 100 : 0;
      return {
        siloName: s.name,
        commodityName: s.commodityId ? (commodityMap[s.commodityId] ?? null) : null,
        capacityTon,
        currentStockTon,
        fillPct,
      };
    });
  }

  // -----------------------------------------------------------------------
  // Weekly throughput summary
  // -----------------------------------------------------------------------
  async getWeeklySummary(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<WeeklySummary[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        week_start: Date;
        total_kg: string;
        tickets: string;
        avg_process_minutes: string;
      }>
    >(
      Prisma.sql`
        SELECT
          date_trunc('week', st.created_at)        AS week_start,
          COALESCE(SUM(st.gross_weight), 0)::text  AS total_kg,
          COUNT(st.id)::text                        AS tickets,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (st.tare_at - st.gross_at)) / 60.0)
            FILTER (WHERE st.gross_at IS NOT NULL AND st.tare_at IS NOT NULL),
            0
          )::text                                   AS avg_process_minutes
        FROM scale_tickets st
        WHERE st.tenant_id = ${tenantId}
          AND st.status = 'completado'
          AND st.created_at >= ${from}
          AND st.created_at <= ${to}
        GROUP BY date_trunc('week', st.created_at)
        ORDER BY week_start ASC
      `,
    );

    return rows.map((r) => ({
      week:
        r.week_start instanceof Date
          ? r.week_start.toISOString().slice(0, 10)
          : String(r.week_start),
      totalKg: parseFloat(r.total_kg) || 0,
      tickets: parseInt(r.tickets, 10) || 0,
      avgProcessMinutes: parseFloat(r.avg_process_minutes) || 0,
    }));
  }

  // -----------------------------------------------------------------------
  // CSV export helpers
  // -----------------------------------------------------------------------
  async exportCsv(
    tenantId: string,
    type: string,
    from: Date,
    to: Date,
  ): Promise<string> {
    switch (type) {
      case 'volume-by-commodity': {
        const data = await this.getVolumeByCommod(tenantId, from, to);
        const header = 'Commodity,Peso Bruto (kg),Peso Neto (kg),Tickets\n';
        const rows = data
          .map((r) => `${r.commodityName},${r.grossKg},${r.netKg},${r.ticketCount}`)
          .join('\n');
        return header + rows;
      }
      case 'top-transporters': {
        const data = await this.getTopTransporters(tenantId, from, to);
        const header = 'Transportista,Peso Bruto (kg),Tickets,Tiempo Promedio (min)\n';
        const rows = data
          .map(
            (r) =>
              `${r.transporterName},${r.grossKg},${r.ticketCount},${r.avgProcessMinutes.toFixed(1)}`,
          )
          .join('\n');
        return header + rows;
      }
      case 'client-activity': {
        const data = await this.getClientActivity(tenantId, from, to);
        const header = 'Cliente,Peso Bruto (kg),Peso Neto (kg),Tickets,Última Actividad\n';
        const rows = data
          .map(
            (r) =>
              `${r.clientName},${r.grossKg},${r.netKg},${r.ticketCount},${r.lastActivity}`,
          )
          .join('\n');
        return header + rows;
      }
      default:
        return '';
    }
  }
}

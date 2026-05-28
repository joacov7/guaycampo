import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ReportsService } from './reports.service';

function defaultPeriod(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
}

function parsePeriod(
  fromStr?: string,
  toStr?: string,
): { from: Date; to: Date } {
  const defaults = defaultPeriod();
  const from = fromStr ? new Date(fromStr) : defaults.from;
  const to = toStr ? new Date(toStr) : defaults.to;
  // end of day for 'to'
  to.setHours(23, 59, 59, 999);
  // start of day for 'from'
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('volume-by-commodity')
  @ApiOperation({ summary: 'Volumen total por commodity en el período' })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  volumeByCommodity(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getVolumeByCommod(tenantId, period.from, period.to);
  }

  @Get('volume-by-day')
  @ApiOperation({ summary: 'Serie temporal diaria de volumen recibido' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  volumeByDay(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getVolumeByDay(tenantId, period.from, period.to);
  }

  @Get('top-transporters')
  @ApiOperation({ summary: 'Top 10 transportistas por volumen' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  topTransporters(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getTopTransporters(tenantId, period.from, period.to);
  }

  @Get('processing-times')
  @ApiOperation({ summary: 'Distribución de tiempos de proceso por commodity (avg, p50, p95)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  processingTimes(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getProcessingTimes(tenantId, period.from, period.to);
  }

  @Get('quality-summary')
  @ApiOperation({ summary: 'Resumen de calidad por commodity (humedad, proteína, grados)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  qualitySummary(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getQualitySummary(tenantId, period.from, period.to);
  }

  @Get('client-activity')
  @ApiOperation({ summary: 'Ranking de clientes por volumen y actividad' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  clientActivity(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getClientActivity(tenantId, period.from, period.to);
  }

  @Get('silo-inventory')
  @ApiOperation({ summary: 'Snapshot actual de inventario por silo' })
  siloInventory(@TenantId() tenantId: string) {
    return this.reportsService.getSiloInventory(tenantId);
  }

  @Get('weekly-summary')
  @ApiOperation({ summary: 'Resumen semanal de throughput' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  weeklySummary(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const period = parsePeriod(from, to);
    return this.reportsService.getWeeklySummary(tenantId, period.from, period.to);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar datos como CSV' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['volume-by-commodity', 'top-transporters', 'client-activity'],
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportCsv(
    @TenantId() tenantId: string,
    @Query('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const period = parsePeriod(from, to);
    const csv = await this.reportsService.exportCsv(tenantId, type, period.from, period.to);

    const filename = `reporte-${type}-${period.from.toISOString().slice(0, 10)}.csv`;

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res!.send('﻿' + csv); // BOM for Excel UTF-8 compatibility
  }
}

// =============================================================================
// SamplesController — endpoints REST para muestras de laboratorio
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { SamplesService } from './samples.service';
import {
  CreateSampleDto,
  SubmitResultsDto,
  ManualApproveDto,
  ManualRejectDto,
} from './dto/create-sample.dto';

@ApiTags('samples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('samples')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  // GET /samples — listar con filtros
  @Get()
  @ApiOperation({ summary: 'Listar muestras de laboratorio con filtros' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'scaleTicketId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('scaleTicketId') scaleTicketId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.samplesService.findAll(tenantId, {
      status,
      scaleTicketId,
      dateFrom,
      dateTo,
      page,
      limit,
    });
  }

  // GET /samples/pending — muestras pendientes (dashboard lab)
  @Get('pending')
  @ApiOperation({ summary: 'Muestras pendientes de análisis (dashboard laboratorio)' })
  @ApiResponse({ status: 200, description: 'Lista de muestras pendientes' })
  async getPending(@TenantId() tenantId: string) {
    return this.samplesService.getPending(tenantId);
  }

  // GET /samples/ticket/:ticketId — muestras de un ticket
  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Obtener muestras de un ticket de balanza' })
  @ApiResponse({ status: 200, description: 'Muestras del ticket' })
  async getForTicket(
    @Param('ticketId') ticketId: string,
    @TenantId() tenantId: string,
  ) {
    return this.samplesService.getForTicket(ticketId, tenantId);
  }

  // GET /samples/:id — detalle con cálculos
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de muestra con ajustes de calidad calculados' })
  @ApiResponse({ status: 200, description: 'Muestra con bonificaciones/descuentos' })
  @ApiResponse({ status: 404, description: 'Muestra no encontrada' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.samplesService.findOne(id, tenantId);
  }

  // POST /samples — crear muestra
  @Post()
  @ApiOperation({ summary: 'Crear nueva muestra de laboratorio' })
  @ApiResponse({ status: 201, description: 'Muestra creada' })
  async create(@Body() dto: CreateSampleDto, @TenantId() tenantId: string) {
    return this.samplesService.create(dto, tenantId);
  }

  // POST /samples/:id/results — cargar resultados analíticos
  @Post(':id/results')
  @ApiOperation({
    summary: 'Cargar resultados analíticos → cálculo automático de bonif/descuentos SENASA',
  })
  @ApiResponse({ status: 200, description: 'Resultados guardados y ajustes calculados' })
  async submitResults(
    @Param('id') id: string,
    @Body() dto: SubmitResultsDto,
    @TenantId() tenantId: string,
  ) {
    return this.samplesService.submitResults(id, dto, tenantId);
  }

  // POST /samples/:id/approve — aprobación manual (supervisor)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobación manual de muestra (requiere rol supervisor)' })
  @ApiResponse({ status: 200, description: 'Muestra aprobada manualmente' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ManualApproveDto,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string,
  ) {
    return this.samplesService.approve(id, user.sub, dto.reason, tenantId);
  }

  // POST /samples/:id/reject — rechazo manual
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazo manual de muestra' })
  @ApiResponse({ status: 200, description: 'Muestra rechazada' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ManualRejectDto,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string,
  ) {
    return this.samplesService.reject(id, user.sub, dto.reason, tenantId);
  }
}

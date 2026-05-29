// =============================================================================
// CertificatesController — endpoints REST para certificados de calidad
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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ---------------------------------------------------------------------------
  // GET /certificates — listar con filtros (auth requerida)
  // ---------------------------------------------------------------------------
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar certificados de calidad con filtros' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @TenantId() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('commodityId') commodityId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.certificatesService.findAll(tenantId, {
      clientId,
      commodityId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    });
  }

  // ---------------------------------------------------------------------------
  // GET /certificates/verify/:token — verificación pública (sin auth)
  // ---------------------------------------------------------------------------
  @Get('verify/:token')
  @ApiOperation({ summary: 'Verificación pública de certificado por QR token' })
  @ApiResponse({ status: 200, description: 'Datos públicos del certificado' })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async verifyByToken(@Param('token') token: string) {
    return this.certificatesService.findByQrToken(token);
  }

  // ---------------------------------------------------------------------------
  // GET /certificates/:id — detalle (auth requerida)
  // ---------------------------------------------------------------------------
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Detalle completo de un certificado' })
  @ApiResponse({ status: 200, description: 'Certificado completo' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.certificatesService.findOne(id, tenantId);
  }

  // ---------------------------------------------------------------------------
  // POST /certificates — emitir certificado (auth requerida)
  // ---------------------------------------------------------------------------
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emitir nuevo certificado de análisis de calidad' })
  @ApiResponse({ status: 201, description: 'Certificado emitido' })
  async create(
    @Body() dto: CreateCertificateDto,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string,
  ) {
    return this.certificatesService.create(dto.labSampleId, user.sub, tenantId, dto.notes);
  }

  // ---------------------------------------------------------------------------
  // POST /certificates/:id/revoke — anular certificado (auth requerida)
  // ---------------------------------------------------------------------------
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular un certificado emitido' })
  @ApiResponse({ status: 200, description: 'Certificado anulado' })
  async revoke(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.certificatesService.revoke(id, tenantId);
  }

  // ---------------------------------------------------------------------------
  // GET /certificates/:id/pdf — descargar PDF (sin auth, público)
  // ---------------------------------------------------------------------------
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del certificado (acceso público)' })
  @ApiResponse({ status: 200, description: 'PDF del certificado' })
  async downloadPdf(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    // For public PDF access we accept tenantId as query param
    // In a real setup you might use a signed token; for now tenantId suffices
    const pdfBuffer = await this.certificatesService.generatePdf(id, tenantId);

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="certificado-${id}.txt"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}

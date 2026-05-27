import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { LiquidationsService, GenerateLiquidationDto } from './liquidations.service';

@ApiTags('liquidations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('liquidations')
export class LiquidationsController {
  constructor(private readonly liquidationsService: LiquidationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar liquidaciones con filtros' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @TenantId() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.liquidationsService.list(tenantId, {
      clientId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generar liquidación de granos para un período' })
  generate(
    @Body() dto: GenerateLiquidationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.liquidationsService.generate(dto, user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de liquidación' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.liquidationsService.findOne(id, tenantId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprobar liquidación y actualizar cuenta corriente' })
  approve(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.liquidationsService.approve(id, user.sub, tenantId);
  }

  @Post(':id/invoice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emitir factura AFIP sobre la liquidación aprobada' })
  emitirFactura(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.liquidationsService.emitirFactura(id, user.sub, tenantId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF de la liquidación' })
  async downloadPdf(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const liquidation = await this.liquidationsService.findOne(id, tenantId);
    const pdf = await this.liquidationsService.generatePdf(id, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="liquidacion-${liquidation.liquidationNumber}.pdf"`,
    );
    res.send(pdf);
  }
}

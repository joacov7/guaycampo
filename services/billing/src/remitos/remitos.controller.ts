import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { RemitosService } from './remitos.service';
import { CreateRemitoDto } from './dto/create-remito.dto';

@ApiTags('remitos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('remitos')
export class RemitosController {
  constructor(private readonly remitosService: RemitosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar remitos con filtros' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.remitosService.findAll(tenantId, {
      type,
      status,
      clientId,
      dateFrom,
      dateTo,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo remito' })
  create(
    @Body() dto: CreateRemitoDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.remitosService.create(dto, user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de remito' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.remitosService.findOne(id, tenantId);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Firmar remito digitalmente' })
  sign(
    @Param('id') id: string,
    @Body('signatureData') signatureData: string,
    @Body('signerName') signerName: string,
    @TenantId() tenantId: string,
  ) {
    return this.remitosService.sign(id, signatureData, signerName, tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular remito' })
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.remitosService.cancel(id, tenantId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del remito' })
  async getPdf(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.remitosService.generatePdf(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="remito-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

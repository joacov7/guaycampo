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
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { InvoicesService } from './invoices.service';
import { EmitInvoiceDto } from '../afip/dto/emit-invoice.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar facturas con filtros' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @TenantId() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.invoicesService.list(tenantId, {
      clientId,
      status,
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post()
  @ApiOperation({ summary: 'Emitir factura electrónica (llama a AFIP WSFE)' })
  @ApiResponse({ status: 201, description: 'Factura emitida con CAE' })
  emit(
    @Body() dto: EmitInvoiceDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.emit(dto, user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de factura + CAE' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.invoicesService.findOne(id, tenantId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF de la factura' })
  async downloadPdf(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(id, tenantId);
    const pdf = await this.invoicesService.generatePdf(id, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="factura-${invoice.invoiceNumber}.pdf"`,
    );
    res.send(pdf);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar factura como anulada (no cancela en AFIP; emitir NC)' })
  cancel(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.cancel(id, user.sub, tenantId);
  }
}

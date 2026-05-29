import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import type { JwtPayload } from '../common/strategies/jwt.strategy';
import { PricesService } from './prices.service';
import { CreatePriceDto, UpdatePriceDto } from './dto/create-price.dto';

@ApiTags('prices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar precios con filtros' })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'condition', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('commodityId') commodityId?: string,
    @Query('condition') condition?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveFilter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.pricesService.findAll(tenantId, { commodityId, condition, isActive: isActiveFilter });
  }

  @Get('current')
  @ApiOperation({ summary: 'Precios activos agrupados por commodity (para portal y widget)' })
  findCurrent(@TenantId() tenantId: string) {
    return this.pricesService.findCurrent(tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de mercado para widget del dashboard' })
  getMarketSummary(@TenantId() tenantId: string) {
    return this.pricesService.getMarketSummary(tenantId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de precios para gráfico' })
  @ApiQuery({ name: 'commodityId', required: true })
  @ApiQuery({ name: 'days', required: false })
  findHistory(
    @TenantId() tenantId: string,
    @Query('commodityId') commodityId: string,
    @Query('days') days?: string,
  ) {
    return this.pricesService.findHistory(tenantId, commodityId, days ? parseInt(days, 10) : 30);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva cotización' })
  create(
    @Body() dto: CreatePriceDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pricesService.create(dto, user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de precio con historial' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.pricesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar precio parcialmente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceDto,
    @TenantId() tenantId: string,
  ) {
    return this.pricesService.update(id, dto, tenantId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar precio' })
  deactivate(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.pricesService.deactivate(id, tenantId);
  }
}

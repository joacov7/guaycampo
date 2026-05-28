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
import { ContractsService } from './contracts.service';
import { CreateContractDto, UpdateContractDto } from './dto/create-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contratos con filtros' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('commodityId') commodityId?: string,
    @Query('search') search?: string,
  ) {
    return this.contractsService.findAll(tenantId, {
      status,
      clientId,
      commodityId,
      search,
    });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Contratos que vencen en los próximos 30 días' })
  getExpiringSoon(@TenantId() tenantId: string) {
    return this.contractsService.getExpiringSoon(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo contrato' })
  create(
    @Body() dto: CreateContractDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractsService.create(dto, user.sub, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de contrato' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contractsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar contrato parcialmente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @TenantId() tenantId: string,
  ) {
    return this.contractsService.update(id, dto, tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar contrato' })
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.contractsService.cancel(id, tenantId);
  }

  @Post(':id/link-ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vincular ticket de balanza a contrato' })
  linkTicket(
    @Param('id') id: string,
    @Body('ticketId') ticketId: string,
    @TenantId() tenantId: string,
  ) {
    return this.contractsService.linkTicket(id, ticketId, tenantId);
  }
}

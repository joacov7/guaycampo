import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/tenant.decorator';
import { AlertsService } from './alerts.service';
import type { JwtPayload } from '../common/strategies/jwt.strategy';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active alerts for the tenant' })
  findActive(@TenantId() tenantId: string) {
    return this.alertsService.findActiveByTenant(tenantId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get alert history (all resolved and active)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findHistory(
    @TenantId() tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.alertsService.findHistory(tenantId, page, limit);
  }

  @Get(':siloId')
  @ApiOperation({ summary: 'Get alerts for a specific silo' })
  @ApiQuery({ name: 'resolved', required: false, type: Boolean })
  findBySilo(
    @Param('siloId') siloId: string,
    @Query('resolved') resolved: string,
    @TenantId() tenantId: string,
  ) {
    return this.alertsService.findBySilo(siloId, tenantId, resolved === 'true');
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  acknowledge(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.acknowledge(id, user.sub, tenantId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  resolve(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertsService.resolve(id, user.sub, tenantId);
  }
}

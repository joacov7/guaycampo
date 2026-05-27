import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { HistoryService, type NotificationChannel, type NotificationStatus } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'List notification history with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'channel', required: false, enum: ['whatsapp', 'push', 'email', 'sms', 'multi'] })
  @ApiQuery({ name: 'status', required: false, enum: ['queued', 'sent', 'failed'] })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @TenantId() tenantId: string,
    @Query('type') type?: string,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.historyService.findAll({
      tenantId,
      type,
      channel,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics for the tenant' })
  getStats(@TenantId() tenantId: string) {
    return this.historyService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification detail by ID' })
  findOne(@Param('id') id: string) {
    return this.historyService.findById(id);
  }
}

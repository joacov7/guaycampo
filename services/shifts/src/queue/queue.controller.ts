import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/tenant.decorator';

class CallNextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scaleNumber?: string;
}

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get current queue state (real-time)' })
  getQueueState(@TenantId() tenantId: string) {
    return this.queueService.getQueueState(tenantId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get queue metrics: avg wait, max wait, processing now' })
  getMetrics(@TenantId() tenantId: string) {
    return this.queueService.getQueueMetrics(tenantId);
  }

  @Get('position/:truckShiftId')
  @ApiOperation({ summary: 'Get current queue position for a truck shift' })
  getPosition(
    @Param('truckShiftId') truckShiftId: string,
    @TenantId() tenantId: string,
  ) {
    return this.queueService.getPosition(truckShiftId, tenantId);
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Operator calls the next truck in the queue' })
  @ApiBody({ type: CallNextDto })
  callNext(
    @TenantId() tenantId: string,
    @CurrentUser() user: { sub?: string },
    @Body() _dto: CallNextDto,
  ) {
    return this.queueService.callNext(tenantId, user?.sub);
  }

  @Post('call/:truckShiftId')
  @ApiOperation({ summary: 'Operator calls a specific truck by ID' })
  @ApiBody({ type: CallNextDto })
  callSpecific(
    @Param('truckShiftId') truckShiftId: string,
    @TenantId() tenantId: string,
    @Body() dto: CallNextDto,
  ) {
    return this.queueService.callSpecific(truckShiftId, tenantId, dto.scaleNumber);
  }

  @Post(':truckShiftId/confirm-entry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm truck entered the scale' })
  confirmEntry(
    @Param('truckShiftId') truckShiftId: string,
    @TenantId() tenantId: string,
  ) {
    return this.queueService.confirmEntry(truckShiftId, tenantId);
  }
}

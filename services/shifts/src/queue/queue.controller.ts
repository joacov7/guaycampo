import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

class AddToQueueDto {
  @ApiPropertyOptional({ example: 'A1' })
  @IsOptional()
  @IsString()
  parkingZone?: string;
}

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get current queue' })
  getQueue(@TenantId() tenantId: string) {
    return this.queueService.getQueue(tenantId);
  }

  @Post('truck-shifts/:truckShiftId')
  @ApiOperation({ summary: 'Add a truck to the queue' })
  addToQueue(
    @Param('truckShiftId') truckShiftId: string,
    @Body() dto: AddToQueueDto,
    @TenantId() tenantId: string,
  ) {
    return this.queueService.addToQueue(truckShiftId, tenantId, dto.parkingZone);
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Call the next truck in the queue' })
  callNext(@TenantId() tenantId: string) {
    return this.queueService.callNext(tenantId);
  }

  @Post(':id/entered')
  @ApiOperation({ summary: 'Mark a truck as entered' })
  markEntered(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.queueService.markEntered(id, tenantId);
  }

  @Delete('truck-shifts/:truckShiftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a truck from the queue' })
  remove(
    @Param('truckShiftId') truckShiftId: string,
    @TenantId() tenantId: string,
  ) {
    return this.queueService.removeFromQueue(truckShiftId, tenantId);
  }
}

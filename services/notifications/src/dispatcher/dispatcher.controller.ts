import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { DispatcherService } from './dispatcher.service';

export class SendNotificationBodyDto {
  @IsString()
  type!: string;

  @IsEnum(['whatsapp', 'push', 'email', 'sms', 'multi'])
  channel!: 'whatsapp' | 'push' | 'email' | 'sms' | 'multi';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class SendBulkNotificationBodyDto {
  @IsString()
  type!: string;

  @IsEnum(['whatsapp', 'push', 'email', 'sms', 'multi'])
  channel!: 'whatsapp' | 'push' | 'email' | 'sms' | 'multi';

  recipients!: Array<{
    phone?: string;
    deviceToken?: string;
    email?: string;
  }>;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification (queued)' })
  send(
    @TenantId() tenantId: string,
    @Body() dto: SendNotificationBodyDto,
  ) {
    return this.dispatcherService.send({ ...dto, tenantId });
  }

  @Post('send-immediate')
  @ApiOperation({ summary: 'Send a notification immediately (for critical alerts)' })
  sendImmediate(
    @TenantId() tenantId: string,
    @Body() dto: SendNotificationBodyDto,
  ) {
    return this.dispatcherService.sendImmediate({ ...dto, tenantId });
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send notifications to multiple recipients' })
  async sendBulk(
    @TenantId() tenantId: string,
    @Body() dto: SendBulkNotificationBodyDto,
  ) {
    const results = await Promise.allSettled(
      dto.recipients.map((recipient) =>
        this.dispatcherService.send({
          ...dto,
          ...recipient,
          tenantId,
        }),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { total: dto.recipients.length, sent, failed };
  }
}

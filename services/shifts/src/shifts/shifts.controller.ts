import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

class AvailableSlotsQueryDto {
  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commodityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationType?: string;
}

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List all shift schedules with filters' })
  @ApiQuery({ name: 'date', required: false, example: '2024-03-15' })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'operationType', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
    @Query('commodityId') commodityId?: string,
    @Query('status') status?: string,
    @Query('operationType') operationType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shiftsService.findAll(tenantId, {
      date,
      commodityId,
      status,
      operationType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available slots by date, commodity and operation type' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'commodityId', required: false })
  @ApiQuery({ name: 'operationType', required: false })
  getAvailableSlots(
    @TenantId() tenantId: string,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    const today = new Date().toISOString().split('T')[0];
    return this.shiftsService.getAvailableSlots(
      query.date ?? today,
      query.commodityId ?? '',
      query.operationType ?? '',
      tenantId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift schedule by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.shiftsService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new shift schedule' })
  create(@Body() dto: CreateShiftDto, @TenantId() tenantId: string) {
    return this.shiftsService.create(dto, tenantId);
  }

  @Post('open-today')
  @ApiOperation({ summary: 'Open shifts for today (can be triggered manually or by cron)' })
  openForToday(@TenantId() tenantId: string) {
    return this.shiftsService.openForToday(tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift schedule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @TenantId() tenantId: string,
  ) {
    return this.shiftsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift schedule (soft delete if no trucks)' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.shiftsService.remove(id, tenantId);
  }
}

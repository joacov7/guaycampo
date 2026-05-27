import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiBody,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TrucksService } from './trucks.service';
import { CreateTruckShiftDto } from './dto/create-truck-shift.dto';
import { UpdateTruckShiftDto } from './dto/update-truck-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

class CheckInDto {
  @ApiProperty({ example: 'uuid:abcd1234' })
  @IsString()
  qrCode!: string;
}

@ApiTags('trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get('shifts')
  @ApiOperation({ summary: 'List all truck shifts for the tenant' })
  @ApiQuery({ name: 'shiftId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
  ) {
    return this.trucksService.findAll(tenantId, shiftId, status);
  }

  @Get('driver/:driverId')
  @ApiOperation({ summary: "Get driver's shift history" })
  getDriverShifts(
    @Param('driverId') driverId: string,
    @TenantId() tenantId: string,
  ) {
    return this.trucksService.getDriverShifts(driverId, tenantId);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Get truck shift by QR code' })
  findByQr(@Param('qrCode') qrCode: string, @TenantId() tenantId: string) {
    return this.trucksService.findByQrCode(qrCode, tenantId);
  }

  @Get('shifts/:id')
  @ApiOperation({ summary: 'Get a specific truck shift by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.trucksService.findOne(id, tenantId);
  }

  @Post('shifts')
  @ApiOperation({ summary: 'Create a new truck shift (book a slot)' })
  create(@Body() dto: CreateTruckShiftDto, @TenantId() tenantId: string) {
    return this.trucksService.createTruckShift(dto, tenantId);
  }

  @Post('shifts/checkin')
  @ApiOperation({ summary: 'Check in a truck via QR code at plant gate' })
  @ApiBody({ type: CheckInDto })
  checkIn(@Body() dto: CheckInDto, @TenantId() tenantId: string) {
    return this.trucksService.checkIn(dto.qrCode, tenantId);
  }

  @Post('shifts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a truck shift and return slot' })
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.trucksService.cancel(id, tenantId);
  }

  @Patch('shifts/:id')
  @ApiOperation({ summary: 'Update a truck shift' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTruckShiftDto,
    @TenantId() tenantId: string,
  ) {
    return this.trucksService.update(id, dto, tenantId);
  }
}

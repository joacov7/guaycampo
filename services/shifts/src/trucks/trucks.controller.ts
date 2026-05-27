import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrucksService } from './trucks.service';
import { CreateTruckShiftDto } from './dto/create-truck-shift.dto';
import { UpdateTruckShiftDto } from './dto/update-truck-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get()
  @ApiOperation({ summary: 'List all truck shifts' })
  @ApiQuery({ name: 'shiftId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
  ) {
    return this.trucksService.findAll(tenantId, shiftId, status);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Get truck shift by QR code' })
  findByQr(@Param('qrCode') qrCode: string, @TenantId() tenantId: string) {
    return this.trucksService.findByQrCode(qrCode, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get truck shift by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.trucksService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new truck shift' })
  create(@Body() dto: CreateTruckShiftDto, @TenantId() tenantId: string) {
    return this.trucksService.create(dto, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a truck shift' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTruckShiftDto,
    @TenantId() tenantId: string,
  ) {
    return this.trucksService.update(id, dto, tenantId);
  }
}

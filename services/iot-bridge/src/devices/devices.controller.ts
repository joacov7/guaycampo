// =============================================================================
// GuayCampo IoT Bridge — Devices Controller
// Local API for managing IoT device configuration and triggering test reads.
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import type { IoTDevice } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(private readonly devicesService: DevicesService) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List all configured devices' })
  findAll(): IoTDevice[] {
    return this.devicesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Register a new IoT device' })
  @ApiResponse({ status: 201, description: 'Device created' })
  create(@Body() dto: CreateDeviceDto): IoTDevice {
    return this.devicesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device status and last reading' })
  findOne(@Param('id') id: string): IoTDevice {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update device configuration' })
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto): IoTDevice {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a device' })
  remove(@Param('id') id: string): void {
    this.devicesService.remove(id);
  }
}

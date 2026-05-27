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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModuleRef } from '@nestjs/core';
import { DevicesService } from './devices.service';
import type { IoTDevice } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import type { ModbusBridgeService } from '../modbus/modbus-bridge.service';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly moduleRef: ModuleRef,
  ) {}

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

  // ---------------------------------------------------------------------------
  // Modbus actions
  // ---------------------------------------------------------------------------

  @Post(':id/test')
  @ApiOperation({ summary: 'Perform a single test read from the device' })
  async testRead(@Param('id') id: string): Promise<{ value: number; timestamp: string }> {
    const modbus = this.getModbusService();
    const value = await modbus.testRead(id);
    return { value, timestamp: new Date().toISOString() };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start polling for this device' })
  async startPolling(@Param('id') id: string): Promise<{ started: boolean }> {
    const device = this.devicesService.findOne(id);
    const modbus = this.getModbusService();
    if (!modbus.isConnected(id)) {
      await modbus.connectDevice(device);
    }
    modbus.startPolling(device);
    return { started: true };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop polling for this device' })
  stopPolling(@Param('id') id: string): { stopped: boolean } {
    const modbus = this.getModbusService();
    modbus.stopPolling(id);
    return { stopped: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getModbusService(): ModbusBridgeService {
    // Lazy lookup to avoid circular dependency at module init time
    return this.moduleRef.get(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../modbus/modbus-bridge.service').ModbusBridgeService,
      { strict: false },
    ) as ModbusBridgeService;
  }
}

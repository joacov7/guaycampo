// =============================================================================
// GuayCampo - Scale Devices Controller
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { DevicesService, ScaleDeviceStatus } from './devices.service';
import { ModbusService } from '../modbus/modbus.service';
import { CreateScaleDeviceDto, UpdateScaleDeviceDto } from '../modbus/dto/scale-device.dto';
import type { ScaleDevice } from './devices.service';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly modbusService: ModbusService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List scale devices for the tenant' })
  @ApiResponse({ status: 200, description: 'Array of scale devices' })
  findAll(@TenantId() tenantId: string): Promise<ScaleDevice[]> {
    return this.devicesService.findAll(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new scale device' })
  @ApiResponse({ status: 201, description: 'Device created' })
  async create(
    @Body() dto: CreateScaleDeviceDto,
    @TenantId() tenantId: string,
  ): Promise<ScaleDevice> {
    const device = await this.devicesService.create(dto, tenantId);
    // Attempt immediate connection in the background
    void this.modbusService.connectDevice(device).catch(() => void 0);
    return device;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device detail with connection status' })
  getStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ScaleDeviceStatus> {
    return this.devicesService.getStatusFull(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update device configuration' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScaleDeviceDto,
    @TenantId() tenantId: string,
  ): Promise<ScaleDevice> {
    return this.devicesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate (soft-delete) a device' })
  async deactivate(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ScaleDevice> {
    await this.modbusService.stopWeighing(id).catch(() => void 0);
    return this.devicesService.deactivate(id, tenantId);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Modbus TCP connection to device' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const device = await this.devicesService.getStatusFull(id, tenantId);
    return this.modbusService.testConnection(device);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start active polling (weighing session)' })
  async startPolling(@Param('id') id: string): Promise<{ started: boolean }> {
    const device = await this.devicesService.findOne(id);
    await this.modbusService.startWeighing(id);
    this.devicesService.setOnline(id);
    return { started: true };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop active polling' })
  async stopPolling(@Param('id') id: string): Promise<{ stopped: boolean }> {
    await this.modbusService.stopWeighing(id);
    return { stopped: true };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get current device status (online/offline, current weight)' })
  async getCurrentStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<ScaleDeviceStatus> {
    return this.devicesService.getStatusFull(id, tenantId);
  }
}

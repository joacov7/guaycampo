// =============================================================================
// GuayCampo IoT Bridge — Device Registry Service
// Wraps DevicesService with bridge-specific helpers for active device tracking.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import type { IoTDevice, DeviceStatus } from '../devices/devices.service';

@Injectable()
export class DeviceRegistryService {
  private readonly logger = new Logger(DeviceRegistryService.name);

  constructor(private readonly devicesService: DevicesService) {}

  getActiveDevices(): IoTDevice[] {
    return this.devicesService.findActive();
  }

  getDevice(id: string): IoTDevice {
    return this.devicesService.findOne(id);
  }

  getAllDevices(): IoTDevice[] {
    return this.devicesService.findAll();
  }

  setStatus(id: string, status: DeviceStatus): void {
    this.devicesService.setStatus(id, status);
  }

  updateReading(id: string, value: number): void {
    this.devicesService.updateReading(id, value);
  }

  getStatusSummary(): Record<DeviceStatus, number> {
    const devices = this.devicesService.findAll();
    const summary: Record<DeviceStatus, number> = {
      online: 0,
      offline: 0,
      error: 0,
      unknown: 0,
    };
    for (const device of devices) {
      summary[device.status]++;
    }
    return summary;
  }
}

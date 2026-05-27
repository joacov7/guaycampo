import { Module } from '@nestjs/common';
import { ModbusBridgeService } from './modbus-bridge.service';
import { DeviceRegistryService } from './device-registry.service';
import { BufferModule } from '../buffer/buffer.module';
import { DevicesModule } from '../devices/devices.module';
import { ConnectivityModule } from '../connectivity/connectivity.module';

@Module({
  imports: [BufferModule, DevicesModule, ConnectivityModule],
  providers: [DeviceRegistryService, ModbusBridgeService],
  exports: [ModbusBridgeService, DeviceRegistryService],
})
export class ModbusBridgeModule {}

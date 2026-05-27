// =============================================================================
// GuayCampo - Devices Module
// =============================================================================

import { Module, forwardRef } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { ModbusModule } from '../modbus/modbus.module';

@Module({
  imports: [forwardRef(() => ModbusModule)],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}

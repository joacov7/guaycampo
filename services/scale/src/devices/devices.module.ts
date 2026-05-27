// =============================================================================
// GuayCampo - Devices Module
// =============================================================================

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@guaycampo/database';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { ModbusModule } from '../modbus/modbus.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => ModbusModule)],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}

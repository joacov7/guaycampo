// =============================================================================
// GuayCampo - Modbus Module
// =============================================================================

import { Module, forwardRef } from '@nestjs/common';
import { ModbusService } from './modbus.service';
import { DevicesModule } from '../devices/devices.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => DevicesModule), WebsocketModule],
  providers: [ModbusService],
  exports: [ModbusService],
})
export class ModbusModule {}

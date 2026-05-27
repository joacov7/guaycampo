// =============================================================================
// GuayCampo - Tickets Module
// =============================================================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@guaycampo/database';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PdfService } from './pdf.service';
import { OcrModule } from '../ocr/ocr.module';
import { DevicesModule } from '../devices/devices.module';
import { ModbusModule } from '../modbus/modbus.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DatabaseModule, OcrModule, DevicesModule, ModbusModule, WebsocketModule],
  controllers: [TicketsController],
  providers: [TicketsService, PdfService],
  exports: [TicketsService],
})
export class TicketsModule {}

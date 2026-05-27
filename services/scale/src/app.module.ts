import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { RedisModule } from './redis/redis.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ModbusModule } from './modbus/modbus.module';
import { OcrModule } from './ocr/ocr.module';
import { TicketsModule } from './tickets/tickets.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    RedisModule,
    WebsocketModule,
    ModbusModule,
    OcrModule,
    TicketsModule,
    DevicesModule,
  ],
})
export class AppModule {}

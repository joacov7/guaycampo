import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ModbusBridgeModule } from './modbus/modbus-bridge.module';
import { MqttBridgeModule } from './mqtt/mqtt-bridge.module';
import { BufferModule } from './buffer/buffer.module';
import { ConnectivityModule } from './connectivity/connectivity.module';
import { OcrBridgeModule } from './ocr/ocr-bridge.module';
import { DevicesModule } from './devices/devices.module';
import { HealthModule } from './health/health.module';

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
      maxListeners: 30,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    BufferModule,
    ConnectivityModule,
    DevicesModule,
    MqttBridgeModule,
    ModbusBridgeModule,
    OcrBridgeModule,
    HealthModule,
  ],
})
export class AppModule {}

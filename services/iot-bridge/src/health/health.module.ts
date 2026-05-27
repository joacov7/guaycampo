import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BufferModule } from '../buffer/buffer.module';
import { ConnectivityModule } from '../connectivity/connectivity.module';
import { MqttBridgeModule } from '../mqtt/mqtt-bridge.module';
import { ModbusBridgeModule } from '../modbus/modbus-bridge.module';

@Module({
  imports: [BufferModule, ConnectivityModule, MqttBridgeModule, ModbusBridgeModule],
  controllers: [HealthController],
})
export class HealthModule {}

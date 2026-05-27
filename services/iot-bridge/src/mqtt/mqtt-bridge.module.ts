import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MqttBridgeService } from './mqtt-bridge.service';
import { TopicMapperService } from './topic-mapper.service';
import { BufferModule } from '../buffer/buffer.module';

@Module({
  imports: [BufferModule],
  providers: [MqttBridgeService, TopicMapperService],
  exports: [MqttBridgeService, TopicMapperService],
})
export class MqttBridgeModule implements OnModuleInit {
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    // Wire MqttBridgeService into ModbusBridgeService lazily to break
    // the potential circular dependency at module-init time.
    try {
      const modbusBridge = this.moduleRef.get(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../modbus/modbus-bridge.service').ModbusBridgeService,
        { strict: false },
      ) as { setMqttBridge: (bridge: MqttBridgeService) => void } | null;

      if (modbusBridge) {
        const mqttBridge = this.moduleRef.get(MqttBridgeService, { strict: false });
        modbusBridge.setMqttBridge(mqttBridge);
      }
    } catch {
      // ModbusBridgeService may not be loaded in all contexts (e.g. tests)
    }
  }
}

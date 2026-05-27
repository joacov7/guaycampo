import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { ReadingsModule } from '../readings/readings.module';
import { AlertsModule } from '../alerts/alerts.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    forwardRef(() => ReadingsModule),
    forwardRef(() => AlertsModule),
    WebsocketModule,
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}

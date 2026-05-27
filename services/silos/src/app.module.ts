import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { WebsocketModule } from './websocket/websocket.module';
import { MqttModule } from './mqtt/mqtt.module';
import { SilosModule } from './silos/silos.module';
import { ReadingsModule } from './readings/readings.module';
import { AlertsModule } from './alerts/alerts.module';
import { AerationModule } from './aeration/aeration.module';
import { MovementsModule } from './movements/movements.module';
import { NotificationsModule } from './notifications/notifications.module';

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
    DatabaseModule,
    WebsocketModule,
    NotificationsModule,
    MqttModule,
    ReadingsModule,
    AlertsModule,
    AerationModule,
    SilosModule,
    MovementsModule,
  ],
})
export class AppModule {}

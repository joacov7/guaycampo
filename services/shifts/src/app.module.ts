import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { RedisModule } from './redis/redis.module';
import { ShiftsModule } from './shifts/shifts.module';
import { QueueModule } from './queue/queue.module';
import { TrucksModule } from './trucks/trucks.module';
import { WebsocketModule } from './websocket/websocket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';

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
    NotificationsModule,
    ShiftsModule,
    QueueModule,
    TrucksModule,
    JobsModule,
  ],
})
export class AppModule {}

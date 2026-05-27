import { Module } from '@nestjs/common';
import { TrucksController } from './trucks.controller';
import { TrucksService } from './trucks.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [NotificationsModule, QueueModule, ShiftsModule, WebsocketModule],
  controllers: [TrucksController],
  providers: [TrucksService],
  exports: [TrucksService],
})
export class TrucksModule {}

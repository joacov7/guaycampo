import { Module, forwardRef } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { AlertsController } from './alerts.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => WebsocketModule),
    NotificationsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertRulesService],
  exports: [AlertsService],
})
export class AlertsModule {}

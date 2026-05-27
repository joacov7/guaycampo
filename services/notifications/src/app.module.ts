import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { WhatsAppModule } from './channels/whatsapp/whatsapp.module';
import { PushModule } from './channels/push/push.module';
import { EmailModule } from './channels/email/email.module';
import { SmsModule } from './channels/sms/sms.module';
import { TemplatesModule } from './templates/templates.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { HistoryModule } from './history/history.module';
import { NotificationEventsListener } from './events/notification-events.listener';

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
    WhatsAppModule,
    PushModule,
    EmailModule,
    SmsModule,
    TemplatesModule,
    DispatcherModule,
    HistoryModule,
  ],
  providers: [NotificationEventsListener],
})
export class AppModule {}

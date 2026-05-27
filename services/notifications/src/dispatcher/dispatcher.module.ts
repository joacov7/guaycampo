import { Module } from '@nestjs/common';
import { DispatcherService } from './dispatcher.service';
import { DispatcherController } from './dispatcher.controller';
import { WhatsAppModule } from '../channels/whatsapp/whatsapp.module';
import { PushModule } from '../channels/push/push.module';
import { EmailModule } from '../channels/email/email.module';
import { SmsModule } from '../channels/sms/sms.module';
import { TemplatesModule } from '../templates/templates.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [
    WhatsAppModule,
    PushModule,
    EmailModule,
    SmsModule,
    TemplatesModule,
    HistoryModule,
  ],
  providers: [DispatcherService],
  controllers: [DispatcherController],
  exports: [DispatcherService],
})
export class DispatcherModule {}

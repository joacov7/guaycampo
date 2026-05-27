import { Module } from '@nestjs/common';
import { RemindersJob } from './reminders.job';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [RemindersJob],
})
export class JobsModule {}

import { Module } from '@nestjs/common';
import { RetentionsService } from './retentions.service';

@Module({
  providers: [RetentionsService],
  exports: [RetentionsService],
})
export class RetentionsModule {}

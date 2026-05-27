import { Module } from '@nestjs/common';
import { BufferService } from './buffer.service';
import { SyncService } from './sync.service';

@Module({
  providers: [BufferService, SyncService],
  exports: [BufferService, SyncService],
})
export class BufferModule {}

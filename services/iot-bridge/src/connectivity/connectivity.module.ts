import { Module } from '@nestjs/common';
import { ConnectivityService } from './connectivity.service';

@Module({
  providers: [ConnectivityService],
  exports: [ConnectivityService],
})
export class ConnectivityModule {}

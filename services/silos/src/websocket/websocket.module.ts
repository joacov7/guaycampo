import { Module } from '@nestjs/common';
import { SilosGateway } from './silos.gateway';

@Module({
  providers: [SilosGateway],
  exports: [SilosGateway],
})
export class WebsocketModule {}

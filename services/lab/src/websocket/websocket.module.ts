import { Module } from '@nestjs/common';
import { LabGateway } from './lab.gateway';

@Module({
  providers: [LabGateway],
  exports: [LabGateway],
})
export class WebsocketModule {}

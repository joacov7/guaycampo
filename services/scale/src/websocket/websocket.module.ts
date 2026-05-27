import { Module } from '@nestjs/common';
import { ScaleGateway } from './scale.gateway';

@Module({
  providers: [ScaleGateway],
  exports: [ScaleGateway],
})
export class WebsocketModule {}

import { Module } from '@nestjs/common';
import { OcrBridgeService } from './ocr-bridge.service';

@Module({
  providers: [OcrBridgeService],
  exports: [OcrBridgeService],
})
export class OcrBridgeModule {}

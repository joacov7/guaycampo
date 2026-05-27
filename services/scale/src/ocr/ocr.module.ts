// =============================================================================
// GuayCampo - OCR Module
// =============================================================================

import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { CameraService } from './camera.service';

@Module({
  providers: [OcrService, CameraService],
  exports: [OcrService, CameraService],
})
export class OcrModule {}

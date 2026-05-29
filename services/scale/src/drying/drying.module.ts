// =============================================================================
// GuayCampo - Drying Module
// =============================================================================

import { Module } from '@nestjs/common';
import { DryingService } from './drying.service';
import { DryingController } from './drying.controller';

@Module({
  controllers: [DryingController],
  providers: [DryingService],
  exports: [DryingService],
})
export class DryingModule {}

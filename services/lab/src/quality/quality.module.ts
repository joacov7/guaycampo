import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityParamsService } from './quality-params.service';
import { QualityParamsController } from './quality-params.controller';

@Module({
  controllers: [QualityParamsController],
  providers: [QualityService, QualityParamsService],
  exports: [QualityService, QualityParamsService],
})
export class QualityModule {}

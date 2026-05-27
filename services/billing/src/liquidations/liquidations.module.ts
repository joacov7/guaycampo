import { Module } from '@nestjs/common';
import { LiquidationsService } from './liquidations.service';
import { LiquidationsController } from './liquidations.controller';
import { AfipModule } from '../afip/afip.module';
import { RetentionsModule } from '../retentions/retentions.module';
import { PdfModule } from '../pdf/pdf.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AfipModule, RetentionsModule, PdfModule, AccountModule],
  providers: [LiquidationsService],
  controllers: [LiquidationsController],
  exports: [LiquidationsService],
})
export class LiquidationsModule {}

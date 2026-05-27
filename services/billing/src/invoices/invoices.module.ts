import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AfipModule } from '../afip/afip.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [AfipModule, PdfModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}

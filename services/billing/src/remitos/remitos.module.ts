// TODO: register in app.module.ts
import { Module } from '@nestjs/common';
import { RemitosService } from './remitos.service';
import { RemitosController } from './remitos.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [PdfModule],
  providers: [RemitosService],
  controllers: [RemitosController],
  exports: [RemitosService],
})
export class RemitosModule {}

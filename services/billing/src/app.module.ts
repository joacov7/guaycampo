import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { AfipModule } from './afip/afip.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LiquidationsModule } from './liquidations/liquidations.module';
import { RetentionsModule } from './retentions/retentions.module';
import { AccountModule } from './account/account.module';
import { PdfModule } from './pdf/pdf.module';
import { ContractsModule } from './contracts/contracts.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    CommonModule,
    AfipModule,
    InvoicesModule,
    LiquidationsModule,
    RetentionsModule,
    AccountModule,
    PdfModule,
    ContractsModule,
    ReportsModule,
  ],
})
export class AppModule {}

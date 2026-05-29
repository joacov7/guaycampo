import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { SamplesModule } from './samples/samples.module';
import { QualityModule } from './quality/quality.module';
import { AnalyzersModule } from './analyzers/analyzers.module';
import { ReportsModule } from './reports/reports.module';
import { CertificatesModule } from './certificates/certificates.module';

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
    SamplesModule,
    QualityModule,
    AnalyzersModule,
    ReportsModule,
    CertificatesModule,
  ],
})
export class AppModule {}

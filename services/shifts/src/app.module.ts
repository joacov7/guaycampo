import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { ShiftsModule } from './shifts/shifts.module';
import { QueueModule } from './queue/queue.module';
import { TrucksModule } from './trucks/trucks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CommonModule,
    ShiftsModule,
    QueueModule,
    TrucksModule,
  ],
})
export class AppModule {}

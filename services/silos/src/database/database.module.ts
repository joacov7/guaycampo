import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: (configService: ConfigService): Pool => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err: Error) => {
          console.error('[PG Pool] Unexpected error:', err.message);
        });

        return pool;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['PG_POOL'],
})
export class DatabaseModule {}

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService): Redis => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');
        const db = configService.get<number>('REDIS_DB', 0);

        const client = new Redis({
          host,
          port,
          ...(password ? { password } : {}),
          db,
          lazyConnect: false,
          retryStrategy: (times: number) => {
            if (times > 10) return null;
            return Math.min(times * 100, 3000);
          },
        });

        client.on('connect', () => {
          console.log(`[Redis/Lab] Connected to ${host}:${port}`);
        });

        client.on('error', (err: Error) => {
          console.error(`[Redis/Lab] Error: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

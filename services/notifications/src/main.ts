import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawHandler = (req: any, res: any) => void;

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Health check endpoints (outside the /api global prefix)
  const httpAdapter = app.getHttpAdapter();
  (httpAdapter.get as (path: string, handler: RawHandler) => void)('/health', (_req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.json({ status: 'ok', service: 'notifications', timestamp: new Date().toISOString() });
  });
  (httpAdapter.get as (path: string, handler: RawHandler) => void)('/ready', (_req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.json({ status: 'ready', service: 'notifications', timestamp: new Date().toISOString() });
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('GuayCampo Notifications Service')
    .setDescription('Centralized notification service — WhatsApp, FCM push, email, SMS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.NOTIFICATIONS_SERVICE_PORT ?? 3007;
  await app.listen(port);
  logger.log(`Notifications service running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

void bootstrap();

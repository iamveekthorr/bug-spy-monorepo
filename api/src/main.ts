import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

import { Environment } from './env.validate';
import { WinstonModule } from 'nest-winston';

import { instance } from './logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin:
        process.env.NODE_ENV === Environment.PRODUCTION
          ? process.env.FRONTEND_URL || false
          : ['http://localhost:3000', 'http://localhost:5173'], // Dev: Allow local frontend
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    logger: WinstonModule.createLogger({ instance }),
  });

  // Enable graceful shutdown - NestJS will handle SIGTERM and SIGINT
  // and call onModuleDestroy/onApplicationShutdown lifecycle hooks
  app.enableShutdownHooks();

  // Add application version
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');

  if (process.env.NODE_ENV !== Environment.PRODUCTION) {
    app.use(morgan('tiny'));
  }

  if (process.env.NODE_ENV === Environment.PRODUCTION) {
    // Enable security middleware
    app.use(helmet());
  }

  // Enable compression middleware
  app.use(compression());

  await app.listen(process.env.PORT ?? 4000, () => {
    new Logger('AppLogStarter').log(`App is running on: ${process.env.PORT}`);
  });
}
void bootstrap();

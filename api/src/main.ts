import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';

import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

import { Signals } from './enums/signals.enum';
import { Environment } from './env.validate';
import { WinstonModule } from 'nest-winston';

import { instance } from './logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: '*', methods: '*' },
    logger: WinstonModule.createLogger({ instance }),
  });

  // Enable graceful shutdown to allow proper cleanup
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

  process.on(Signals.UNHANDLED_REJECTION, (reason: any) => {
    // Don't shut down for browser/Playwright related errors - these are expected
    // during normal browser lifecycle management

    // Only shutdown for critical application errors
    console.error('Critical error detected, shutting down...');
    app
      .close()
      .then(() => console.error('Unhandled promise rejection:', reason))
      .catch(() => {
        console.error('Failed to close app gracefully');
        process.exit(1);
      });
  });

  process.on(Signals.SIGTERM, () => {
    app
      .close()
      .then()
      .catch(() => {
        console.info('SIGTERM signal received. Shutting down...');
      });
  });

  process.on(Signals.SIGINT, () => {
    console.log('SIGINT signal received. Shutting down gracefully...');
    app
      .close()
      .then(() => {
        console.log('Application closed successfully.');
        process.exit(0);
      })
      .catch((error: unknown) => {
        console.error(
          'Error during graceful shutdown:',
          (error as any)?.message,
        );
        process.exit(1);
      });
  });
}
void bootstrap();

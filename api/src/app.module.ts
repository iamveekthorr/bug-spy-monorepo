import { Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

import { validate } from './env.validate';

import { ValidationPipe } from './pipes/validation.pipe';
import { GlobalExceptionsFilter } from './filters/exception.filter';

import { ResponseInterceptor } from './interceptors/response.interceptor';

import { CaptureMetricsModule } from './capture-metrics/capture-metrics.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AbortInterceptor } from './interceptors/abort.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('MONGO_PASSWORD');
        const uri = config
          .get<string>('MONGO_URI')
          ?.replace('<PASSWORD>', password!);

        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService) => {
        const stores = createKeyv(config.get<string>('REDIS_URL'), {
          namespace: 'app-cache',
        });
        return {
          stores,
        };
      },
      inject: [ConfigService],
    }),
    CaptureMetricsModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    { provide: APP_FILTER, useClass: GlobalExceptionsFilter },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    { provide: APP_INTERCEPTOR, useClass: AbortInterceptor },
    JwtService,
    Logger,
  ],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new Logger(AppModule.name);

  onApplicationShutdown(signal?: string): void {
    this.logger.log(`Application shutting down on signal: ${signal}`);
    this.logger.log('Application shutdown complete');
  }
}

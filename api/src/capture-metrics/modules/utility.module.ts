import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PuppeteerHelpersService } from '../services/puppeteer-helpers.service';
import { DeviceConfigService } from '../services/device-config.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { PersistenceService } from '../services/persistence.service';
import { S3StorageService } from '../services/s3-storage.service';
import { TestResult, TestResultSchema } from '../schemas/test-result.schema';

/**
 * Utility Module
 *
 * Provides utility services and helpers:
 * - Puppeteer helpers for DOM manipulation
 * - Device configuration for responsive testing
 * - Rate limiting for API protection
 * - Error handling and formatting
 * - Data persistence (database and cache)
 *
 * NOTE: TimeoutService is available globally via BrowserManagementModule
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestResult.name, schema: TestResultSchema },
    ]),
  ],
  providers: [
    PuppeteerHelpersService,
    DeviceConfigService,
    RateLimiterService,
    ErrorHandlerService,
    PersistenceService,
    S3StorageService,
  ],
  exports: [
    PuppeteerHelpersService,
    DeviceConfigService,
    RateLimiterService,
    ErrorHandlerService,
    PersistenceService,
    S3StorageService,
  ],
})
export class UtilityModule {}

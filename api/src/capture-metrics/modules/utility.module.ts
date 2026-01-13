import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PuppeteerHelpersService } from '../services/puppeteer-helpers.service';
import { DeviceConfigService } from '../services/device-config.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { PersistenceService } from '../services/persistence.service';
import { BrowserManagementModule } from './browser-management.module';
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
 */
@Module({
  imports: [
    BrowserManagementModule, // PuppeteerHelpers needs TimeoutService
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
  ],
  exports: [
    PuppeteerHelpersService,
    DeviceConfigService,
    RateLimiterService,
    ErrorHandlerService,
    PersistenceService,
  ],
})
export class UtilityModule {}

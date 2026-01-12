import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Core services
import { ScreenshotsService } from './services/screenshots.service';
import { CookiesService } from './services/cookies.service';
import { WebMetricsService } from './services/web-metrics.service';
import { DeviceConfigService } from './services/device-config.service';
import { CaptureOrchestratorService } from './services/capture-orchestrator.service';
import { ConsoleErrorsService } from './services/console-errors.service';

// Production-ready services
import { RateLimiterService } from './services/rate-limiter.service';
import { ErrorHandlerService } from './services/error-handler.service';
import { BrowserPoolService } from './services/browser-pool.service';
import { PuppeteerHelpersService } from './services/puppeteer-helpers.service';
import { IntelligentTimeoutService } from './services/intelligent-timeout.service';
import { CaptureMetricsController } from './capture-metrics.controller';

// Schemas
import { TestResult, TestResultSchema } from './schemas/test-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestResult.name, schema: TestResultSchema },
    ]),
  ],
  providers: [
    // Core services
    ScreenshotsService,
    CookiesService,
    WebMetricsService,
    DeviceConfigService,
    CaptureOrchestratorService,
    ConsoleErrorsService,
    // Production services
    RateLimiterService,
    ErrorHandlerService,
    PuppeteerHelpersService,
    IntelligentTimeoutService,
    {
      provide: BrowserPoolService,
      useFactory: (intelligentTimeout: IntelligentTimeoutService) => {
        return new BrowserPoolService(
          5, // maxSize - up to 5 concurrent pages
          0, // idleTimeoutMs - disabled for now
          60000, // idleCheckIntervalMs
          intelligentTimeout, // inject intelligent timeout service
        );
      },
      inject: [IntelligentTimeoutService],
    },
  ],
  controllers: [CaptureMetricsController],
  exports: [BrowserPoolService], // Export so AppModule can inject it
})
export class CaptureMetricsModule {}

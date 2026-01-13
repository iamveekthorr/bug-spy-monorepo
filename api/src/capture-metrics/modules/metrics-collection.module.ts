import { Module } from '@nestjs/common';
import { WebMetricsService } from '../services/web-metrics.service';
import { ScreenshotsService } from '../services/screenshots.service';
import { CookiesService } from '../services/cookies.service';
import { ConsoleErrorsService } from '../services/console-errors.service';

/**
 * Metrics Collection Module
 *
 * Handles all types of web metrics capture:
 * - Performance metrics (Core Web Vitals, Network, Resources)
 * - Screenshots (progressive capture during page load)
 * - Cookie detection and handling
 * - Console errors and JavaScript errors
 */
@Module({
  providers: [
    WebMetricsService,
    ScreenshotsService,
    CookiesService,
    ConsoleErrorsService,
  ],
  exports: [
    WebMetricsService,
    ScreenshotsService,
    CookiesService,
    ConsoleErrorsService,
  ],
})
export class MetricsCollectionModule {}

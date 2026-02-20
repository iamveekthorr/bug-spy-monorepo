import { Module } from '@nestjs/common';
import { WebMetricsService } from '../services/web-metrics.service';
import { ScreenshotsService } from '../services/screenshots.service';
import { CookiesService } from '../services/cookies.service';
import { ConsoleErrorsService } from '../services/console-errors.service';
import { LighthouseService } from '../services/lighthouse.service';
import { SeoMetricsService } from '../services/seo-metrics.service';
import { UtilityModule } from './utility.module';

/**
 * Metrics Collection Module
 *
 * Handles all types of web metrics capture:
 * - Performance metrics (Core Web Vitals, Network, Resources)
 * - Lighthouse audits (accurate performance scoring)
 * - SEO analysis (comprehensive SEO checks)
 * - Screenshots (progressive capture during page load)
 * - Cookie detection and handling
 * - Console errors and JavaScript errors
 *
 * NOTE: BrowserPoolService is available globally via BrowserManagementModule
 */
@Module({
  imports: [UtilityModule],
  providers: [
    WebMetricsService,
    LighthouseService,
    SeoMetricsService,
    ScreenshotsService,
    CookiesService,
    ConsoleErrorsService,
  ],
  exports: [
    WebMetricsService,
    LighthouseService,
    SeoMetricsService,
    ScreenshotsService,
    CookiesService,
    ConsoleErrorsService,
  ],
})
export class MetricsCollectionModule {}

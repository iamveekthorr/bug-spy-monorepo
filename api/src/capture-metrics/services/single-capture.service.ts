import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Page } from 'puppeteer';

import {
  CookieHandlingResult,
  ScreenshotResult,
  TestResults,
} from '../interfaces/cache.interface';

import { BrowserPoolService } from './browser-pool.service';
import { WebMetricsService } from './web-metrics.service';
import { ScreenshotsService } from './screenshots.service';
import { CookiesService } from './cookies.service';
import { DeviceConfigService } from './device-config.service';
import { ConsoleErrorsService } from './console-errors.service';
import { PuppeteerHelpersService } from './puppeteer-helpers.service';
import { PersistenceService } from './persistence.service';
import { CreateCaptureData } from '~/dto/create-capture-data';

/**
 * Single Capture Service
 *
 * Handles single URL capture operations with:
 * - Page acquisition and configuration
 * - Service coordination (metrics, screenshots, cookies, console errors)
 * - Observable/SSE streaming for real-time progress
 * - Resource cleanup and error handling
 * - Temporary cache storage
 *
 * Extracted from CaptureOrchestratorService to follow Single Responsibility Principle
 */
@Injectable()
export class SingleCaptureService {
  private readonly logger = new Logger(SingleCaptureService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly webMetricsService: WebMetricsService,
    private readonly screenshotsService: ScreenshotsService,
    private readonly cookiesService: CookiesService,
    private readonly deviceConfigService: DeviceConfigService,
    private readonly consoleErrorsService: ConsoleErrorsService,
    private readonly puppeteerHelpers: PuppeteerHelpersService,
    private readonly persistenceService: PersistenceService,
  ) {
    this.logger.log('SingleCaptureService initialized');
  }

  /**
   * Execute single URL capture with Observable streaming
   *
   * @param captureData - Capture configuration
   * @param abortSignal - Optional abort signal for cancellation
   * @returns Observable stream of capture progress and results
   */
  executeCapture(
    captureData: CreateCaptureData,
    abortSignal?: AbortSignal,
  ): Observable<any> {
    return new Observable((subscriber) => {
      this.executeCaptureInternal(subscriber, captureData, abortSignal)
        .catch((error) => {
          this.logger.error('Capture execution failed:', error);
          subscriber.error(error);
        });
    });
  }

  /**
   * Internal capture execution logic
   *
   * @param subscriber - Observable subscriber for streaming updates
   * @param captureData - Capture configuration
   * @param abortSignal - Optional abort signal
   * @param pageTracker - Optional callback to track page reference
   * @param timeoutChecker - Optional callback to check timeout status
   */
  private async executeCaptureInternal(
    subscriber: any,
    captureData: CreateCaptureData,
    abortSignal?: AbortSignal,
    pageTracker?: (page: Page | null) => void,
    timeoutChecker?: () => boolean,
  ): Promise<void> {
    const {
      url,
      deviceType = 'desktop',
      testType = 'performance',
      includeScreenshots = true,
      testId,
    } = captureData;
    let page: Page | null = null;
    let routeHandler: any = null;

    // Collect results from all services
    const results: TestResults = {
      url,
      deviceType,
      testType,
      testId,
      timestamp: Date.now(),
      status: 'running',
      cookieHandling: null,
      webMetrics: null,
      screenshots: null,
      consoleErrors: null,
    };

    try {
      // Send starting status
      subscriber.next({
        data: { status: 'STARTING', url, deviceType, testType },
      });

      // Acquire page from pool
      page = await this.browserPool.requirePage();
      if (pageTracker) pageTracker(page); // Track page for cleanup
      subscriber.next({ data: { status: 'PAGE_ACQUIRED' } });

      // Configure page for specific device
      await this.deviceConfigService.configurePageForDevice(page, deviceType);
      subscriber.next({ data: { status: 'DEVICE_CONFIGURED', deviceType } });

      // Block heavy resources on low-memory servers to speed up loading
      const isLowResource =
        process.env.RENDER || process.env.NODE_ENV === 'production';

      if (isLowResource) {
        routeHandler = (route: any, request: any) => {
          const resourceType = request.resourceType();
          const resourceUrl = request.url();

          // Block heavy resources that slow down performance testing
          if (
            resourceType === 'image' &&
            (resourceUrl.includes('.jpg') ||
              resourceUrl.includes('.png') ||
              resourceUrl.includes('.gif'))
          ) {
            route.abort();
          } else if (resourceType === 'font' || resourceType === 'media') {
            route.abort();
          } else {
            route.continue();
          }
        };
        await this.puppeteerHelpers.setupRequestInterception(
          page,
          routeHandler,
        );
      }

      // Navigate with enhanced cancellation support
      this.logger.log(`Navigating to URL: ${url}`);

      // Create cancellation-aware navigation with shorter timeout for low-memory environments
      const navigationPromise = page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000, // Reduced timeout for memory-constrained servers
      });
      await Promise.race([navigationPromise]);

      subscriber.next({ data: { status: 'NAVIGATION_COMPLETE', url } });

      // Now start services with optimized sequencing for performance testing
      const servicePromises: Promise<void>[] = [];

      // For performance tests, prioritize accurate metrics over cookie handling
      if (testType === 'performance') {
        // Start metrics collection immediately for clean baseline measurements
        servicePromises.push(
          this.runService(
            'METRICS',
            this.webMetricsService.captureWebMetrics(page, testType),
            subscriber,
            results,
          ),
        );

        // Run cookie detection in non-intrusive mode during performance testing
        // This detects but doesn't click banners to avoid interfering with metrics
        servicePromises.push(
          this.runService(
            'COOKIES',
            this.cookiesService.detectCookieConsent(page, url),
            subscriber,
            results,
          ),
        );
      } else {
        // For non-performance tests, normal cookie handling is fine
        servicePromises.push(
          this.runService(
            'COOKIES',
            this.cookiesService.handleCookieConsent(page, url),
            subscriber,
            results,
          ),
        );
      }

      // Console errors (start early to capture all errors)
      servicePromises.push(
        this.runService(
          'CONSOLE_ERRORS',
          this.consoleErrorsService.processConsoleErrorsWithProgress(
            page,
            testId || '',
          ),
          subscriber,
          results,
        ),
      );

      // Screenshots (safe to run after navigation)
      if (includeScreenshots) {
        servicePromises.push(
          this.runService(
            'SCREENSHOTS',
            this.screenshotsService.captureScreenshots(page, {
              testId: testId || `test-${Date.now()}`, // Use testId or generate fallback
              deviceType,
              interval: 300,
              maxDuration: 6000,
              maxFrames: 10,
            }),
            subscriber,
            results,
          ),
        );
      }

      // Wait for all services to complete in parallel
      await Promise.allSettled(servicePromises);

      // Mark test as completed since all services finished
      results.status = 'completed';

      // Clean up route handler early to prevent hanging during page release
      if (page && routeHandler && !page.isClosed()) {
        try {
          this.logger.debug(
            'Early route handler cleanup (before cache/page operations)...',
          );

          await Promise.race([
            this.puppeteerHelpers.removeRequestInterception(page),
            new Promise((_, reject) =>
              setTimeout(() => {
                reject(new Error('Early route handler cleanup timeout'));
              }, 3000),
            ),
          ]);

          this.logger.debug('Early route handler cleanup completed');
          routeHandler = null; // Mark as cleaned up
        } catch (cleanupError: unknown) {
          const errorMessage =
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError);
          this.logger.warn('Early route handler cleanup failed:', errorMessage);
          routeHandler = null; // Still mark as cleaned up to avoid duplicate cleanup
        }
      }

      // Store results temporarily for later saving
      if (testId) {
        try {
          this.logger.debug('Storing temp result to cache...');

          // Add timeout protection for cache operations
          await Promise.race([
            this.persistenceService.cacheTestResult(testId, captureData, results),
            new Promise((_, reject) =>
              setTimeout(() => {
                reject(new Error('Cache storage timeout after 3 seconds'));
              }, 3000),
            ),
          ]);

          this.logger.debug('Temp result stored successfully');
        } catch (cacheError: unknown) {
          const errorMessage =
            cacheError instanceof Error
              ? cacheError.message
              : String(cacheError);
          this.logger.warn('Cache storage failed (non-fatal):', errorMessage);
          // Continue processing - cache failures shouldn't break the request
        }
      }

      // Send final complete response with testId
      const completionTime = Date.now();
      const totalProcessingTime = completionTime - results.timestamp;

      this.logger.log(
        'Final results before sending:',
        JSON.stringify({
          testId: testId || 'none',
          webMetrics: results.webMetrics ? 'PRESENT' : 'NULL',
          cookieHandling: results.cookieHandling ? 'PRESENT' : 'NULL',
          screenshots: results.screenshots ? 'PRESENT' : 'NULL',
          consoleErrors: results.consoleErrors ? 'PRESENT' : 'NULL',
          totalProcessingTime: `${totalProcessingTime}ms`,
          routeHandlerUsed: !!routeHandler,
          isProduction: process.env.NODE_ENV === 'production',
        }),
      );

      try {
        this.logger.debug('Sending COMPLETE status to subscriber...');

        subscriber.next({
          data: {
            status: 'COMPLETE',
            testId: testId || undefined,
            testStatus: results.status,
            results: results,
            summary: {
              totalDuration: Date.now() - results.timestamp,
              servicesRun: [
                'cookies',
                ...(testType === 'performance' ? ['webMetrics'] : []),
                ...(includeScreenshots ? ['screenshots'] : []),
              ],
            },
          },
        });

        this.logger.debug('COMPLETE status sent, completing subscriber...');
        subscriber.complete();
        this.logger.debug('Subscriber completed successfully');
      } catch (completionError: unknown) {
        const errorMessage =
          completionError instanceof Error
            ? completionError.message
            : String(completionError);
        this.logger.error('Error during completion phase:', errorMessage);

        try {
          subscriber.error(completionError);
        } catch (errorNotifyError) {
          this.logger.error(
            'Could not notify subscriber of completion error:',
            errorNotifyError,
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error during capture execution:', errorMessage);

      // Mark test as failed
      results.status = 'failed';

      subscriber.next({ data: { status: 'ERROR', error: errorMessage } });
      subscriber.complete();
    } finally {
      // Secondary route handler cleanup (if early cleanup failed or was skipped)
      if (page && routeHandler && !page.isClosed()) {
        try {
          this.logger.debug('Secondary route handler cleanup...');

          await Promise.race([
            this.puppeteerHelpers.removeRequestInterception(page),
            new Promise(
              (_, reject) =>
                setTimeout(() => {
                  reject(new Error('Secondary route handler cleanup timeout'));
                }, 2000), // Shorter timeout for secondary cleanup
            ),
          ]);

          this.logger.debug('Secondary route handler cleanup completed');
        } catch (unrouteError: unknown) {
          const errorMessage =
            unrouteError instanceof Error
              ? unrouteError.message
              : String(unrouteError);
          this.logger.warn(
            'Secondary route handler cleanup failed (non-fatal):',
            errorMessage,
          );
        }
      }

      // Always release the page back to the pool
      if (page && this.browserPool.isPageTracked(page)) {
        try {
          await this.browserPool.releasePage(page);
          if (pageTracker) pageTracker(null); // Clear page reference
          this.logger.debug('Page successfully released back to pool');
        } catch (releaseError: unknown) {
          const errorMessage =
            releaseError instanceof Error
              ? releaseError.message
              : String(releaseError);
          this.logger.error('Error releasing page back to pool:', errorMessage);
          // Don't throw - we don't want page release errors to crash the server
        }
      } else if (page) {
        this.logger.warn(
          'Page not tracked by pool, attempting to close directly',
        );
        try {
          if (!page.isClosed()) {
            await page.close();
          }
        } catch (closeError: unknown) {
          const errorMessage =
            closeError instanceof Error
              ? closeError.message
              : String(closeError);
          this.logger.error('Error closing untracked page:', errorMessage);
        }
      }
    }
  }

  /**
   * Run a service generator to completion with proper error handling and progress streaming
   *
   * @param name - Service name for logging
   * @param generator - Async generator from service
   * @param subscriber - Observable subscriber for streaming updates
   * @param results - Results object to collect data into
   */
  private async runService(
    name: string,
    generator: AsyncGenerator<any>,
    subscriber: any,
    results: TestResults,
  ): Promise<void> {
    try {
      for await (const result of generator) {
        subscriber.next({ data: result });
        this.collectServiceResult(result, results);
      }
    } catch (error) {
      this.logger.error(`${name} service error:`, error);
    }
  }

  /**
   * Collect results from service generators into results object
   *
   * @param data - Data from service generator
   * @param results - Results object to populate
   */
  private collectServiceResult(data: any, results: TestResults): void {
    if (!data || typeof data !== 'object') {
      this.logger.debug('collectServiceResult: Invalid data received', data);
      return;
    }

    this.logger.log(
      'collectServiceResult: Raw data received:',
      JSON.stringify(data),
    );
    this.logger.log(
      `collectServiceResult: Processing event with status: ${data.status}`,
    );

    // Collect web metrics
    if (data.status === 'METRICS_COMPLETE' && data.data) {
      this.logger.log('Collecting METRICS_COMPLETE data', data.data);
      results.webMetrics = data.data;
    }

    // Collect cookie handling results
    if (
      data.status === 'COOKIE_SUCCESS' ||
      data.status === 'COOKIE_NOT_FOUND' ||
      data.status === 'COOKIE_DETECTED'
    ) {
      results.cookieHandling = {
        success:
          data.status === 'COOKIE_SUCCESS' || data.status === 'COOKIE_DETECTED',
        method: data.method || 'none',
        text: data.text || null,
        message: data.message || null,
      } as CookieHandlingResult;
    }

    // Collect screenshot results
    if (data.status === 'SCREENSHOT_COMPLETE') {
      this.logger.log('Collecting SCREENSHOT_COMPLETE data', data);
      results.screenshots = {
        frameCount: data.frameCount,
        deviceType: data.deviceType,
        screenshots: data.screenshots || [], // Include S3 URLs
        message: data.message,
      } as ScreenshotResult;
    }

    // Collect individual metric data
    if (data.status === 'PERFORMANCE_METRICS' && data.data) {
      if (!results.webMetrics) results.webMetrics = {};
      results.webMetrics.performanceMetrics = data.data;
    }

    if (data.status === 'NETWORK_METRICS' && data.data) {
      if (!results.webMetrics) results.webMetrics = {};
      results.webMetrics.networkMetrics = data.data;
    }

    if (data.status === 'VITALS_METRICS' && data.data) {
      if (!results.webMetrics) results.webMetrics = {};
      results.webMetrics.vitalsMetrics = data.data;
    }

    // Collect console errors
    if (data.status === 'CONSOLE_ERRORS_COMPLETE' && data.data) {
      this.logger.log('Collecting CONSOLE_ERRORS_COMPLETE data', data.data);
      results.consoleErrors = data.data;
    }
  }
}

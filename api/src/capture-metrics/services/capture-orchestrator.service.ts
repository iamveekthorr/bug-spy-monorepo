import {
  Injectable,
  Logger,
  Inject,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable } from 'rxjs';
import { Page } from 'puppeteer';
import { PuppeteerHelpersService } from './puppeteer-helpers.service';
import { Model } from 'mongoose';

import {
  CachedTestResult,
  TestResults,
  CookieHandlingResult,
  ScreenshotResult,
} from '../interfaces/cache.interface';

import { BrowserPoolService } from './browser-pool.service';
import { WebMetricsService } from './web-metrics.service';
import { ScreenshotsService } from './screenshots.service';
import { CookiesService } from './cookies.service';
import { DeviceConfigService } from './device-config.service';
import { ConsoleErrorsService } from './console-errors.service';
import { TestResult, TestResultDocument } from '../schemas/test-result.schema';
import {
  CreateCaptureData,
  CreateBatchCaptureData,
} from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';

@Injectable()
export class CaptureOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(CaptureOrchestratorService.name);
  private readonly CACHE_TTL_MS = 7200000; // 2 hours in milliseconds
  private readonly CACHE_KEY_PREFIX = 'test-result:';
  private readonly activeTimeouts = new Set<NodeJS.Timeout>();
  private readonly activeObservables = new Set<any>();
  private isDestroying = false;

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly webMetricsService: WebMetricsService,
    private readonly screenshotsService: ScreenshotsService,
    private readonly cookiesService: CookiesService,
    private readonly deviceConfigService: DeviceConfigService,
    private readonly consoleErrorsService: ConsoleErrorsService,
    private readonly puppeteerHelpers: PuppeteerHelpersService,
    @InjectModel(TestResult.name)
    private readonly testResultModel: Model<TestResultDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Track a timeout for cleanup
   */
  private trackTimeout(timeoutId: NodeJS.Timeout): void {
    if (!this.isDestroying) {
      this.activeTimeouts.add(timeoutId);
    }
  }

  /**
   * Remove timeout from tracking when cleared
   */
  private untrackTimeout(timeoutId: NodeJS.Timeout): void {
    this.activeTimeouts.delete(timeoutId);
  }

  /**
   * Track an observable for cleanup
   */
  private trackObservable(observable: any): void {
    if (!this.isDestroying) {
      this.activeObservables.add(observable);
    }
  }

  /**
   * Remove observable from tracking when completed
   */
  private untrackObservable(observable: any): void {
    this.activeObservables.delete(observable);
  }

  startCapture(
    captureData: CreateCaptureData,
    abortSignal?: AbortSignal,
  ): Observable<any> {
    const {
      url,
      deviceType = 'desktop',
      testType = 'performance',
    } = captureData;

    // Generate testId if not provided
    const testId = this.generateTestId(captureData.testId);

    this.logger.log(
      `Starting capture for URL: ${url}, deviceType: ${deviceType}, testType: ${testType}`,
    );

    return new Observable((subscriber) => {
      // Track observable for cleanup
      this.trackObservable(subscriber);

      // Check for immediate cancellation
      if (abortSignal?.aborted) {
        this.untrackObservable(subscriber);
        subscriber.error(
          new AppError('Request cancelled', HttpStatus.BAD_REQUEST),
        );
        return;
      }
      // Send immediate response to test SSE
      subscriber.next({
        data: { status: 'OBSERVABLE_CREATED', timestamp: Date.now() },
      });

      // Add a safety timeout to prevent hanging connections
      // Reduced timeout for memory-constrained environments
      const timeoutMs = testType === 'performance' ? 30000 : 45000; // Shorter timeouts for low-memory servers
      let isTimedOut = false;
      let currentPage: Page | null = null;

      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        this.logger.warn(
          `Request timed out after ${timeoutMs / 1000} seconds - forcing cleanup`,
        );

        // Force cleanup of current page if it exists
        if (currentPage && !currentPage.isClosed()) {
          this.logger.log('Force closing page due to timeout');
          Promise.race([
            currentPage.close(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Page close timeout')), 5000),
            ),
          ]).catch((e) => {
            this.logger.error('Error force-closing page on timeout:', e);
          });
        }

        try {
          subscriber.next({
            data: {
              status: 'TIMEOUT',
              error: `Request timed out after ${timeoutMs / 1000} seconds`,
              testType,
            },
          });
          subscriber.complete();
        } catch (timeoutError) {
          this.logger.error(
            'Failed to notify subscriber of timeout:',
            timeoutError,
          );
        }
      }, timeoutMs);

      // Track timeout for cleanup
      this.trackTimeout(timeoutId);

      // Add abort signal listener with force cleanup
      const abortListener = async () => {
        this.logger.log('Request cancelled by client - forcing cleanup');

        // Force cleanup of current page if it exists
        if (currentPage && !currentPage.isClosed()) {
          try {
            this.logger.log('Force closing page due to client cancellation');
            await Promise.race([
              currentPage.close(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Page close timeout')), 3000),
              ),
            ]);
          } catch (error) {
            this.logger.error(
              'Error force-closing page on cancellation:',
              error,
            );
          }
        }

        try {
          subscriber.next({
            data: {
              status: 'CANCELLED',
              message: 'Request cancelled by client',
            },
          });
          subscriber.complete();
        } catch (error) {
          this.logger.error(
            'Failed to notify subscriber of cancellation:',
            error,
          );
        }
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener);
      }

      // Wrap the entire execution in a try-catch to prevent server crashes
      Promise.resolve()
        .then(async () => {
          try {
            await this.executeCapture(
              subscriber,
              { ...captureData, testId },
              abortSignal,
              (page) => {
                currentPage = page;
              }, // Page tracker callback
              () => isTimedOut, // Timeout checker callback
            );
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              'Critical error in capture execution:',
              errorMessage,
              error instanceof Error ? error.stack : undefined,
            );

            try {
              subscriber.next({
                data: { status: 'ERROR', error: errorMessage },
              });
              subscriber.complete();
              this.untrackObservable(subscriber);
            } catch (notificationError) {
              this.logger.error(
                'Failed to notify subscriber of error:',
                notificationError,
              );
            }
          } finally {
            this.cleanupTimeout(timeoutId);
            this.untrackTimeout(timeoutId);
            // Remove abort listener to prevent memory leaks
            if (abortSignal) {
              abortSignal.removeEventListener('abort', abortListener);
            }
          }
        })
        .catch((fatalError) => {
          this.cleanupTimeout(timeoutId);
          this.untrackTimeout(timeoutId);

          this.logger.error('Fatal error in promise chain:', fatalError);
          try {
            subscriber.error(fatalError);
            this.untrackObservable(subscriber);
          } catch {
            // If we can't even notify of the error, just log it
            this.logger.error('Could not notify subscriber of fatal error');
          }
        });

      // Track observable for cleanup
      this.trackObservable(subscriber);
    });
  }

  startBatchCapture(
    batchData: CreateBatchCaptureData,
    abortSignal?: AbortSignal,
  ): Observable<any> {
    const {
      urls,
      sequential = false,
      batchId = `batch-${Date.now()}`,
      batchName,
    } = batchData;

    this.logger.log(
      `Starting batch capture for ${urls.length} URLs: ${sequential ? 'sequential' : 'parallel'} processing`,
    );

    return new Observable((subscriber) => {
      // Check for immediate cancellation
      if (abortSignal?.aborted) {
        subscriber.error(
          new AppError('Request cancelled', HttpStatus.BAD_REQUEST),
        );
        return;
      }

      // Send immediate batch started response
      subscriber.next({
        data: {
          status: 'BATCH_STARTED',
          batchId,
          batchName,
          totalUrls: urls.length,
          sequential,
          timestamp: Date.now(),
        },
      });

      // Add abort signal listener
      const abortListener = () => {
        this.logger.log('Batch request cancelled by client');
        try {
          subscriber.next({
            data: {
              status: 'BATCH_CANCELLED',
              batchId,
              message: 'Batch request cancelled by client',
            },
          });
          subscriber.complete();
        } catch (error) {
          this.logger.error(
            'Failed to notify subscriber of batch cancellation:',
            error,
          );
        }
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener);
      }

      // Add safety timeout to prevent hanging connections
      const timeoutId = setTimeout(() => {
        this.logger.warn(`Batch ${batchId} timed out after 10 minutes`);
        try {
          subscriber.next({
            data: {
              status: 'BATCH_TIMEOUT',
              batchId,
              error: 'Batch processing timed out after 10 minutes',
            },
          });
          subscriber.complete();
        } catch (timeoutError) {
          this.logger.error(
            'Failed to notify subscriber of batch timeout:',
            timeoutError,
          );
        } finally {
          this.activeTimeouts.delete(timeoutId);
        }
      }, 600000); // 10 minute timeout for batch processing

      // Track timeout for cleanup
      this.trackTimeout(timeoutId);

      // Execute batch processing
      Promise.resolve()
        .then(async () => {
          try {
            await this.executeBatchCapture(
              subscriber,
              batchData,
              batchId,
              abortSignal,
            );
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              'Critical error in batch capture execution:',
              errorMessage,
              error instanceof Error ? error.stack : undefined,
            );

            try {
              subscriber.next({
                data: {
                  status: 'BATCH_ERROR',
                  batchId,
                  error: errorMessage,
                },
              });
              subscriber.complete();
            } catch (notificationError) {
              this.logger.error(
                'Failed to notify subscriber of batch error:',
                notificationError,
              );
            }
          } finally {
            this.cleanupTimeout(timeoutId);
            // Remove abort listener to prevent memory leaks
            if (abortSignal) {
              abortSignal.removeEventListener('abort', abortListener);
            }
          }
        })
        .catch((fatalError) => {
          this.cleanupTimeout(timeoutId);
          // Remove abort listener to prevent memory leaks
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener);
          }
          this.logger.error('Fatal error in batch promise chain:', fatalError);
          try {
            subscriber.error(fatalError);
          } catch {
            this.logger.error(
              'Could not notify subscriber of fatal batch error',
            );
          }
        });

      // Track observable for cleanup
      this.trackObservable(subscriber);
    });
  }

  private async executeCapture(
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
    const cancelled = false;

    // Collect results from all services
    const results: TestResults = {
      url,
      deviceType,
      testType,
      testId,
      timestamp: Date.now(),
      cookieHandling: null,
      webMetrics: null,
      screenshots: null,
      consoleErrors: null,
    };

    // Enhanced helper to check cancellation and timeout during execution

    try {
      // Real-time cancellation monitoring
      // Only execute the expensive operations if not cancelled
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
          const url = request.url();

          // Block heavy resources that slow down performance testing
          if (
            resourceType === 'image' &&
            (url.includes('.jpg') ||
              url.includes('.png') ||
              url.includes('.gif'))
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
      try {
        await Promise.race([navigationPromise]);
      } catch (error) {
        if (
          error instanceof AppError &&
          (error.message.includes('cancelled') ||
            error.message.includes('timed out'))
        ) {
          throw error;
        }
        // If navigation fails but not due to cancellation/timeout, continue with original error
        throw error;
      }

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
            this.storeTempResult(testId, captureData, results),
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

  private async executeBatchCapture(
    subscriber: any,
    batchData: CreateBatchCaptureData,
    batchId: string,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const {
      urls,
      deviceType = 'desktop',
      testType = 'performance',
      includeScreenshots = true,
      sequential = false,
    } = batchData;

    const batchResults: any[] = [];
    let completedCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    try {
      // Only process if not cancelled - much cleaner!
      if (!abortSignal?.aborted) {
        subscriber.next({
          data: {
            status: 'BATCH_PROCESSING',
            batchId,
            message: 'Starting URL processing...',
          },
        });

        if (sequential) {
          // Process URLs sequentially
          for (let index = 0; index < urls.length; index++) {
            // Check cancellation in loop for long-running batch operations
            if (abortSignal?.aborted) break;

            const urlData = urls[index];
            const testId = `${batchId}-${index + 1}`;

            try {
              subscriber.next({
                data: {
                  status: 'URL_STARTED',
                  batchId,
                  urlIndex: index + 1,
                  totalUrls: urls.length,
                  url: urlData.url,
                  label: urlData.label,
                  testId,
                },
              });

              // Create individual capture data for this URL
              const captureData: CreateCaptureData = {
                url: urlData.url,
                deviceType,
                testType,
                includeScreenshots,
                testId,
              };

              // Process this URL using existing single capture logic
              const urlResult = await this.processSingleUrl(
                captureData,
                abortSignal,
              );

              this.logger.log(
                `Sequential URL ${urlData.url} result:`,
                JSON.stringify({
                  hasWebMetrics: !!urlResult.webMetrics,
                  hasScreenshots: !!urlResult.screenshots,
                  hasCookieHandling: !!urlResult.cookieHandling,
                  webMetricsKeys: urlResult.webMetrics
                    ? Object.keys(urlResult.webMetrics)
                    : 'null',
                }),
              );

              batchResults.push({
                url: urlData.url,
                label: urlData.label,
                testId,
                index: index + 1,
                status: 'completed',
                result: urlResult,
              });

              completedCount++;

              subscriber.next({
                data: {
                  status: 'URL_COMPLETED',
                  batchId,
                  urlIndex: index + 1,
                  totalUrls: urls.length,
                  completedCount,
                  url: urlData.url,
                  testId,
                },
              });
            } catch (urlError: unknown) {
              const errorMessage =
                urlError instanceof Error ? urlError.message : String(urlError);
              this.logger.error(
                `Error processing URL ${urlData.url}:`,
                errorMessage,
              );

              batchResults.push({
                url: urlData.url,
                label: urlData.label,
                testId,
                index: index + 1,
                status: 'failed',
                error: errorMessage,
              });

              failedCount++;

              subscriber.next({
                data: {
                  status: 'URL_FAILED',
                  batchId,
                  urlIndex: index + 1,
                  totalUrls: urls.length,
                  failedCount,
                  url: urlData.url,
                  testId,
                  error: errorMessage,
                },
              });
            }

            // Send progress update
            subscriber.next({
              data: {
                status: 'BATCH_PROGRESS',
                batchId,
                progress: {
                  completed: completedCount,
                  failed: failedCount,
                  remaining: urls.length - (completedCount + failedCount),
                  total: urls.length,
                  percentage: Math.round(
                    ((completedCount + failedCount) / urls.length) * 100,
                  ),
                },
              },
            });
          }
        } else {
          // Process URLs in parallel (limited concurrency to avoid overwhelming browser pool)
          const maxConcurrency = Math.min(5, urls.length); // Max 5 concurrent requests
          this.logger.log(
            `Processing ${urls.length} URLs with max concurrency of ${maxConcurrency}`,
          );

          // Process with limited concurrency using chunks
          for (let i = 0; i < urls.length; i += maxConcurrency) {
            const chunk = urls.slice(i, i + maxConcurrency);
            this.logger.log(
              `Processing chunk ${Math.floor(i / maxConcurrency) + 1} with ${chunk.length} URLs`,
            );

            const chunkPromises = chunk.map(async (urlData, chunkIndex) => {
              const index = i + chunkIndex;
              const testId = `${batchId}-${index + 1}`;

              try {
                subscriber.next({
                  data: {
                    status: 'URL_STARTED',
                    batchId,
                    urlIndex: index + 1,
                    totalUrls: urls.length,
                    url: urlData.url,
                    label: urlData.label,
                    testId,
                  },
                });

                const captureData: CreateCaptureData = {
                  url: urlData.url,
                  deviceType,
                  testType,
                  includeScreenshots,
                  testId,
                };

                const urlResult = await this.processSingleUrl(
                  captureData,
                  abortSignal,
                );

                this.logger.log(
                  `URL ${urlData.url} result:`,
                  JSON.stringify({
                    hasWebMetrics: !!urlResult.webMetrics,
                    hasScreenshots: !!urlResult.screenshots,
                    hasCookieHandling: !!urlResult.cookieHandling,
                    webMetricsKeys: urlResult.webMetrics
                      ? Object.keys(urlResult.webMetrics)
                      : 'null',
                  }),
                );

                subscriber.next({
                  data: {
                    status: 'URL_COMPLETED',
                    batchId,
                    urlIndex: index + 1,
                    totalUrls: urls.length,
                    url: urlData.url,
                    testId,
                  },
                });

                return {
                  url: urlData.url,
                  label: urlData.label,
                  testId,
                  index: index + 1,
                  status: 'completed',
                  result: urlResult,
                };
              } catch (urlError: unknown) {
                const errorMessage =
                  urlError instanceof Error
                    ? urlError.message
                    : String(urlError);
                this.logger.error(
                  `Error processing URL ${urlData.url}:`,
                  errorMessage,
                );

                subscriber.next({
                  data: {
                    status: 'URL_FAILED',
                    batchId,
                    urlIndex: index + 1,
                    totalUrls: urls.length,
                    url: urlData.url,
                    testId,
                    error: errorMessage,
                  },
                });

                return {
                  url: urlData.url,
                  label: urlData.label,
                  testId,
                  index: index + 1,
                  status: 'failed',
                  error: errorMessage,
                };
              }
            });

            // Wait for this chunk to complete
            const chunkResults = await Promise.all(chunkPromises);
            batchResults.push(...chunkResults);

            // Update counters based on actual results
            for (const result of chunkResults) {
              if (result.status === 'completed') {
                completedCount++;
              } else if (result.status === 'failed') {
                failedCount++;
              }
            }

            // Send progress update after each chunk
            subscriber.next({
              data: {
                status: 'BATCH_PROGRESS',
                batchId,
                progress: {
                  completed: completedCount,
                  failed: failedCount,
                  remaining: urls.length - (completedCount + failedCount),
                  total: urls.length,
                  percentage: Math.round(
                    ((completedCount + failedCount) / urls.length) * 100,
                  ),
                },
              },
            });
          }
        }

        // Send final batch completion
        const totalDuration = Date.now() - startTime;
        this.logger.log(
          `Batch ${batchId} completed: ${completedCount} succeeded, ${failedCount} failed`,
        );

        this.logger.log(
          `Final batch results summary:`,
          JSON.stringify({
            totalResults: batchResults.length,
            resultsWithWebMetrics: batchResults.filter(
              (r) => r.result?.webMetrics,
            ).length,
            resultsWithScreenshots: batchResults.filter(
              (r) => r.result?.screenshots,
            ).length,
            sampleResult: batchResults[0]
              ? {
                  url: batchResults[0].url,
                  hasResult: !!batchResults[0].result,
                  hasWebMetrics: !!batchResults[0].result?.webMetrics,
                  webMetricsKeys: batchResults[0].result?.webMetrics
                    ? Object.keys(batchResults[0].result.webMetrics)
                    : 'null',
                }
              : 'no results',
          }),
        );

        subscriber.next({
          data: {
            status: 'BATCH_COMPLETE',
            batchId,
            summary: {
              totalUrls: urls.length,
              completed: completedCount,
              failed: failedCount,
              totalDuration,
              averageTimePerUrl: Math.round(totalDuration / urls.length),
            },
            results: batchResults,
          },
        });

        this.logger.log(
          `Batch ${batchId} - Sent BATCH_COMPLETE, completing subscriber`,
        );
        subscriber.complete();
      } else {
        // Batch was already cancelled - notify client
        throw new AppError('Batch request cancelled', HttpStatus.BAD_REQUEST);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error during batch execution:', errorMessage);
      subscriber.next({
        data: {
          status: 'BATCH_ERROR',
          batchId,
          error: errorMessage,
        },
      });
      subscriber.complete();
    }
  }

  private async processSingleUrl(
    captureData: CreateCaptureData,
    abortSignal?: AbortSignal,
  ): Promise<TestResults> {
    // This method processes a single URL and returns the result
    // without streaming to the batch subscriber (to avoid noise)
    let page: Page | undefined;
    const results: TestResults = {
      url: captureData.url,
      deviceType: captureData.deviceType || 'desktop',
      testType: captureData.testType || 'performance',
      testId: captureData.testId,
      timestamp: Date.now(),
      cookieHandling: null,
      webMetrics: null,
      screenshots: null,
      consoleErrors: null,
    };

    try {
      // Only execute expensive operations if not cancelled
      if (!abortSignal?.aborted) {
        // FIX BUG 6: Initialize page variable
        // Acquire page from pool
        page = await this.browserPool.requirePage();

        // Configure page for specific device
        await this.deviceConfigService.configurePageForDevice(
          page,
          captureData.deviceType || 'desktop',
        );

        // Navigate to URL
        await page.goto(captureData.url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });

        // Run services in parallel with proper coordination
        const servicePromises: Promise<void>[] = [];

        // For performance tests, use optimized cookie handling
        if (captureData.testType === 'performance') {
          // Cookie detection (non-intrusive for performance tests)
          servicePromises.push(
            this.runServiceForSingleUrl(
              'COOKIES',
              this.cookiesService.detectCookieConsent(page, captureData.url),
              results,
            ),
          );

          // Web metrics collection
          servicePromises.push(
            this.runServiceForSingleUrl(
              'METRICS',
              this.webMetricsService.captureWebMetrics(
                page,
                captureData.testType,
              ),
              results,
            ),
          );
        } else {
          // Traditional cookie handling for non-performance tests
          servicePromises.push(
            this.runServiceForSingleUrl(
              'COOKIES',
              this.cookiesService.handleCookieConsent(page, captureData.url),
              results,
            ),
          );
        }

        // Console errors (start early to capture all errors)
        servicePromises.push(
          this.runServiceForSingleUrl(
            'CONSOLE_ERRORS',
            this.consoleErrorsService.processConsoleErrorsWithProgress(
              page,
              captureData.testId || '',
            ),
            results,
          ),
        );

        // Add screenshots if enabled
        if (captureData.includeScreenshots) {
          servicePromises.push(
            this.runServiceForSingleUrl(
              'SCREENSHOTS',
              this.screenshotsService.captureScreenshots(page, {
                deviceType: captureData.deviceType || 'desktop',
                interval: 500,
                maxDuration: 10000,
                maxFrames: 15,
              }),
              results,
            ),
          );
        }

        // Wait for all services to complete in parallel
        await Promise.allSettled(servicePromises);

        this.logger.log(
          `processSingleUrl for ${captureData.url} completed:`,
          JSON.stringify({
            hasWebMetrics: !!results.webMetrics,
            hasScreenshots: !!results.screenshots,
            hasCookieHandling: !!results.cookieHandling,
            hasConsoleErrors: !!results.consoleErrors,
            webMetricsKeys: results.webMetrics
              ? Object.keys(results.webMetrics)
              : 'null',
          }),
        );

        return results;
      } else {
        // URL processing was cancelled - return empty results
        throw new AppError('Request cancelled', HttpStatus.BAD_REQUEST);
      }
    } finally {
      // Always release the page back to the pool
      if (page && this.browserPool.isPageTracked(page)) {
        try {
          await this.browserPool.releasePage(page);
        } catch (releaseError: unknown) {
          const errorMessage =
            releaseError instanceof Error
              ? releaseError.message
              : String(releaseError);
          this.logger.error(
            `Error releasing page for URL ${captureData.url}:`,
            errorMessage,
          );
        }
      } else if (page) {
        try {
          if (!page.isClosed()) {
            await page.close();
          }
        } catch (closeError: unknown) {
          const errorMessage =
            closeError instanceof Error
              ? closeError.message
              : String(closeError);
          this.logger.error(
            `Error closing untracked page for URL ${captureData.url}:`,
            errorMessage,
          );
        }
      }
    }
  }

  /**
   * Run a service for single URL processing (no streaming to subscriber)
   */
  private async runServiceForSingleUrl(
    name: string,
    generator: AsyncGenerator<any>,
    results: TestResults,
  ): Promise<void> {
    try {
      for await (const result of generator) {
        this.collectServiceResult(result, results);
      }
    } catch (error) {
      this.logger.error(
        `${name} service error in single URL processing:`,
        error,
      );
    }
  }

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

  /**
   * Generate a unique test ID if one is not provided
   */
  private generateTestId(existingTestId?: string): string {
    return (
      existingTestId ||
      `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    );
  }

  /**
   * Store test results temporarily in cache for later saving by authenticated users
   */
  private async storeTempResult(
    testId: string,
    captureData: CreateCaptureData,
    results: TestResults,
  ): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;
    const cachedData: CachedTestResult = {
      captureData,
      results,
      timestamp: Date.now(),
    };

    await this.cacheManager.set(cacheKey, cachedData, this.CACHE_TTL_MS);
    this.logger.debug(`Cached test result for testId: ${testId}`);
  }

  /**
   * Retrieve and save test results from cache to database
   */
  async saveTestResultFromTemp(
    userId: string,
    testId: string,
  ): Promise<string> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;
    const tempData = await this.cacheManager.get<CachedTestResult>(cacheKey);

    if (!tempData) {
      throw new AppError(
        `Test result not found for testId: ${testId}. Result may have expired or doesn't exist.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const testResult = new this.testResultModel({
        userId,
        url: tempData.captureData.url,
        timestamp: new Date(),
        results: tempData.results,
        testConfig: {
          deviceType: tempData.captureData.deviceType,
          testType: tempData.captureData.testType,
          includeScreenshots: tempData.captureData.includeScreenshots,
          networkType: tempData.captureData.networkType,
          testId: testId,
        },
        status: 'completed',
      });

      const savedResult = await testResult.save();

      // Remove from cache after successful save
      await this.cacheManager.del(cacheKey);

      this.logger.log(
        `Test result saved to database for user: ${userId}, testId: ${testId}`,
      );
      return savedResult._id.toString();
    } catch (error: any) {
      this.logger.error(
        'Failed to save test result to database:',
        error.message,
      );
      throw error;
    }
  }

  async saveTestResult(
    userId: string,
    url: string,
    captureData: CreateCaptureData,
    results: TestResults,
    status: 'completed' | 'failed',
  ): Promise<string> {
    try {
      const testResult = new this.testResultModel({
        userId,
        url,
        timestamp: new Date(),
        results,
        testConfig: {
          deviceType: captureData.deviceType,
          testType: captureData.testType,
          includeScreenshots: captureData.includeScreenshots,
          networkType: captureData.networkType,
          testId: captureData.testId,
        },
        status,
      });

      const savedResult = await testResult.save();
      this.logger.log(`Test result saved to database for user: ${userId}`);
      return savedResult._id.toString();
    } catch (error: any) {
      this.logger.error(
        'Failed to save test result to database:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Run a service generator to completion with proper error handling and progress streaming
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
   * OnModuleDestroy lifecycle hook - cleanup all active resources
   * This method is called when the module is being destroyed by the DI container
   * and ensures all timeouts and observables are properly cleaned up to prevent memory leaks
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      'CaptureOrchestratorService: onModuleDestroy lifecycle hook triggered',
    );

    this.isDestroying = true;

    try {
      // Clear all active timeouts to prevent them from firing after service destruction
      const timeoutCount = this.activeTimeouts.size;
      for (const timeoutId of this.activeTimeouts) {
        clearTimeout(timeoutId);
      }
      this.activeTimeouts.clear();

      if (timeoutCount > 0) {
        this.logger.log(
          `CaptureOrchestratorService: Cleared ${timeoutCount} active timeouts`,
        );
      }

      // FIX BUG 5: Handle unhandled promise rejections in Observable cleanup
      const observableCount = this.activeObservables.size;
      const cleanupPromises: Promise<void>[] = [];

      for (const subscriber of this.activeObservables) {
        cleanupPromises.push(
          new Promise<void>((resolve) => {
            try {
              if (subscriber && typeof subscriber.complete === 'function') {
                subscriber.complete();
              }
              resolve();
            } catch (error) {
              this.logger.warn(
                'CaptureOrchestratorService: Error completing subscriber during cleanup:',
                error,
              );
              resolve(); // Always resolve to prevent hanging
            }
          }),
        );
      }

      // Wait for all cleanup operations with timeout
      try {
        await Promise.race([
          Promise.allSettled(cleanupPromises),
          new Promise<void>((resolve) => {
            setTimeout(() => {
              this.logger.warn(
                'CaptureOrchestratorService: Observable cleanup timed out after 5 seconds',
              );
              resolve();
            }, 5000);
          }),
        ]);
      } catch (error) {
        this.logger.error(
          'CaptureOrchestratorService: Critical error during observable cleanup:',
          error,
        );
      }
      this.activeObservables.clear();

      if (observableCount > 0) {
        this.logger.log(
          `CaptureOrchestratorService: Completed ${observableCount} active observables`,
        );
      }

      this.logger.log(
        'CaptureOrchestratorService: Successfully cleaned up all resources',
      );
    } catch (error) {
      this.logger.error(
        'CaptureOrchestratorService: Error during onDestroy cleanup:',
        error,
      );
      // Don't throw - we want graceful degradation during shutdown
    }
  }

  /**
   * Helper method to track timeouts for cleanup
   * This ensures all timeouts can be cleared during service destruction
   *
   * @param timeoutId - The timeout ID returned by setTimeout
   */

  /**
   * Helper method to clean up a specific timeout
   * Used throughout the service to ensure consistent timeout cleanup
   *
   * @param timeoutId - The timeout ID to clear and untrack
   */
  private cleanupTimeout(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
    this.activeTimeouts.delete(timeoutId);
    this.logger.debug(
      `CaptureOrchestratorService: Cleaned up timeout, ${this.activeTimeouts.size} remaining`,
    );
  }
}

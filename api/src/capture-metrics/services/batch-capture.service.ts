import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Page } from 'puppeteer';

import { TestResults } from '../interfaces/cache.interface';

import { BrowserPoolService } from './browser-pool.service';
import { WebMetricsService } from './web-metrics.service';
import { ScreenshotsService } from './screenshots.service';
import { CookiesService } from './cookies.service';
import { DeviceConfigService } from './device-config.service';
import { ConsoleErrorsService } from './console-errors.service';
import {
  CreateBatchCaptureData,
  CreateCaptureData,
} from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';

/**
 * Batch Capture Service
 *
 * Handles batch processing of multiple URLs with:
 * - Sequential and parallel processing modes
 * - Progress tracking and reporting
 * - Chunk-based parallel processing (max 5 concurrent)
 * - Individual URL result aggregation
 * - Error handling per URL
 *
 * Extracted from CaptureOrchestratorService to follow Single Responsibility Principle
 */
@Injectable()
export class BatchCaptureService {
  private readonly logger = new Logger(BatchCaptureService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly webMetricsService: WebMetricsService,
    private readonly screenshotsService: ScreenshotsService,
    private readonly cookiesService: CookiesService,
    private readonly deviceConfigService: DeviceConfigService,
    private readonly consoleErrorsService: ConsoleErrorsService,
  ) {
    this.logger.log('BatchCaptureService initialized');
  }

  /**
   * Execute batch URL capture with Observable streaming
   *
   * @param batchData - Batch configuration with URLs
   * @param batchId - Unique batch identifier
   * @param abortSignal - Optional abort signal for cancellation
   * @returns Observable stream of batch progress and results
   */
  executeBatchCapture(
    batchData: CreateBatchCaptureData,
    batchId: string,
    abortSignal?: AbortSignal,
  ): Observable<any> {
    return new Observable((subscriber) => {
      this.executeBatchCaptureInternal(
        subscriber,
        batchData,
        batchId,
        abortSignal,
      )
        .catch((error) => {
          this.logger.error('Batch capture execution failed:', error);
          subscriber.error(error);
        });
    });
  }

  /**
   * Internal batch capture execution logic
   *
   * @param subscriber - Observable subscriber for streaming updates
   * @param batchData - Batch configuration
   * @param batchId - Unique batch identifier
   * @param abortSignal - Optional abort signal
   */
  private async executeBatchCaptureInternal(
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
      // Only process if not cancelled
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

              // Process this URL using single URL processing logic
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

  /**
   * Process a single URL without Observable streaming (used within batch processing)
   *
   * @param captureData - Capture configuration for single URL
   * @param abortSignal - Optional abort signal
   * @returns Test results for the URL
   */
  private async processSingleUrl(
    captureData: CreateCaptureData,
    abortSignal?: AbortSignal,
  ): Promise<TestResults> {
    let page: Page | undefined;
    const results: TestResults = {
      url: captureData.url,
      deviceType: captureData.deviceType || 'desktop',
      testType: captureData.testType || 'performance',
      testId: captureData.testId,
      timestamp: Date.now(),
      status: 'running',
      cookieHandling: null,
      webMetrics: null,
      screenshots: null,
      consoleErrors: null,
    };

    try {
      // Only execute expensive operations if not cancelled
      if (!abortSignal?.aborted) {
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
                testId: captureData.testId || `test-${Date.now()}`, // Use testId or generate fallback
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

        // Mark test as completed since all services finished
        results.status = 'completed';

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
        // URL processing was cancelled - mark as failed
        results.status = 'failed';
        throw new AppError('Request cancelled', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      // Mark test as failed on error
      results.status = 'failed';
      throw error;
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
   * Run a service for single URL processing (no streaming to batch subscriber)
   *
   * @param name - Service name for logging
   * @param generator - Async generator from service
   * @param results - Results object to collect data into
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

  /**
   * Collect results from service generators into results object
   * Same logic as in SingleCaptureService but without subscriber
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
      };
    }

    // Collect screenshot results
    if (data.status === 'SCREENSHOT_COMPLETE') {
      this.logger.log('Collecting SCREENSHOT_COMPLETE data', data);
      results.screenshots = {
        frameCount: data.frameCount,
        deviceType: data.deviceType,
        screenshots: data.screenshots || [], // Include S3 URLs
        message: data.message,
      };
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

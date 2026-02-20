import {
  Injectable,
  Logger,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { SingleCaptureService } from './single-capture.service';
import { BatchCaptureService } from './batch-capture.service';
import { PersistenceService } from './persistence.service';
import {
  CreateCaptureData,
  CreateBatchCaptureData,
} from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';

/**
 * Capture Orchestrator Service (Thin Facade)
 *
 * Thin facade that coordinates capture operations by delegating to specialized services:
 * - SingleCaptureService for single URL captures
 * - BatchCaptureService for batch processing
 * - PersistenceService for data storage
 *
 * Responsibilities:
 * - Public API endpoints
 * - Timeout and cancellation management
 * - Observable lifecycle tracking
 * - Resource cleanup on module destruction
 *
 * Refactored from 1,617 lines to ~200 lines by extracting business logic
 */
@Injectable()
export class CaptureOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(CaptureOrchestratorService.name);
  private readonly activeTimeouts = new Set<NodeJS.Timeout>();
  private readonly activeObservables = new Set<any>();
  private isDestroying = false;

  constructor(
    private readonly singleCaptureService: SingleCaptureService,
    private readonly batchCaptureService: BatchCaptureService,
    private readonly persistenceService: PersistenceService,
  ) {
    this.logger.log('CaptureOrchestratorService initialized');
  }

  /**
   * Start single URL capture
   *
   * @param captureData - Capture configuration
   * @param abortSignal - Optional abort signal for cancellation
   * @returns Observable stream of capture progress
   */
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
      const timeoutMs = testType === 'performance' ? 30000 : 45000;

      const timeoutId = setTimeout(() => {
        this.logger.warn(
          `Request timed out after ${timeoutMs / 1000} seconds - forcing cleanup`,
        );

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

      // Add abort signal listener
      const abortListener = async () => {
        this.logger.log('Request cancelled by client');

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

      // Delegate to SingleCaptureService
      const captureObservable = this.singleCaptureService.executeCapture(
        { ...captureData, testId },
        abortSignal,
      );

      // Subscribe to the single capture service's observable
      captureObservable.subscribe({
        next: (data) => {
          try {
            subscriber.next(data);
          } catch (error) {
            this.logger.error('Error forwarding capture data:', error);
          }
        },
        error: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error('Error in single capture:', errorMessage);

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

          this.cleanupTimeout(timeoutId);
          this.untrackTimeout(timeoutId);
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener);
          }
        },
        complete: () => {
          this.logger.debug('Single capture completed');
          this.untrackObservable(subscriber);
          this.cleanupTimeout(timeoutId);
          this.untrackTimeout(timeoutId);
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener);
          }
        },
      });
    });
  }

  /**
   * Start batch URL capture
   *
   * @param batchData - Batch configuration
   * @param abortSignal - Optional abort signal for cancellation
   * @returns Observable stream of batch progress
   */
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

      // Delegate to BatchCaptureService
      const batchObservable = this.batchCaptureService.executeBatchCapture(
        batchData,
        batchId,
        abortSignal,
      );

      // Subscribe to the batch capture service's observable
      batchObservable.subscribe({
        next: (data) => {
          try {
            subscriber.next(data);
          } catch (error) {
            this.logger.error('Error forwarding batch data:', error);
          }
        },
        error: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error('Error in batch capture:', errorMessage);

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

          this.cleanupTimeout(timeoutId);
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener);
          }
        },
        complete: () => {
          this.logger.debug('Batch capture completed');
          this.cleanupTimeout(timeoutId);
          if (abortSignal) {
            abortSignal.removeEventListener('abort', abortListener);
          }
        },
      });

      // Track observable for cleanup
      this.trackObservable(subscriber);
    });
  }

  /**
   * Retrieve and save test results from cache to database
   * Delegates to PersistenceService
   *
   * @param userId - User ID
   * @param testId - Test identifier
   * @returns MongoDB document ID
   */
  async saveTestResultFromTemp(
    userId: string,
    testId: string,
  ): Promise<string> {
    return this.persistenceService.saveTestResultFromCache(userId, testId);
  }

  /**
   * Save test result directly to database
   * Delegates to PersistenceService
   *
   * @param userId - User ID
   * @param url - URL tested
   * @param captureData - Capture configuration
   * @param results - Test results
   * @param status - Test status
   * @returns MongoDB document ID
   */
  async saveTestResult(
    userId: string,
    url: string,
    captureData: CreateCaptureData,
    results: any,
    status: 'completed' | 'failed',
  ): Promise<string> {
    return this.persistenceService.saveTestResult(
      userId,
      url,
      captureData,
      results,
      status,
    );
  }

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
   * Cleanup timeout
   */
  private cleanupTimeout(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
    this.activeTimeouts.delete(timeoutId);
    this.logger.debug(
      `CaptureOrchestratorService: Cleaned up timeout, ${this.activeTimeouts.size} remaining`,
    );
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

      // Handle unhandled promise rejections in Observable cleanup
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
      if (cleanupPromises.length > 0) {
        try {
          await Promise.allSettled(cleanupPromises);
        } catch (error) {
          this.logger.error(
            'CaptureOrchestratorService: Error during observable cleanup:',
            error,
          );
        }
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
    }
  }
}

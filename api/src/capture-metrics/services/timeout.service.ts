import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

/**
 * Unified timeout operation types
 */
export type TimeoutOperationType =
  | 'navigation'
  | 'pageLoad'
  | 'networkIdle'
  | 'domContentLoaded'
  | 'cookieDetection'
  | 'screenshot'
  | 'pageClose';

/**
 * Result from timeout-controlled operation
 */
export interface TimeoutResult<T> {
  success: boolean;
  result?: T;
  duration: number;
  attempts: number;
  strategy: string;
  error?: string;
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
}

/**
 * Unified Timeout Service
 * Merges functionality from TimeoutConfigService and IntelligentTimeoutService
 *
 * Features:
 * - Progressive timeout strategy (fast → normal → slow)
 * - Environment-aware timeout configuration
 * - Performance history tracking and adaptive learning
 * - Puppeteer-specific helper methods
 * - Retry configuration
 */
@Injectable()
export class TimeoutService {
  private readonly logger = new Logger(TimeoutService.name);

  // Performance history for adaptive learning
  private readonly performanceHistory = new Map<string, number[]>();
  private readonly maxHistorySize = 20;

  // Progressive timeout configurations (milliseconds)
  // Each operation has three strategies: fast → normal → slow
  private readonly baseTimeouts: Record<
    TimeoutOperationType,
    { fast: number; normal: number; slow: number }
  > = {
    navigation: { fast: 8000, normal: 15000, slow: 30000 },
    pageLoad: { fast: 5000, normal: 10000, slow: 20000 },
    networkIdle: { fast: 3000, normal: 6000, slow: 12000 },
    domContentLoaded: { fast: 3000, normal: 5000, slow: 8000 },
    cookieDetection: { fast: 2000, normal: 4000, slow: 6000 },
    screenshot: { fast: 2000, normal: 3000, slow: 5000 },
    pageClose: { fast: 1000, normal: 2000, slow: 3000 },
  };

  // Retry configurations for each operation type
  private readonly retryConfigs: Record<TimeoutOperationType, RetryConfig> = {
    navigation: { maxRetries: 1, backoffMultiplier: 2.0 },
    pageLoad: { maxRetries: 2, backoffMultiplier: 1.5 },
    networkIdle: { maxRetries: 1, backoffMultiplier: 2.0 },
    domContentLoaded: { maxRetries: 3, backoffMultiplier: 1.3 },
    cookieDetection: { maxRetries: 2, backoffMultiplier: 1.5 },
    screenshot: { maxRetries: 2, backoffMultiplier: 1.2 },
    pageClose: { maxRetries: 1, backoffMultiplier: 1.0 },
  };

  constructor() {
    const env = this.getEnvironment();
    this.logger.log(`TimeoutService initialized for ${env} environment`);
  }

  /**
   * Execute operation with intelligent progressive timeout strategy
   * Tries fast → normal → slow timeouts with graceful degradation
   */
  async executeWithTimeout<T>(
    operationType: TimeoutOperationType,
    operation: () => Promise<T>,
    context: string = 'unknown',
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();
    const timeouts = this.calculateAdaptiveTimeouts(operationType);

    // Progressive timeout strategies
    const strategies = [
      { name: 'fast', timeout: timeouts.fast, required: false },
      { name: 'normal', timeout: timeouts.normal, required: false },
      { name: 'slow', timeout: timeouts.slow, required: true },
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        const result = await this.raceWithTimeout(operation, strategy.timeout);
        const duration = Date.now() - startTime;

        // Record successful performance for adaptive learning
        this.recordPerformance(operationType, duration);

        this.logger.debug(
          `${context} completed with ${strategy.name} strategy in ${duration}ms (timeout: ${strategy.timeout}ms)`,
        );

        return {
          success: true,
          result,
          duration,
          attempts: index + 1,
          strategy: strategy.name,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // If not the last strategy, try next one
        if (index < strategies.length - 1) {
          this.logger.debug(
            `${context} ${strategy.name} strategy failed after ${duration}ms, trying next`,
          );
          continue;
        }

        // All strategies failed - record for learning
        this.recordPerformance(operationType, duration);

        this.logger.warn(
          `${context} failed with all strategies after ${duration}ms: ${errorMessage}`,
        );

        return {
          success: false,
          duration,
          attempts: strategies.length,
          strategy: 'all-failed',
          error: errorMessage,
        };
      }
    }

    throw new Error('Unexpected end of timeout strategies');
  }

  /**
   * Get timeout value for a specific operation and strategy
   */
  getTimeout(
    operationType: TimeoutOperationType,
    strategy: 'fast' | 'normal' | 'slow' = 'normal',
  ): number {
    const timeouts = this.calculateAdaptiveTimeouts(operationType);
    return timeouts[strategy];
  }

  /**
   * Get retry configuration for an operation type
   */
  getRetryConfig(operationType: TimeoutOperationType): RetryConfig {
    return { ...this.retryConfigs[operationType] };
  }

  /**
   * Wait for network idle with intelligent timeout
   */
  async waitForNetworkIdle(
    page: Page,
    context: string = 'networkIdle',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithTimeout(
      'networkIdle',
      async () => {
        await page.waitForNetworkIdle({
          idleTime: 500, // 500ms of network silence
          timeout: 0, // We handle timeout externally
        });
      },
      context,
    );
  }

  /**
   * Wait for load state with intelligent timeout
   */
  async waitForLoadState(
    page: Page,
    state: 'load' | 'domcontentloaded',
    context: string = 'loadState',
  ): Promise<TimeoutResult<void>> {
    const operationType =
      state === 'load' ? 'pageLoad' : 'domContentLoaded';

    return this.executeWithTimeout(
      operationType,
      async () => {
        if (page.isClosed()) {
          throw new Error('Page is closed');
        }

        const condition =
          state === 'load'
            ? () => document.readyState === 'complete'
            : () => document.readyState !== 'loading';

        await page.waitForFunction(condition, { timeout: 0 });
      },
      `${context}-${state}`,
    );
  }

  /**
   * Navigate with intelligent timeout
   */
  async navigateWithTimeout(
    page: Page,
    url: string,
    context: string = 'navigation',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithTimeout(
      'navigation',
      async () => {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 0,
        });
      },
      `${context}-${url}`,
    );
  }

  /**
   * Take screenshot with intelligent timeout
   */
  async takeScreenshotWithTimeout(
    page: Page,
    options: any,
    context: string = 'screenshot',
  ): Promise<TimeoutResult<Buffer>> {
    return this.executeWithTimeout(
      'screenshot',
      async (): Promise<Buffer> => {
        const result = await page.screenshot(options);
        if (typeof result === 'string') {
          return Buffer.from(result, 'base64');
        }
        return result as Buffer;
      },
      context,
    );
  }

  /**
   * Close page with intelligent timeout
   */
  async closePageWithTimeout(
    page: Page,
    context: string = 'pageClose',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithTimeout(
      'pageClose',
      async () => {
        if (!page.isClosed()) {
          await page.close({ runBeforeUnload: false });
        }
      },
      context,
    );
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStats(): Record<
    string,
    { avg: number; p95: number; count: number; trend: string }
  > {
    const stats: Record<
      string,
      { avg: number; p95: number; count: number; trend: string }
    > = {};

    for (const [operation, history] of this.performanceHistory) {
      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => a - b);
        const avg = Math.round(
          history.reduce((a, b) => a + b, 0) / history.length,
        );
        const p95 = Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0);

        // Calculate trend
        const recent = history.slice(-5);
        const older = history.slice(0, -5);
        let trend = 'stable';

        if (recent.length >= 3 && older.length >= 3) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          const change = (recentAvg - olderAvg) / olderAvg;

          if (change > 0.1) trend = 'degrading';
          else if (change < -0.1) trend = 'improving';
        }

        stats[operation] = { avg, p95, count: history.length, trend };
      }
    }

    return stats;
  }

  /**
   * Clear performance history (useful for testing)
   */
  clearHistory(): void {
    this.performanceHistory.clear();
    this.logger.debug('Performance history cleared');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Race an operation against a timeout
   */
  private async raceWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const operationPromise = operation()
      .then((result) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return result;
      })
      .catch((error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        throw error;
      });

    return Promise.race([operationPromise, timeoutPromise]);
  }

  /**
   * Calculate adaptive timeouts based on environment and performance history
   */
  private calculateAdaptiveTimeouts(operationType: TimeoutOperationType): {
    fast: number;
    normal: number;
    slow: number;
  } {
    const base = this.baseTimeouts[operationType];
    const envMultiplier = this.getEnvironmentMultiplier();

    // Apply historical learning
    const history = this.performanceHistory.get(operationType);
    let adaptiveMultiplier = 1.0;

    if (history && history.length >= 5) {
      // If recent operations are taking longer, increase timeouts
      const recentAvg = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const expectedFast = base.fast * envMultiplier;

      if (recentAvg > expectedFast * 1.2) {
        adaptiveMultiplier = Math.min(2.0, recentAvg / expectedFast);
      }
    }

    const finalMultiplier = envMultiplier * adaptiveMultiplier;

    return {
      fast: Math.round(base.fast * finalMultiplier),
      normal: Math.round(base.normal * finalMultiplier),
      slow: Math.round(base.slow * finalMultiplier),
    };
  }

  /**
   * Get environment-based timeout multiplier
   */
  private getEnvironmentMultiplier(): number {
    const env = this.getEnvironment();
    const isProduction =
      env === 'production' || process.env.RENDER || process.env.HEROKU;

    // More conservative timeouts in production/cloud
    if (isProduction) return 1.3;
    if (env === 'staging') return 1.1;
    return 0.9; // Faster in development
  }

  /**
   * Get current environment
   */
  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Record performance data for adaptive learning
   */
  private recordPerformance(operationType: string, duration: number): void {
    if (!this.performanceHistory.has(operationType)) {
      this.performanceHistory.set(operationType, []);
    }

    const history = this.performanceHistory.get(operationType)!;
    history.push(duration);

    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.logger.debug(`Recorded ${operationType} performance: ${duration}ms`);
  }
}

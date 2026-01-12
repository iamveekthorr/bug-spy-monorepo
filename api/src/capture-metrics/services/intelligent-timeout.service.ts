import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';

export type OperationType =
  | 'navigation'
  | 'pageLoad'
  | 'networkIdle'
  | 'domContent'
  | 'cookieDetection'
  | 'screenshot'
  | 'pageClose';

export interface TimeoutResult<T> {
  success: boolean;
  result?: T;
  duration: number;
  attempts: number;
  strategy: string;
  error?: string;
}

@Injectable()
export class IntelligentTimeoutService {
  private readonly logger = new Logger(IntelligentTimeoutService.name);

  // Performance history for learning (in-memory, could be persisted)
  private performanceHistory = new Map<string, number[]>();
  private readonly maxHistorySize = 20;

  // Environment-aware base timeouts (milliseconds)
  private readonly baseTimeouts: Record<
    OperationType,
    { fast: number; normal: number; slow: number }
  > = {
    navigation: { fast: 8000, normal: 15000, slow: 30000 },
    pageLoad: { fast: 5000, normal: 10000, slow: 20000 },
    networkIdle: { fast: 3000, normal: 6000, slow: 12000 },
    domContent: { fast: 3000, normal: 5000, slow: 8000 },
    cookieDetection: { fast: 2000, normal: 4000, slow: 6000 },
    screenshot: { fast: 2000, normal: 3000, slow: 5000 },
    pageClose: { fast: 1000, normal: 2000, slow: 3000 },
  };

  constructor() {
    const env = this.getEnvironment();
    this.logger.log(
      `IntelligentTimeoutService initialized for ${env} environment`,
    );
  }

  /**
   * Execute operation with intelligent timeout strategy
   * Uses progressive timeouts: fast → normal → slow with graceful degradation
   */
  async executeWithIntelligentTimeout<T>(
    operationType: OperationType,
    operation: () => Promise<T>,
    context: string = 'unknown',
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();
    const timeouts = this.calculateAdaptiveTimeouts(operationType);

    // Progressive timeout strategy
    const strategies = [
      { name: 'optimistic', timeout: timeouts.fast, required: false },
      { name: 'normal', timeout: timeouts.normal, required: false },
      { name: 'conservative', timeout: timeouts.slow, required: true },
    ];

    for (const [index, strategy] of strategies.entries()) {
      try {
        const result = await this.executeWithTimeout(
          operation,
          strategy.timeout,
        );
        const duration = Date.now() - startTime;

        // Record successful performance
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

        // If this wasn't the last strategy, try the next one
        if (index < strategies.length - 1) {
          this.logger.debug(
            `${context} ${strategy.name} strategy failed after ${duration}ms, trying next strategy`,
          );
          continue;
        }

        // Record failed performance for learning
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

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of timeout strategies');
  }

  /**
   * Wait for network idle with intelligent timeout
   * Mimics WebPageTest's activity-based waiting
   */
  async waitForNetworkIdle(
    page: Page,
    context: string = 'networkIdle',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithIntelligentTimeout(
      'networkIdle',
      async () => {
        // Use Puppeteer's built-in network idle detection
        await page.waitForNetworkIdle({
          idleTime: 500, // 500ms of network silence
          timeout: 0, // We handle timeout externally
        });
      },
      context,
    );
  }

  /**
   * Wait for load state with intelligent timeout and fallbacks
   * Mimics Lighthouse's multi-phase loading detection
   */
  async waitForLoadState(
    page: Page,
    state: 'load' | 'domcontentloaded',
    context: string = 'loadState',
  ): Promise<TimeoutResult<void>> {
    const operationType = state === 'load' ? 'pageLoad' : 'domContent';

    return this.executeWithIntelligentTimeout(
      operationType,
      async () => {
        // Check if page is still valid
        if (page.isClosed()) {
          throw new Error('Page is closed');
        }

        // Wait for the requested load state
        const condition =
          state === 'load'
            ? () => document.readyState === 'complete'
            : () => document.readyState !== 'loading';

        await page.waitForFunction(condition, { timeout: 0 }); // We handle timeout externally
      },
      `${context}-${state}`,
    );
  }

  /**
   * Execute navigation with intelligent timeout
   */
  async navigateWithIntelligentTimeout(
    page: Page,
    url: string,
    context: string = 'navigation',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithIntelligentTimeout(
      'navigation',
      async () => {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 0, // We handle timeout externally
        });
      },
      `${context}-${url}`,
    );
  }

  /**
   * Take screenshot with intelligent timeout
   */
  async takeScreenshotWithIntelligentTimeout(
    page: Page,
    options: any,
    context: string = 'screenshot',
  ): Promise<TimeoutResult<Buffer>> {
    return this.executeWithIntelligentTimeout(
      'screenshot',
      async (): Promise<Buffer> => {
        const result = await page.screenshot(options);
        // Ensure we return a Buffer
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
  async closePageWithIntelligentTimeout(
    page: Page,
    context: string = 'pageClose',
  ): Promise<TimeoutResult<void>> {
    return this.executeWithIntelligentTimeout(
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
   * Get performance statistics for monitoring and optimization
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

        // Calculate trend (improving/degrading)
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

  private async executeWithTimeout<T>(
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
        // Clear timeout on successful completion
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        return result;
      })
      .catch((error) => {
        // Clear timeout on error as well
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        throw error;
      });

    return Promise.race([operationPromise, timeoutPromise]);
  }

  private calculateAdaptiveTimeouts(operationType: OperationType): {
    fast: number;
    normal: number;
    slow: number;
  } {
    const base = this.baseTimeouts[operationType];
    const multiplier = this.getEnvironmentMultiplier();

    // Apply historical learning
    const history = this.performanceHistory.get(operationType);
    let adaptiveMultiplier = 1.0;

    if (history && history.length >= 5) {
      // If recent operations are taking longer, increase timeouts
      const recentAvg = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const expectedFast = base.fast * multiplier;

      if (recentAvg > expectedFast * 1.2) {
        adaptiveMultiplier = Math.min(2.0, recentAvg / expectedFast);
      }
    }

    const finalMultiplier = multiplier * adaptiveMultiplier;

    return {
      fast: Math.round(base.fast * finalMultiplier),
      normal: Math.round(base.normal * finalMultiplier),
      slow: Math.round(base.slow * finalMultiplier),
    };
  }

  private getEnvironmentMultiplier(): number {
    const env = this.getEnvironment();
    const isProduction =
      env === 'production' || process.env.RENDER || process.env.HEROKU;

    // More conservative timeouts in production/cloud environments
    if (isProduction) return 1.3;
    if (env === 'staging') return 1.1;
    return 0.9; // Faster in development
  }

  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

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
  }
}

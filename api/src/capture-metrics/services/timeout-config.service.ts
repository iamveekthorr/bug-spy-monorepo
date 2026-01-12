import { Injectable, Logger } from '@nestjs/common';

export interface TimeoutConfig {
  pageLoad: number;
  networkIdle: number;
  domContentLoaded: number;
  pageClose: number;
  cookieDetection: number;
  screenshot: number;
  navigation: number;
}

export interface AdaptiveTimeoutOptions {
  baseTimeout: number;
  maxTimeout: number;
  minTimeout: number;
  adaptationFactor?: number;
  environment?: 'development' | 'staging' | 'production';
  connectionType?: 'fast' | 'medium' | 'slow';
}

@Injectable()
export class TimeoutConfigService {
  private readonly logger = new Logger(TimeoutConfigService.name);

  // Performance history for adaptive learning
  private performanceHistory: Map<string, number[]> = new Map();
  private readonly historyLimit = 10; // Keep last 10 measurements per operation type

  // Base configuration based on environment
  private readonly baseConfig: Record<string, TimeoutConfig> = {
    development: {
      pageLoad: 10000,
      networkIdle: 8000,
      domContentLoaded: 5000,
      pageClose: 3000,
      cookieDetection: 6000,
      screenshot: 5000,
      navigation: 15000,
    },
    staging: {
      pageLoad: 15000,
      networkIdle: 12000,
      domContentLoaded: 8000,
      pageClose: 4000,
      cookieDetection: 8000,
      screenshot: 7000,
      navigation: 20000,
    },
    production: {
      pageLoad: 20000,
      networkIdle: 15000,
      domContentLoaded: 10000,
      pageClose: 5000,
      cookieDetection: 12000,
      screenshot: 10000,
      navigation: 30000,
    },
  };

  constructor() {
    this.logger.log(
      `TimeoutConfigService initialized for ${this.getEnvironment()} environment`,
    );
  }

  /**
   * Get environment-appropriate timeout configuration
   */
  getTimeoutConfig(operationType?: string): TimeoutConfig {
    const env = this.getEnvironment();
    const baseConfig = this.baseConfig[env];

    // Apply adaptive adjustments if we have performance history
    if (operationType && this.performanceHistory.has(operationType)) {
      return this.adaptTimeoutsBasedOnHistory(baseConfig, operationType);
    }

    return { ...baseConfig };
  }

  /**
   * Get adaptive timeout for a specific operation
   */
  getAdaptiveTimeout(
    operationType: keyof TimeoutConfig,
    options: Partial<AdaptiveTimeoutOptions> = {},
  ): number {
    const config = this.getTimeoutConfig(operationType);
    const baseTimeout = config[operationType];

    // Apply environment-based adjustments
    const envMultiplier = this.getEnvironmentMultiplier(options.environment);
    const connectionMultiplier = this.getConnectionMultiplier(
      options.connectionType,
    );

    // Apply load-based adjustments
    const loadMultiplier = this.getCurrentLoadMultiplier();

    // Calculate adaptive timeout
    let adaptiveTimeout =
      baseTimeout * envMultiplier * connectionMultiplier * loadMultiplier;

    // Apply historical learning
    if (this.performanceHistory.has(operationType)) {
      const avgPerformance = this.getAveragePerformance(operationType);
      const adaptationFactor = options.adaptationFactor || 1.2;

      // If recent operations took longer than expected, increase timeout
      if (avgPerformance > baseTimeout * 0.8) {
        adaptiveTimeout = Math.max(
          adaptiveTimeout,
          avgPerformance * adaptationFactor,
        );
      }
    }

    // Apply bounds
    const minTimeout = options.minTimeout || baseTimeout * 0.5;
    const maxTimeout = options.maxTimeout || baseTimeout * 3;

    adaptiveTimeout = Math.max(
      minTimeout,
      Math.min(maxTimeout, adaptiveTimeout),
    );

    this.logger.debug(
      `Adaptive timeout for ${operationType}: ${adaptiveTimeout}ms ` +
        `(base: ${baseTimeout}ms, env: ${envMultiplier}x, conn: ${connectionMultiplier}x, load: ${loadMultiplier}x)`,
    );

    return Math.round(adaptiveTimeout);
  }

  /**
   * Record performance data for learning
   */
  recordPerformance(operationType: string, duration: number): void {
    if (!this.performanceHistory.has(operationType)) {
      this.performanceHistory.set(operationType, []);
    }

    const history = this.performanceHistory.get(operationType)!;
    history.push(duration);

    // Keep only recent history
    if (history.length > this.historyLimit) {
      history.shift();
    }

    this.logger.debug(`Recorded ${operationType} performance: ${duration}ms`);
  }

  /**
   * Create a timeout promise with automatic performance tracking
   */
  createTimeoutPromise<T>(
    operationType: keyof TimeoutConfig,
    operation: () => Promise<T>,
    options: Partial<AdaptiveTimeoutOptions> = {},
  ): Promise<T> {
    const timeout = this.getAdaptiveTimeout(operationType, options);
    const startTime = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const handle = setTimeout(() => {
        const duration = Date.now() - startTime;
        this.recordPerformance(operationType, duration);
        reject(
          new Error(
            `${operationType} timeout after ${timeout}ms (actual: ${duration}ms)`,
          ),
        );
      }, timeout);

      // Store handle for cleanup
      (timeoutPromise as any)._handle = handle;
    });

    const operationPromise = operation().then((result) => {
      const duration = Date.now() - startTime;
      this.recordPerformance(operationType, duration);

      // Clear timeout
      if ((timeoutPromise as any)._handle) {
        clearTimeout((timeoutPromise as any)._handle);
      }

      return result;
    });

    return Promise.race([operationPromise, timeoutPromise]);
  }

  /**
   * Get retry configuration for failed operations
   */
  getRetryConfig(operationType: keyof TimeoutConfig): {
    maxRetries: number;
    backoffMultiplier: number;
  } {
    const config = {
      pageLoad: { maxRetries: 2, backoffMultiplier: 1.5 },
      networkIdle: { maxRetries: 1, backoffMultiplier: 2.0 },
      domContentLoaded: { maxRetries: 3, backoffMultiplier: 1.3 },
      pageClose: { maxRetries: 1, backoffMultiplier: 1.0 },
      cookieDetection: { maxRetries: 2, backoffMultiplier: 1.5 },
      screenshot: { maxRetries: 2, backoffMultiplier: 1.2 },
      navigation: { maxRetries: 1, backoffMultiplier: 2.0 },
    };

    return config[operationType] || { maxRetries: 1, backoffMultiplier: 1.5 };
  }

  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  private getEnvironmentMultiplier(environment?: string): number {
    const env = environment || this.getEnvironment();
    const multipliers = {
      development: 0.8, // Faster in development
      staging: 1.0,
      production: 1.2, // More conservative in production
    };
    return multipliers[env] || 1.0;
  }

  private getConnectionMultiplier(connectionType?: string): number {
    if (!connectionType) {
      // Try to detect from environment or use default
      if (process.env.RENDER || process.env.HEROKU) return 1.3; // Cloud platforms
      return 1.0;
    }

    const multipliers = {
      fast: 0.8, // Fiber/fast connections
      medium: 1.0, // Regular broadband
      slow: 1.8, // Mobile/slow connections
    };
    return multipliers[connectionType] || 1.0;
  }

  private getCurrentLoadMultiplier(): number {
    // Simple load detection based on memory usage
    try {
      const memUsage = process.memoryUsage();
      const heapRatio = memUsage.heapUsed / memUsage.heapTotal;

      if (heapRatio > 0.8) return 1.5; // High load
      if (heapRatio > 0.6) return 1.2; // Medium load
      return 1.0; // Normal load
    } catch {
      return 1.0;
    }
  }

  private adaptTimeoutsBasedOnHistory(
    baseConfig: TimeoutConfig,
    operationType: string,
  ): TimeoutConfig {
    const avgPerformance = this.getAveragePerformance(operationType);
    const adaptedConfig = { ...baseConfig };

    // Increase timeout for this operation type based on historical performance
    if (operationType in adaptedConfig) {
      const currentTimeout =
        adaptedConfig[operationType as keyof TimeoutConfig];
      if (avgPerformance > currentTimeout * 0.7) {
        adaptedConfig[operationType as keyof TimeoutConfig] = Math.min(
          currentTimeout * 1.5,
          avgPerformance * 1.3,
        );
      }
    }

    return adaptedConfig;
  }

  private getAveragePerformance(operationType: string): number {
    const history = this.performanceHistory.get(operationType);
    if (!history || history.length === 0) return 0;

    return history.reduce((sum, val) => sum + val, 0) / history.length;
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStats(): Record<
    string,
    { avg: number; count: number; recent: number }
  > {
    const stats: Record<
      string,
      { avg: number; count: number; recent: number }
    > = {};

    for (const [operationType, history] of this.performanceHistory) {
      if (history.length > 0) {
        stats[operationType] = {
          avg: Math.round(this.getAveragePerformance(operationType)),
          count: history.length,
          recent: history[history.length - 1],
        };
      }
    }

    return stats;
  }
}

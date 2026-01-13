/**
 * Service Interface Contracts
 *
 * Defines interfaces for all major services to enable:
 * - Dependency Inversion Principle
 * - Easier mocking in tests
 * - Flexibility for alternative implementations
 * - Reduced coupling between services
 */

import { Page, Browser } from 'puppeteer';
import { TimeoutOperationType, TimeoutResult } from '../services/timeout.service';
import {
  ScreenshotResult,
  CookieHandlingResult,
} from './cache.interface';
import { ConsoleErrorsResult } from '../services/console-errors.service';

/**
 * Interface for Timeout Management Service
 */
export interface ITimeoutService {
  /**
   * Execute operation with intelligent progressive timeout
   */
  executeWithTimeout<T>(
    operationType: TimeoutOperationType,
    operation: () => Promise<T>,
    context?: string,
  ): Promise<TimeoutResult<T>>;

  /**
   * Get timeout value for specific operation
   */
  getTimeout(
    operationType: TimeoutOperationType,
    strategy?: 'fast' | 'normal' | 'slow',
  ): number;

  /**
   * Wait for network idle
   */
  waitForNetworkIdle(page: Page, context?: string): Promise<TimeoutResult<void>>;

  /**
   * Wait for load state
   */
  waitForLoadState(
    page: Page,
    state: 'load' | 'domcontentloaded',
    context?: string,
  ): Promise<TimeoutResult<void>>;

  /**
   * Navigate with timeout
   */
  navigateWithTimeout(
    page: Page,
    url: string,
    context?: string,
  ): Promise<TimeoutResult<void>>;

  /**
   * Take screenshot with timeout
   */
  takeScreenshotWithTimeout(
    page: Page,
    options: any,
    context?: string,
  ): Promise<TimeoutResult<Buffer>>;

  /**
   * Close page with timeout
   */
  closePageWithTimeout(
    page: Page,
    context?: string,
  ): Promise<TimeoutResult<void>>;

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<
    string,
    { avg: number; p95: number; count: number; trend: string }
  >;
}

/**
 * Interface for Screenshot Capture Service
 */
export interface IScreenshotService {
  /**
   * Capture progressive screenshots during page load
   */
  captureProgressiveScreenshots(
    page: Page,
    testId: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<ScreenshotResult, void, unknown>;
}

/**
 * Interface for Cookie Detection Service
 */
export interface ICookieService {
  /**
   * Detect and handle cookie consent banners
   */
  detectAndHandleCookies(
    page: Page,
    testType: string,
  ): Promise<CookieHandlingResult>;
}

/**
 * Interface for Web Metrics Collection Service
 */
export interface IWebMetricsService {
  /**
   * Collect all performance metrics from page
   */
  collectMetrics(page: Page): AsyncGenerator<any, void, unknown>;
}

/**
 * Interface for Console Error Capture Service
 */
export interface IConsoleErrorService {
  /**
   * Capture console errors and messages
   */
  captureConsoleErrors(
    page: Page,
    testId: string,
  ): AsyncGenerator<ConsoleErrorsResult, void, unknown>;
}

/**
 * Interface for Browser Pool Service
 */
export interface IBrowserPoolService {
  /**
   * Acquire a page from the pool
   */
  requirePage(): Promise<Page>;

  /**
   * Release a page back to the pool
   */
  releasePage(page: Page): Promise<void>;

  /**
   * Get the browser instance
   */
  getBrowser(): Promise<Browser>;

  /**
   * Close all browsers and cleanup
   */
  close(): Promise<void>;

  /**
   * Check if pool is available
   */
  isAvailable(): boolean;
}

/**
 * Interface for Device Configuration Service
 */
export interface IDeviceConfigService {
  /**
   * Configure page for device type
   */
  configurePage(page: Page, deviceType: string): Promise<void>;

  /**
   * Get viewport configuration for device
   */
  getViewport(deviceType: string): {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };

  /**
   * Get user agent for device
   */
  getUserAgent(deviceType: string): string;
}

/**
 * Interface for Error Handler Service
 */
export interface IErrorHandlerService {
  /**
   * Handle and categorize errors
   */
  handleError(error: any, context?: string): {
    category: string;
    message: string;
    details?: any;
  };

  /**
   * Format error for response
   */
  formatErrorResponse(error: any): any;
}

/**
 * Interface for Rate Limiter Service
 */
export interface IRateLimiterService {
  /**
   * Check if request is allowed
   */
  checkRateLimit(identifier: string): Promise<boolean>;

  /**
   * Record request for rate limiting
   */
  recordRequest(identifier: string): Promise<void>;

  /**
   * Check concurrent test limit
   */
  checkConcurrentLimit(identifier: string): Promise<boolean>;

  /**
   * Register test start
   */
  registerTestStart(identifier: string, testId: string): Promise<void>;

  /**
   * Register test completion
   */
  registerTestComplete(identifier: string, testId: string): Promise<void>;
}

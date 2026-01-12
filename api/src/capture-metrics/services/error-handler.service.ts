import { Injectable, Logger } from '@nestjs/common';
import { Browser, BrowserContext, Page } from 'puppeteer';

export interface TestError {
  type: 'navigation' | 'timeout' | 'browser' | 'validation' | 'system';
  message: string;
  code?: string;
  stack?: string;
  timestamp: string;
  url?: string;
  testId?: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Handle and categorize errors that occur during testing
   */
  handleError(
    error: any,
    context: { url?: string; testId?: string; step?: string },
  ): TestError {
    const timestamp = new Date().toISOString();
    const baseError: Partial<TestError> = {
      timestamp,
      url: context.url,
      testId: context.testId,
    };

    // Navigation errors
    if (
      error.message?.includes('Navigation timeout') ||
      error.message?.includes('net::ERR_NAME_NOT_RESOLVED') ||
      error.message?.includes('net::ERR_CONNECTION_REFUSED')
    ) {
      return {
        ...baseError,
        type: 'navigation',
        message: `Navigation failed: ${error.message}`,
        code: 'NAVIGATION_ERROR',
      } as TestError;
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      return {
        ...baseError,
        type: 'timeout',
        message: `Operation timed out: ${error.message}`,
        code: 'TIMEOUT_ERROR',
      } as TestError;
    }

    // Browser errors
    if (
      error.message?.includes('browser') ||
      error.message?.includes('chromium')
    ) {
      return {
        ...baseError,
        type: 'browser',
        message: `Browser error: ${error.message}`,
        code: 'BROWSER_ERROR',
      } as TestError;
    }

    // Validation errors
    if (
      error.message?.includes('Invalid URL') ||
      error.message?.includes('blocked')
    ) {
      return {
        ...baseError,
        type: 'validation',
        message: `Validation error: ${error.message}`,
        code: 'VALIDATION_ERROR',
      } as TestError;
    }

    // System errors (default)
    return {
      ...baseError,
      type: 'system',
      message: error.message || 'Unknown error occurred',
      code: 'SYSTEM_ERROR',
      stack: error.stack,
    } as TestError;
  }

  /**
   * Safely cleanup browser resources with proper error handling
   */
  async cleanupBrowserResources(
    browser: Browser | null,
    context: BrowserContext | null,
    page: Page | null,
    testId: string,
  ): Promise<void> {
    const cleanupTimeout = 5000;
    const cleanupPromises: Promise<void>[] = [];

    // Close page
    if (page && !page.isClosed()) {
      cleanupPromises.push(
        this.safeClose(page.close(), 'Page', testId, cleanupTimeout),
      );
    }

    // Close context
    if (context) {
      cleanupPromises.push(
        this.safeClose(context.close(), 'Context', testId, cleanupTimeout),
      );
    }

    // Close browser
    if (browser && browser.isConnected()) {
      cleanupPromises.push(
        this.safeClose(browser.close(), 'Browser', testId, cleanupTimeout),
      );
    }

    // Wait for all cleanup operations
    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Safely close a resource with timeout
   */
  private async safeClose(
    closePromise: Promise<void>,
    resourceName: string,
    testId: string,
    timeout: number,
  ): Promise<void> {
    try {
      await Promise.race([
        closePromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${resourceName} cleanup timeout`)),
            timeout,
          ),
        ),
      ]);
      this.logger.debug(
        `${resourceName} closed successfully for test ${testId}`,
      );
    } catch (error) {
      this.logger.error(
        `${resourceName} cleanup failed for test ${testId}:`,
        error.message,
      );
    }
  }

  /**
   * Validate URL before testing
   */
  validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsedUrl = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          valid: false,
          error: 'Only HTTP and HTTPS protocols are allowed',
        };
      }

      // Check for blocked domains
      const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (
        blockedDomains.some((domain) => parsedUrl.hostname.includes(domain))
      ) {
        return {
          valid: false,
          error: 'Local/internal domains are not allowed',
        };
      }

      // Check URL length
      if (url.length > 2000) {
        return { valid: false, error: 'URL is too long (max 2000 characters)' };
      }

      return { valid: true };
    } catch (_error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Handle browser launch errors with retry logic
   */
  async launchBrowserWithRetry(
    launchFn: () => Promise<Browser>,
    maxRetries: number = 3,
  ): Promise<Browser> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const browser = await launchFn();
        this.logger.debug(
          `Browser launched successfully on attempt ${attempt}`,
        );
        return browser;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Browser launch failed on attempt ${attempt}:`,
          error.message,
        );

        if (attempt < maxRetries) {
          // Wait before retry, with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Failed to launch browser after retries');
  }
}

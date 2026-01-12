import { Injectable, Logger } from '@nestjs/common';
import { Page, ConsoleMessage } from 'puppeteer';
import { ErrorHandlerService } from './error-handler.service';

export interface ConsoleError {
  type: 'error' | 'warning' | 'log' | 'info' | 'debug';
  category: 'javascript' | 'network' | 'security' | 'deprecation' | 'other';
  message: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
  stack?: string;
  url?: string;
}

export interface ConsoleErrorsResult {
  totalErrors: number;
  totalWarnings: number;
  errors: {
    javascript: ConsoleError[];
    network: ConsoleError[];
    security: ConsoleError[];
    deprecation: ConsoleError[];
    other: ConsoleError[];
  };
}

@Injectable()
export class ConsoleErrorsService {
  private readonly logger = new Logger(ConsoleErrorsService.name);

  constructor(private readonly errorHandler: ErrorHandlerService) {}

  /**
   * Set up console error listeners on a page
   */
  async setupConsoleErrorCapture(page: Page): Promise<ConsoleError[]> {
    const consoleErrors: ConsoleError[] = [];

    // Capture console messages
    const consoleHandler = (msg: ConsoleMessage) => {
      try {
        const error = this.categorizeConsoleMessage(msg, page.url());
        if (error) {
          consoleErrors.push(error);

          // Log for debugging
          if (error.type === 'error') {
            this.logger.warn(`Console error captured: ${error.message}`);
          }
        }
      } catch (captureError) {
        this.logger.error('Error capturing console message:', captureError);
      }
    };

    // Set up error handlers
    const errorHandler = (error: Error) => {
      try {
        const consoleError: ConsoleError = {
          type: 'error',
          category: 'javascript',
          message: error.message,
          timestamp: new Date().toISOString(),
          stack: error.stack,
          url: page.url(),
        };
        consoleErrors.push(consoleError);
        this.logger.warn(`Page error captured: ${error.message}`);
      } catch (captureError) {
        this.logger.error('Error capturing page error:', captureError);
      }
    };

    const pageErrorHandler = (error: Error) => {
      try {
        const consoleError: ConsoleError = {
          type: 'error',
          category: 'javascript',
          message: error.message,
          timestamp: new Date().toISOString(),
          stack: error.stack,
          url: page.url(),
        };
        consoleErrors.push(consoleError);
        this.logger.warn(`Page error captured: ${error.message}`);
      } catch (captureError) {
        this.logger.error('Error capturing page error:', captureError);
      }
    };

    // Attach listeners
    page.on('console', consoleHandler);
    page.on('error', errorHandler);
    page.on('pageerror', pageErrorHandler);

    // Store reference to clean up later
    (page as any).__consoleErrorsListener = {
      console: consoleHandler,
      error: errorHandler,
      pageerror: pageErrorHandler,
    };

    return consoleErrors;
  }

  /**
   * Clean up console error listeners
   */
  async cleanupConsoleErrorCapture(page: Page): Promise<void> {
    try {
      const listeners = (page as any).__consoleErrorsListener;
      if (listeners) {
        page.off('console', listeners.console);
        page.off('error', listeners.error);
        page.off('pageerror', listeners.pageerror);
        delete (page as any).__consoleErrorsListener;
      }
    } catch (error) {
      this.logger.warn('Error cleaning up console listeners:', error);
    }
  }

  /**
   * Process collected console errors into categorized result
   */
  processConsoleErrors(consoleErrors: ConsoleError[]): ConsoleErrorsResult {
    const result: ConsoleErrorsResult = {
      totalErrors: 0,
      totalWarnings: 0,
      errors: {
        javascript: [],
        network: [],
        security: [],
        deprecation: [],
        other: [],
      },
    };

    for (const error of consoleErrors) {
      // Count by type
      if (error.type === 'error') {
        result.totalErrors++;
      } else if (error.type === 'warning') {
        result.totalWarnings++;
      }

      // Categorize by category
      result.errors[error.category].push(error);
    }

    return result;
  }

  /**
   * Categorize console messages into structured errors
   */
  private categorizeConsoleMessage(
    msg: ConsoleMessage,
    pageUrl: string,
  ): ConsoleError | null {
    const type = msg.type();
    const text = msg.text();

    // Only capture errors, warnings, and relevant messages
    if (!['error', 'warning', 'warn'].includes(type)) {
      return null;
    }

    const category = this.determineErrorCategory(text);
    const location = msg.location();

    return {
      type: type === 'warn' ? 'warning' : (type as 'error' | 'warning'),
      category,
      message: text,
      source: location?.url,
      line: location?.lineNumber,
      column: location?.columnNumber,
      timestamp: new Date().toISOString(),
      url: pageUrl,
    };
  }

  /**
   * Determine error category based on message content
   */
  private determineErrorCategory(message: string): ConsoleError['category'] {
    const lowerMessage = message.toLowerCase();

    // Network errors
    if (
      lowerMessage.includes('failed to load') ||
      lowerMessage.includes('net::') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('xhr') ||
      lowerMessage.includes('cors') ||
      lowerMessage.includes('network')
    ) {
      return 'network';
    }

    // Security errors
    if (
      lowerMessage.includes('csp') ||
      lowerMessage.includes('content security policy') ||
      lowerMessage.includes('mixed content') ||
      lowerMessage.includes('insecure') ||
      lowerMessage.includes('security')
    ) {
      return 'security';
    }

    // Deprecation warnings
    if (
      lowerMessage.includes('deprecated') ||
      lowerMessage.includes('deprecation') ||
      lowerMessage.includes('will be removed')
    ) {
      return 'deprecation';
    }

    // JavaScript errors (references, syntax, etc.)
    if (
      lowerMessage.includes('uncaught') ||
      lowerMessage.includes('reference') ||
      lowerMessage.includes('syntax') ||
      lowerMessage.includes('type') ||
      lowerMessage.includes('undefined') ||
      lowerMessage.includes('null') ||
      lowerMessage.includes('function') ||
      lowerMessage.includes('object')
    ) {
      return 'javascript';
    }

    return 'other';
  }

  /**
   * Generator function to yield progress during console error processing
   */
  async *processConsoleErrorsWithProgress(
    page: Page,
    testId: string,
  ): AsyncGenerator<{
    status: string;
    progress?: number;
    data?: ConsoleErrorsResult;
  }> {
    yield { status: 'Setting up console error capture...', progress: 10 };

    const consoleErrors = await this.setupConsoleErrorCapture(page);

    yield { status: 'Console error capture active', progress: 50 };

    // Wait a bit to collect errors during page load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = this.processConsoleErrors(consoleErrors);

    yield {
      status: 'CONSOLE_ERRORS_COMPLETE',
      data: result,
      progress: 100,
    };
  }
}

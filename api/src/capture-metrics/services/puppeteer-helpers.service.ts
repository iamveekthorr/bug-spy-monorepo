import { Injectable, Logger } from '@nestjs/common';
import { Page, ElementHandle } from 'puppeteer';
import { TimeoutService } from './timeout.service';

@Injectable()
export class PuppeteerHelpersService {
  private readonly logger = new Logger(PuppeteerHelpersService.name);

  constructor(private readonly timeoutService: TimeoutService) {}

  /**
   * Find elements by text content (replaces Playwright's hasText filter)
   */
  async findElementsByText(
    page: Page,
    selector: string,
    textPattern: string | RegExp,
  ): Promise<ElementHandle[]> {
    const elements = await page.$$(selector);
    const matchingElements: ElementHandle[] = [];

    for (const element of elements) {
      try {
        const textContent = await page.evaluate(
          (el) => el.textContent?.trim() || '',
          element,
        );

        const matches =
          typeof textPattern === 'string'
            ? textContent.includes(textPattern)
            : textPattern.test(textContent);

        if (matches) {
          matchingElements.push(element);
        }
      } catch (_error) {
        // Element might be stale, continue
        continue;
      }
    }

    return matchingElements;
  }

  /**
   * Find first element by text content
   */
  async findElementByText(
    page: Page,
    selector: string,
    textPattern: string | RegExp,
  ): Promise<ElementHandle | null> {
    const elements = await this.findElementsByText(page, selector, textPattern);
    return elements.length > 0 ? elements[0] : null;
  }

  /**
   * Check if element is visible (replaces Playwright's isVisible)
   */
  async isElementVisible(page: Page, element: ElementHandle): Promise<boolean> {
    try {
      return await page.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          style.opacity !== '0'
        );
      }, element);
    } catch {
      return false;
    }
  }

  /**
   * Get text content from element
   */
  async getTextContent(
    page: Page,
    element: ElementHandle,
  ): Promise<string | null> {
    try {
      return await page.evaluate(
        (el) => el.textContent?.trim() || null,
        element,
      );
    } catch {
      return null;
    }
  }

  /**
   * Count elements matching selector
   */
  async countElements(page: Page, selector: string): Promise<number> {
    try {
      const elements = await page.$$(selector);
      return elements.length;
    } catch {
      return 0;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElementVisible(
    page: Page,
    selector: string,
    timeout = 5000,
  ): Promise<ElementHandle | null> {
    try {
      await page.waitForSelector(selector, { visible: true, timeout });
      return await page.$(selector);
    } catch {
      return null;
    }
  }

  /**
   * Wait for load state (replaces Playwright's waitForLoadState)
   * Now uses intelligent timeout system with progressive fallbacks
   */
  async waitForLoadState(
    page: Page,
    state: 'load' | 'domcontentloaded' | 'networkidle',
    _options: { timeout?: number } = {},
  ): Promise<void> {
    // Check if page is closed before attempting to wait
    if (page.isClosed()) {
      throw new Error('Page is closed, cannot wait for load state');
    }

    let result;

    switch (state) {
      case 'load':
        result = await this.timeoutService.waitForLoadState(
          page,
          'load',
          `waitForLoadState-${state}`,
        );
        break;
      case 'domcontentloaded':
        result = await this.timeoutService.waitForLoadState(
          page,
          'domcontentloaded',
          `waitForLoadState-${state}`,
        );
        break;
      case 'networkidle':
        result = await this.timeoutService.waitForNetworkIdle(
          page,
          `waitForLoadState-${state}`,
        );
        break;
    }

    if (!result.success) {
      // Log performance info for debugging
      this.logger.warn(
        `waitForLoadState(${state}) failed after ${result.duration}ms with ${result.attempts} attempts using ${result.strategy} strategy: ${result.error}`,
      );
      throw new Error(result.error || `Failed to wait for ${state} state`);
    } else {
      // Log successful timing for optimization
      this.logger.debug(
        `waitForLoadState(${state}) succeeded in ${result.duration}ms with ${result.strategy} strategy (${result.attempts} attempts)`,
      );
    }
  }

  /**
   * Wait for timeout (replaces Playwright's waitForTimeout)
   */
  async waitForTimeout(page: Page, timeout: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  private requestHandlers = new Map<Page, (request: any) => void>();

  /**
   * Setup request interception (replaces Playwright's route)
   */
  async setupRequestInterception(
    page: Page,
    handler: (route: any, request: any) => void,
  ): Promise<void> {
    await page.setRequestInterception(true);

    const requestHandler = (request: any) => {
      // Convert Puppeteer request to Playwright-like route object
      const route = {
        abort: () => {
          try {
            request.abort();
          } catch (_error) {
            // Request might already be handled, ignore
          }
        },
        continue: () => {
          try {
            request.continue();
          } catch (_error) {
            // Request might already be handled, ignore
          }
        },
      };

      // Create a request-like object for compatibility
      const requestObj = {
        url: () => request.url(),
        resourceType: () => request.resourceType(),
      };

      try {
        handler(route, requestObj);
      } catch (_error) {
        // If handler fails, continue the request to avoid hanging
        try {
          request.continue();
        } catch (_continueError) {
          // Ignore if request was already handled
        }
      }
    };

    this.requestHandlers.set(page, requestHandler);
    page.on('request', requestHandler);
  }

  /**
   * Remove request interception
   */
  async removeRequestInterception(page: Page): Promise<void> {
    // Remove all request listeners first
    page.removeAllListeners('request');
    this.requestHandlers.delete(page);

    try {
      // Check if page is still open and connected
      if (!page.isClosed()) {
        // Disable interception with timeout to prevent hanging
        let timeoutHandle: NodeJS.Timeout;
        await Promise.race([
          page.setRequestInterception(false),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error('setRequestInterception timeout')),
              1000,
            );
          }),
        ]).finally(() => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        });
      }
    } catch (_error) {
      // Page might be closed or browser disconnected, ignore error
      this.logger.debug(
        'removeRequestInterception: Failed to disable interception (expected during cleanup)',
      );
    }
  }

  /**
   * Comprehensive cleanup for page release
   */
  async cleanupPageForRelease(page: Page): Promise<void> {
    try {
      // Remove request interception first to prevent navigation issues
      await this.removeRequestInterception(page);

      // Clear any remaining references
      this.cleanupPage(page);

      this.logger.debug(
        'cleanupPageForRelease: Successfully cleaned up page resources',
      );
    } catch (_error) {
      this.logger.debug(
        'cleanupPageForRelease: Error during cleanup (continuing anyway)',
      );
    }
  }

  /**
   * Clean up page references when page is closed
   */
  cleanupPage(page: Page): void {
    this.requestHandlers.delete(page);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BrowserPoolService } from './browser-pool.service';
import { PuppeteerHelpersService } from './puppeteer-helpers.service';

export interface CookieOptions {
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
}

@Injectable()
export class CookiesService {
  private readonly logger = new Logger(CookiesService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly puppeteerHelpers: PuppeteerHelpersService,
  ) {}

  /**
   * Non-intrusive cookie banner detection for performance testing
   * Detects cookie banners without clicking them to avoid metric interference
   */
  async *detectCookieConsent(
    page: Page,
    _url: string,
    _options: CookieOptions = {},
  ): AsyncGenerator<any> {
    yield {
      status: 'COOKIE_START',
      message: 'Starting non-intrusive cookie detection',
    };

    // Check if page is ready
    if (page.isClosed()) {
      yield { status: 'COOKIE_ERROR', error: 'Page is closed' };
      return { success: false, error: 'Page closed' };
    }

    try {
      // Wait briefly for cookie banners to appear (minimal interference)
      await this.puppeteerHelpers.waitForTimeout(page, 100);

      // Detect but don't click cookie banner
      const cookieButton = await this.findCookieButton(page);

      if (cookieButton.found) {
        yield {
          status: 'COOKIE_DETECTED',
          text: cookieButton.text,
          message: `Cookie banner detected: "${cookieButton.text}" (not clicked for performance test)`,
        };

        return {
          success: true,
          method: 'detected-only',
          text: cookieButton.text,
          message:
            'Cookie banner detected but not clicked to preserve metrics accuracy',
        };
      } else {
        yield {
          status: 'COOKIE_NOT_FOUND',
          message: 'No cookie banner detected',
        };

        return {
          success: false,
          method: 'none',
          message: 'No cookie banner found',
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield { status: 'COOKIE_ERROR', error: errorMessage };
      return { success: false, error: errorMessage };
    }
  }

  async *handleCookieConsent(
    page: Page,
    _url: string,
    options: CookieOptions = {},
  ): AsyncGenerator<any> {
    const {
      maxRetries = 1,
      timeout: _timeout = 3000,
      retryDelay = 200,
    } = options;

    yield { status: 'COOKIE_START', message: 'Starting cookie handling' };

    // Check if page is ready
    if (page.isClosed()) {
      yield { status: 'COOKIE_ERROR', error: 'Page is closed' };
      return { success: false, error: 'Page closed' };
    }

    // Wait for page to be ready with intelligent timeout system
    try {
      await this.puppeteerHelpers.waitForLoadState(page, 'domcontentloaded');
      yield {
        status: 'PAGE_READY',
        message: 'Page ready for cookie detection',
      };
    } catch (loadError) {
      const errorMessage =
        loadError instanceof Error ? loadError.message : String(loadError);
      this.logger.warn(
        `Page load not fully ready for cookie detection: ${errorMessage}`,
      );

      // Don't immediately fail - cookie banners often appear before full page load
      yield {
        status: 'COOKIE_WARNING',
        warning: 'Page not fully loaded, attempting cookie detection anyway',
        error: errorMessage,
      };

      // Check if page is still usable
      if (page.isClosed()) {
        yield { status: 'COOKIE_ERROR', error: 'Page is closed' };
        return { success: false, error: 'Page closed' };
      }
    }

    // Wait briefly for any cookie banners to appear
    yield {
      status: 'WAITING_FOR_COOKIE_BANNER',
      message: 'Waiting for cookie banner to appear',
    };
    await this.puppeteerHelpers.waitForTimeout(page, 200); // Minimal wait for speed

    // Try to find and click cookie banner
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (page.isClosed()) {
        yield { status: 'COOKIE_ERROR', error: 'Page closed during attempts' };
        return { success: false, error: 'Page closed' };
      }

      yield {
        status: 'COOKIE_ATTEMPT',
        attempt,
        message: `Cookie attempt ${attempt}/${maxRetries}`,
      };

      // Simple, effective cookie button detection
      const cookieButton = await this.findCookieButton(page);

      if (cookieButton.found) {
        yield {
          status: 'COOKIE_FOUND',
          text: cookieButton.text,
          message: `Found cookie button: "${cookieButton.text}"`,
        };

        try {
          // Try multiple click strategies to handle overlapping elements
          await this.performRobustClick(page, cookieButton.element);
          yield {
            status: 'COOKIE_CLICKED',
            text: cookieButton.text,
            message: 'Cookie button clicked',
          };

          // No wait needed - continue immediately after click

          // No screenshot logic - this is handled by the screenshot service

          yield {
            status: 'COOKIE_SUCCESS',
            message: 'Cookie banner handled successfully',
          };

          return {
            success: true,
            method: 'click',
            text: cookieButton.text,
          };
        } catch (clickError) {
          yield {
            status: 'COOKIE_CLICK_FAILED',
            error: clickError.message,
            message: 'Failed to click cookie button',
          };
        }
      } else {
        yield {
          status: 'COOKIE_NOT_FOUND',
          message: `No cookie button found on attempt ${attempt}`,
        };
      }

      // Wait before next attempt
      if (attempt < maxRetries) {
        await this.puppeteerHelpers.waitForTimeout(page, retryDelay);
      }
    }

    yield {
      status: 'COOKIE_NOT_FOUND',
      message: 'No cookie banner found after all attempts',
    };

    return {
      success: false,
      method: 'none',
      message: 'No cookie banner found',
    };
  }

  private async performRobustClick(page: Page, element: any): Promise<void> {
    // Strategy 1: Try normal click first with shorter timeout
    try {
      await element.click({ timeout: 1000 });
      return;
    } catch {
      this.logger.debug('Normal click failed, trying force click');
    }

    // Strategy 2: Try force click (ignores overlapping elements)
    try {
      await element.click({ force: true, timeout: 1000 });
      return;
    } catch {
      this.logger.debug('Force click failed, trying JavaScript click');
    }

    // Strategy 3: Try JavaScript click (direct DOM manipulation)
    try {
      await element.evaluate((el: HTMLElement) => {
        el.click();
      });
      return;
    } catch {
      this.logger.debug('JavaScript click failed, trying dispatch event');
    }

    // Strategy 4: Try dispatching click event
    try {
      await element.evaluate((el: HTMLElement) => {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        el.dispatchEvent(event);
      });
      return;
    } catch {
      this.logger.debug('Dispatch event failed, trying coordinate click');
    }

    // Strategy 5: Try clicking at element coordinates
    try {
      const box = await element.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        return;
      }
    } catch {
      this.logger.debug('Coordinate click failed');
    }

    // All strategies failed
    throw new Error(
      'All click strategies failed - element might be truly inaccessible',
    );
  }

  private async findCookieButton(page: Page): Promise<{
    found: boolean;
    element?: any;
    text?: string;
  }> {
    try {
      this.logger.debug('Starting precise cookie button detection');

      // Strategy 1: Look for exact button text matches (most precise)
      const exactButtonTexts = [
        'Accept',
        'Agree',
        'Accept All',
        'Accept all',
        'I Agree',
        'I Accept',
        'Agree and Close',
        'Got it',
        'OK',
        'Confirm',
        'Allow All',
        'Continue',
        'Yes',
        'Accept Cookies',
        'Accept All Cookies',
      ];

      for (const buttonText of exactButtonTexts) {
        // Look for exact text match in actual buttons
        const button = await this.puppeteerHelpers.findElementByText(
          page,
          'button, input[type="button"], input[type="submit"]',
          new RegExp(
            `^${buttonText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i',
          ),
        );

        if (
          button &&
          (await this.puppeteerHelpers.isElementVisible(page, button))
        ) {
          const text = await this.puppeteerHelpers.getTextContent(page, button);
          this.logger.debug(`Found exact button match: "${text?.trim()}"`);
          return {
            found: true,
            element: button,
            text: text?.trim() || buttonText,
          };
        }

        // Also check clickable links
        const link = await this.puppeteerHelpers.findElementByText(
          page,
          'a',
          new RegExp(
            `^${buttonText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i',
          ),
        );

        if (
          link &&
          (await this.puppeteerHelpers.isElementVisible(page, link))
        ) {
          const text = await this.puppeteerHelpers.getTextContent(page, link);
          this.logger.debug(`Found exact link match: "${text?.trim()}"`);
          return {
            found: true,
            element: link,
            text: text?.trim() || buttonText,
          };
        }
      }

      // Strategy 2: Look for short, action-oriented text in clickable elements
      const shortActionTexts = [
        'Accept',
        'Agree',
        'OK',
        'Yes',
        'Continue',
        'Allow',
        'Confirm',
      ];

      for (const actionText of shortActionTexts) {
        // Find elements with short text that exactly matches action words
        const button = await this.puppeteerHelpers.findElementByText(
          page,
          'button, a, input[type="button"], input[type="submit"]',
          new RegExp(
            `^\\s*${actionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
            'i',
          ),
        );

        if (
          button &&
          (await this.puppeteerHelpers.isElementVisible(page, button))
        ) {
          const text = await this.puppeteerHelpers.getTextContent(page, button);
          // Ensure it's really short text (not a long description)
          if (text && text.trim().length <= actionText.length + 10) {
            this.logger.debug(`Found short action button: "${text.trim()}"`);
            return {
              found: true,
              element: button,
              text: text.trim(),
            };
          }
        }
      }

      // Strategy 3: Look inside common cookie containers for buttons
      const cookieContainers = [
        '[class*="cookie" i]:visible',
        '[class*="consent" i]:visible',
        '[id*="cookie" i]:visible',
        '[id*="consent" i]:visible',
        '[role="dialog"]:visible',
        'div:has-text("cookie"):visible',
        'div:has-text("consent"):visible',
      ];

      for (const containerSelector of cookieContainers) {
        try {
          const container = await page.$(containerSelector);

          if (
            container &&
            (await this.puppeteerHelpers.isElementVisible(page, container))
          ) {
            // Look for buttons with short, actionable text inside the container
            const buttonsInContainer = await page.$$(
              containerSelector +
                ' button, ' +
                containerSelector +
                ' a, ' +
                containerSelector +
                ' input[type="button"], ' +
                containerSelector +
                ' input[type="submit"]',
            );

            for (const btn of buttonsInContainer) {
              if (
                btn &&
                (await this.puppeteerHelpers.isElementVisible(page, btn))
              ) {
                const text = await this.puppeteerHelpers.getTextContent(
                  page,
                  btn,
                );
                const trimmedText = text?.trim().toLowerCase() || '';

                // Look for short, actionable text
                if (
                  trimmedText.length > 0 &&
                  trimmedText.length <= 20 &&
                  (trimmedText === 'accept' ||
                    trimmedText === 'agree' ||
                    trimmedText === 'ok' ||
                    trimmedText === 'yes' ||
                    trimmedText === 'continue' ||
                    trimmedText === 'allow' ||
                    trimmedText === 'confirm' ||
                    trimmedText === 'accept all' ||
                    trimmedText === 'got it')
                ) {
                  this.logger.debug(
                    `Found actionable button in container: "${text?.trim()}"`,
                  );
                  return {
                    found: true,
                    element: btn,
                    text: text?.trim() || 'Cookie Button',
                  };
                }
              }
            }
          }
        } catch {
          // Skip this container if there's an error
        }
      }

      // Strategy 4: Find buttons with specific cookie-related attributes or classes
      const cookieButtonSelectors = [
        'button[data-testid*="accept" i]',
        'button[data-testid*="agree" i]',
        'button[class*="accept" i]',
        'button[class*="agree" i]',
        'button[id*="accept" i]',
        'button[id*="agree" i]',
        'a[data-testid*="accept" i]',
        'a[class*="accept" i]',
        '[data-qa*="accept" i]',
        '[data-cy*="accept" i]',
      ];

      for (const selector of cookieButtonSelectors) {
        const button = await page.$(selector);

        if (
          button &&
          (await this.puppeteerHelpers.isElementVisible(page, button))
        ) {
          const text = await this.puppeteerHelpers.getTextContent(page, button);
          this.logger.debug(
            `Found cookie button by selector ${selector}: "${text?.trim()}"`,
          );
          return {
            found: true,
            element: button,
            text: text?.trim() || 'Cookie Button',
          };
        }
      }

      this.logger.debug('No precise cookie button found');
      return { found: false };
    } catch (error) {
      this.logger.warn('Error finding cookie button:', error);
      return { found: false };
    }
  }
}

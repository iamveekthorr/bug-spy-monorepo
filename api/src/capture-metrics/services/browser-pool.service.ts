import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

import {
  HttpStatus,
  Logger,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppError } from '~/common/app-error.common';
import { TimeoutService } from './timeout.service';

/**
 * A pool of browsers to manage the creation and reuse of browser pages
 * with a maximum size limit.
 */
@Injectable()
export class BrowserPoolService implements OnModuleDestroy {
  private browserClosed: boolean = false;
  private browser: Browser | undefined;
  private releasedPages: Page[] = [];
  private requiredPages: Page[] = [];
  private readonly maxSize: number;
  private waitQueue: Array<(value: void | PromiseLike<void>) => void> = []; // Queue for waiting requests
  private browserLaunchPromise: Promise<Browser> | null = null; // Lock for launching
  private lastActivityTime: number = Date.now(); // Track last activity
  private readonly idleTimeoutMs: number; // Timeout duration in ms
  private readonly idleCheckIntervalMs: number; // How often to check
  private idleCheckTimer: NodeJS.Timeout | null = null; // Timer ID
  private readonly logger = new Logger(BrowserPoolService.name);
  private browserEventHandlers = new Map<string, (...args: any[]) => void>(); // Track event handlers
  private activeTimeouts = new Set<NodeJS.Timeout>(); // Track active timeouts for cleanup

  /**
   * Initializes a new instance of the BrowserPool class.
   * @param maxSize Maximum number of pages the pool can manage.
   * @param idleTimeoutMs Time in milliseconds before an idle browser is closed.0 disables idle timeout.
   * @param idleCheckIntervalMs How often (in ms) to check for idleness.
   * @param timeoutService Intelligent timeout service for adaptive timeouts.
   */
  public constructor(
    maxSize: number,
    idleTimeoutMs: number = 0,
    idleCheckIntervalMs: number = 60000,
    private readonly timeoutService?: TimeoutService,
  ) {
    this.maxSize = maxSize;
    this.idleTimeoutMs = idleTimeoutMs;
    this.idleCheckIntervalMs = Math.max(10000, idleCheckIntervalMs); // Ensure minimum check interval
    this.logger.debug(
      `BrowserPool initialized with maxSize=${maxSize}, idleTimeout=${idleTimeoutMs}ms`,
    );

    // Start idle check timer if timeout is enabled
    if (this.idleTimeoutMs > 0) {
      this.startIdleCheckTimer();
    }
  }

  /**
   * Checks if a given page is being tracked by the pool.
   * @param page The page to check.
   * @returns True if the page is being tracked, false otherwise.
   */
  public isPageTracked(page: Page): boolean {
    return this.requiredPages.includes(page);
  }

  private getCurrentSize(): number {
    return this.requiredPages.length + this.releasedPages.length;
  }

  /**
   * Gets a browser instance, launching a new one if necessary, handling concurrent requests.
   * @returns A promise that resolves to a browser instance.
   */
  private async getBrowser(): Promise<Browser> {
    const callId = Math.random().toString(36).substring(2, 8); // Unique ID for this call
    this.logger.debug(`[${callId}] getBrowser ENTER`);

    // If a browser exists and is connected, return it immediately
    if (this.browser && !this.browserClosed && this.browser.connected) {
      this.logger.debug(
        `[${callId}] getBrowser: Returning existing connected browser instance.`,
      );
      return this.browser;
    }
    this.logger.debug(
      `[${callId}] getBrowser: No usable existing browser (exists: ${!!this
        .browser}, closed: ${
        this.browserClosed
      }, connected: ${this.browser?.connected})`,
    );

    // FIX BUG 1: Race Condition - Use atomic check and set
    if (this.browserLaunchPromise) {
      this.logger.debug(
        `[${callId}] getBrowser: Launch promise exists, awaiting its completion...`,
      );
      try {
        const launchedBrowser = await this.browserLaunchPromise;
        this.logger.debug(
          `[${callId}] getBrowser: Awaited launch promise completed. Browser connected: ${launchedBrowser?.connected}`,
        );
        if (launchedBrowser?.connected) {
          this.logger.debug(
            `[${callId}] getBrowser: Returning browser from awaited promise.`,
          );
          return launchedBrowser;
        } else {
          this.logger.warn(
            `[${callId}] getBrowser: Awaited launch failed or resulted in disconnected browser. Will attempt a new launch.`,
          );
          // Clear the failed promise atomically
          if (await this.browserLaunchPromise) {
            this.browserLaunchPromise = null;
          }
        }
      } catch (error: any) {
        this.logger.warn(
          `[${callId}] getBrowser: Error awaiting existing launch promise: ${error.message}. Will attempt a new launch.`,
        );
        // Clear the failed promise atomically
        this.browserLaunchPromise = null;
      }
    } else {
      this.logger.debug(`[${callId}] getBrowser: No existing launch promise.`);
    }

    // If we reach here, we need to launch a new browser (or retry a failed launch)
    this.logger.debug(
      `[${callId}] getBrowser: Initiating new browser launch sequence...`,
    );

    // Create the launch promise and store it *before* starting the launch (atomic operation)
    this.browserLaunchPromise = this.launchNewBrowser(callId);

    this.logger.debug(
      `[${callId}] getBrowser: Returning the newly created launch promise.`,
    );
    return this.browserLaunchPromise;
  }

  /**
   * Launches a new browser instance with proper error handling and cleanup
   */
  private async launchNewBrowser(callId: string): Promise<Browser> {
    const launchId = Math.random().toString(36).substring(2, 8);
    this.logger.debug(`[${callId}] Launch IIFE START [${launchId}]`);

    try {
      // Attempt to close any potentially defunct previous instance
      if (this.browser) {
        try {
          this.logger.debug(
            `[${callId}] Launch IIFE [${launchId}]: Attempting to close previous browser instance...`,
          );
          await this.cleanupBrowser();
        } catch (e: any) {
          this.logger.warn(
            `[${callId}] Launch IIFE [${launchId}]: Error closing previous browser instance: ${e.message}`,
          );
        }
      }
      this.browser = undefined; // Ensure it's clear before launch
      this.browserClosed = true; // Assume closed until successfully launched

      this.logger.debug(
        `[${callId}] Launch IIFE [${launchId}]: Launching new chromium instance...`,
      );
      const newBrowser = await puppeteer.launch({
        headless: true,
        handleSIGTERM: false,
        handleSIGINT: false,
        handleSIGHUP: false,
        timeout: 30000,
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--memory-pressure-off',
          '--max-old-space-size=200',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      });

      // Always detach browser process from parent lifecycle
      try {
        // Access internal process reference if available
        const browserWithInternals = newBrowser as any;
        const browserProcess =
          browserWithInternals._connection?._transport?._process ||
          browserWithInternals.process;
        if (browserProcess && typeof browserProcess.unref === 'function') {
          browserProcess.unref();
          this.logger.debug(
            'Browser process detached from parent process lifecycle',
          );
        }
      } catch {
        // Ignore errors accessing internal browser process
        this.logger.debug(
          'Could not detach browser process (expected in some environments)',
        );
      }

      this.logger.debug(
        `[${callId}] Launch IIFE [${launchId}]: New browser launched successfully.`,
      );
      this.browser = newBrowser; // Assign the new browser
      this.browserClosed = false; // Mark as not closed

      // FIX BUG 2: Memory Leak - Properly track and clean up event handlers
      this.setupBrowserEventHandlers(newBrowser, callId, launchId);

      return newBrowser; // Return the successfully launched browser
    } catch (launchError: unknown) {
      const errorMessage =
        launchError instanceof Error
          ? launchError.message
          : String(launchError);
      const stack =
        launchError instanceof Error ? launchError.stack : undefined;
      this.logger.error(
        `[${callId}] Launch IIFE [${launchId}]: CRITICAL - Failed to launch browser: ${errorMessage}`,
        { stack },
      );
      this.browser = undefined; // Ensure browser is undefined on failure
      this.browserClosed = true;
      throw launchError; // Re-throw the error so callers know it failed
    } finally {
      // Once this launch attempt (successful or failed) is done, clear the promise
      // so the *next* call to getBrowser (if needed) can start a fresh attempt.
      this.logger.debug(
        `[${callId}] Launch IIFE [${launchId}] FINALLY: Clearing browser launch promise.`,
      );
      this.browserLaunchPromise = null;
    }
  }

  /**
   * Setup browser event handlers with proper cleanup tracking
   */
  private setupBrowserEventHandlers(
    browser: Browser,
    callId: string,
    launchId: string,
  ): void {
    // Clean up any existing handlers first
    this.cleanupBrowserEventHandlers();

    const disconnectedHandler = () => {
      this.logger.debug(
        `[${callId}] Launch IIFE [${launchId}]: Browser disconnected event received.`,
      );
      this.browserClosed = true;
      if (this.browser === browser) {
        // Avoid race conditions if a newer browser exists
        this.browser = undefined;
      }

      // Clear the launch promise if the current browser disconnects unexpectedly
      // This ensures the next getBrowser() call will create a fresh launch attempt
      if (this.browserLaunchPromise && this.browser === browser) {
        this.logger.debug(
          `Browser disconnected during active launch promise. Clearing promise for fresh retry.`,
        );
        this.browserLaunchPromise = null;
      }

      // Clean up event handlers when browser disconnects
      this.cleanupBrowserEventHandlers();
    };

    browser.on('disconnected', disconnectedHandler);
    this.browserEventHandlers.set('disconnected', disconnectedHandler);
  }

  /**
   * Clean up browser event handlers to prevent memory leaks
   */
  private cleanupBrowserEventHandlers(): void {
    if (this.browser && this.browserEventHandlers.size > 0) {
      for (const [event, handler] of this.browserEventHandlers) {
        try {
          this.browser.off(event, handler);
        } catch (error) {
          this.logger.warn(
            `Failed to remove event handler for ${event}:`,
            error,
          );
        }
      }
    }
    this.browserEventHandlers.clear();
  }

  /**
   * Clean up all active timeouts to prevent memory leaks
   */
  private cleanupActiveTimeouts(): void {
    this.activeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }

  /**
   * Track a timeout for cleanup
   */
  private trackTimeout(timeoutId: NodeJS.Timeout): void {
    this.activeTimeouts.add(timeoutId);
  }

  /**
   * Remove timeout from tracking when cleared
   */
  private untrackTimeout(timeoutId: NodeJS.Timeout): void {
    this.activeTimeouts.delete(timeoutId);
  }

  /**
   * Requires a page from the pool, reusing a released page if possible,
   * or creating a new one if necessary and space allows.
   * Waits if the pool is full.
   * @returns A promise that resolves to a page instance.
   */
  public async requirePage(): Promise<Page> {
    this.lastActivityTime = Date.now(); // Update activity time
    this.logger.debug(
      `requirePage: Pool state: Required=${
        this.requiredPages.length
      }, Released=${
        this.releasedPages.length
      }, Total=${this.getCurrentSize()}, Max=${this.maxSize}`,
    );

    // FIX BUG 3: Infinite Loop - Add safety checks and limits
    const maxRetries = 10;
    let retryCount = 0;

    // Try to reuse a released page first
    while (this.releasedPages.length > 0 && retryCount < maxRetries) {
      const page = this.releasedPages.pop()!;
      if (!page.isClosed() && this.browser?.connected) {
        this.logger.debug('requirePage: Reusing released page.');
        this.requiredPages.push(page);
        return page;
      } else {
        this.logger.warn(
          'requirePage: Found a closed/disconnected page in releasedPages, discarding.',
        );
        // Ensure waiting queue is notified if discarding reduces potential size implicitly
        this._notifyWaitQueue();
        retryCount++;
      }
    }

    // Reset retry count for pool waiting
    retryCount = 0;

    // No released page available, check size before creating a new one
    while (this.getCurrentSize() >= this.maxSize && retryCount < maxRetries) {
      this.logger.debug(
        `requirePage: Pool is full (${this.getCurrentSize()}/${
          this.maxSize
        }). Waiting for a page to be released...`,
      );

      await new Promise<void>((resolve) => this.waitQueue.push(resolve));

      this.logger.debug(
        'requirePage: Woke up from wait queue. Re-checking availability...',
      );

      // Re-check if a released page became available while waiting
      if (this.releasedPages.length > 0) {
        this.logger.debug(
          'requirePage: Found released page after waiting. Attempting reuse.',
        );
        // Break out of the pool waiting loop to try reuse
        break;
      }

      this.logger.debug(
        `requirePage: Still no released pages. Pool size: ${this.getCurrentSize()}. Max: ${
          this.maxSize
        }.`,
      );
      retryCount++;
    }

    // Safety check to prevent infinite loops
    if (retryCount >= maxRetries) {
      throw new AppError(
        'Pool operation exceeded maximum retries. This may indicate a deadlock or resource exhaustion.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // If we reach here, we should have capacity or found a reusable page
    // Try reuse one more time before creating new
    if (this.releasedPages.length > 0) {
      const page = this.releasedPages.pop()!;
      if (!page.isClosed() && this.browser?.connected) {
        this.logger.debug('requirePage: Reusing released page after wait.');
        this.requiredPages.push(page);
        return page;
      }
    }

    this.logger.debug('requirePage: Pool has capacity. Getting browser...');
    let browser = await this.getBrowser();

    // Double-check browser connection right before creating the page
    if (!browser.connected) {
      this.logger.warn(
        'requirePage: Browser disconnected unexpectedly between getBrowser and newPage. Retrying getBrowser...',
      );
      this.browserClosed = true;
      this.browser = undefined;
      browser = await this.getBrowser();

      if (!browser.connected) {
        this.logger.error(
          'requirePage: Failed to get a connected browser instance after retry.',
        );
        throw new AppError(
          'Failed to get a connected browser instance after retry.',
          HttpStatus.EXPECTATION_FAILED,
        );
      }
      this.logger.debug(
        'requirePage: Successfully obtained a new connected browser instance on retry.',
      );
    }

    this.logger.debug('requirePage: Attempting browser.newPage()...');
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      );
      await page.setBypassCSP(true);
      this.logger.debug('requirePage: New page created successfully.');
      this.requiredPages.push(page); // Add to required
      return page;
    } catch (error: any) {
      this.logger.error('requirePage: Error during browser.newPage():', {
        errorMessage: error.message,
        stack: error.stack,
      });
      if (
        error.message.includes(
          'Target page, context or browser has been closed',
        )
      ) {
        this.logger.error(
          'requirePage: Browser reported closed during newPage(). Marking as closed.',
        );
        this.browserClosed = true;
        this.browser = undefined;
        // Don't notify queue here, as we failed to add a page
      }
      // If page creation failed, make sure we potentially unblock waiting requests
      this._notifyWaitQueue();
      throw error;
    }
  }

  /**
   * Releases a page back to the pool.
   * @param page The page to release.
   */
  public async releasePage(page: Page): Promise<void> {
    this.lastActivityTime = Date.now();
    this.logger.debug('releasePage: Starting release process.');

    const requiredIndex = this.requiredPages.indexOf(page);
    if (requiredIndex === -1) {
      this._handleUnknownReleaseAttempt(page);
      return; // Exit early if page is not recognized as active
    }

    // Remove page from active list *before* attempting cleanup
    this.requiredPages.splice(requiredIndex, 1);
    this.logger.debug(`releasePage: Removed page from requiredPages list.`);

    try {
      // Attempt to cleanup the page (navigate to blank) and pool it, or close it.
      await this._cleanupOrClosePage(page);
    } catch (error: any) {
      // Catch unexpected errors from _cleanupOrClosePage itself
      this.logger.error(
        `releasePage: Unexpected error during page cleanup/close: ${error.message}`,
      );
      // Ensure page is attempted to be closed even if _cleanupOrClosePage fails unexpectedly
      await this._closePageSafely(page, 'releasePage main catch');
    } finally {
      // Always notify the queue after a page is removed from requiredPages,
      // regardless of whether it was successfully pooled or closed,
      // as a slot has become available.
      this.logger.debug('releasePage: Notifying wait queue.');
      this._notifyWaitQueue();
    }
    this.logger.debug('releasePage: Finished release process.');
  }

  /**
   * Handles the logic when an attempt is made to release a page
   * that is not currently tracked as required/active.
   */
  private _handleUnknownReleaseAttempt(page: Page): void {
    this.logger.warn(
      'releasePage: Attempted to release an unknown or already released page.',
    );
    if (this.releasedPages.includes(page)) {
      this.logger.warn(
        'releasePage: Page was found in releasedPages (potential double release).',
      );
    }
  }

  /**
   * Attempts to clean up a page for reuse or properly dispose of it.
   * Uses a comprehensive strategy that doesn't rely on navigation.
   */
  private async _cleanupOrClosePage(page: Page): Promise<void> {
    // First check if page is already closed
    if (page.isClosed()) {
      this.logger.debug(
        'releasePage: Page is already closed, no cleanup needed.',
      );
      return;
    }

    // Check if browser is still connected
    const browser = this.browser;
    if (!browser || !browser.connected) {
      this.logger.debug(
        'releasePage: Browser disconnected, cannot cleanup page. Page will be discarded.',
      );
      return;
    }

    this.logger.debug(
      'releasePage: Page is open and browser connected. Attempting comprehensive cleanup.',
    );

    try {
      // Strategy: Clean up page state without relying on navigation
      // This is more reliable than trying to navigate to about:blank

      // 1. Stop all ongoing activity first
      await this._stopPageActivity(page);

      // 2. Check if page is still usable after stopping activity
      const isPageUsable = await this._isPageUsableForReuse(page);

      if (isPageUsable) {
        // Page is clean and can be reused
        this.releasedPages.push(page);
        this.logger.debug(
          'releasePage: Page cleaned and added back to released pool.',
        );
      } else {
        // Page is not in a good state for reuse, close it
        this.logger.debug('releasePage: Page not suitable for reuse, closing.');
        await this._closePageSafely(page, 'not suitable for reuse');
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      // Handle specific error cases
      if (
        errorMessage.includes('Target page, context or browser has been closed')
      ) {
        this.logger.debug(
          'releasePage: Page was closed during cleanup, no further action needed.',
        );
      } else {
        this.logger.warn(
          `releasePage: Error during cleanup: ${errorMessage}. Closing page instead.`,
        );
        await this._closePageSafely(page, 'cleanup error');
      }
    }
  }

  /**
   * Stops all ongoing activity on the page without navigation
   */
  private async _stopPageActivity(page: Page): Promise<void> {
    // First check if page is still valid
    if (page.isClosed() || !this.browser?.connected) {
      throw new Error('Page or browser is already closed');
    }

    // Stop all ongoing requests, scripts, and activity with timeout protection
    let evaluateTimeout: NodeJS.Timeout | undefined;
    await Promise.race([
      page.evaluate(() => {
        try {
          // Stop all timers - use a safer approach
          for (let i = 1; i <= 10000; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
          }

          // Cancel any ongoing fetch requests if possible
          if (window.AbortController) {
            // This won't cancel existing requests but helps with future ones
            window.fetch = () =>
              Promise.reject(new Error('Page being cleaned up'));
          }

          return true;
        } catch {
          // Ignore errors in cleanup - page might already be detached
          return false;
        }
      }),
      new Promise((_, reject) => {
        evaluateTimeout = setTimeout(
          () => reject(new Error('Evaluate timeout')),
          1000,
        );
      }),
    ]).finally(() => {
      if (evaluateTimeout) {
        clearTimeout(evaluateTimeout);
      }
    });

    // Remove all listeners that might interfere with cleanup
    // This is safe to call even if page is detached
    page.removeAllListeners();
  }

  /**
   * Checks if a page is in a good state for reuse
   */
  private async _isPageUsableForReuse(page: Page): Promise<boolean> {
    try {
      // Check if page is still connected first
      if (page.isClosed() || !this.browser?.connected) {
        return false;
      }

      // Check if page is still responsive with a quick evaluation
      let timeoutHandle: NodeJS.Timeout | undefined;
      const isResponsive = await Promise.race([
        page.evaluate(() => document.readyState),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error('Page unresponsive')),
            500,
          );
        }),
      ]).finally(() => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      });

      if (!isResponsive) {
        return false;
      }

      // For safety, we'll implement a more conservative approach:
      // Only reuse pages that are at about:blank or simple pages
      const currentUrl = page.url();
      if (currentUrl === 'about:blank' || currentUrl === 'data:,') {
        return true;
      }

      // If page is not at a blank state, we'll close it instead of trying to navigate
      // This avoids the "Navigating frame was detached" errors
      return false;
    } catch {
      // If any check fails, page is not suitable for reuse
      return false;
    }
  }

  /**
   * FIX BUG 4: Page Close Timeout Race Condition
   * Safely attempts to close a Puppeteer page with proper timeout management
   */
  private async _closePageSafely(page: Page, context: string): Promise<void> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      // Check if page is already closed or browser is disconnected
      if (page.isClosed()) {
        this.logger.debug(`releasePage [${context}]: Page was already closed.`);
        return;
      }

      // Check if the browser is still connected
      const browser = this.browser;
      if (!browser || !browser.connected) {
        this.logger.debug(
          `releasePage [${context}]: Browser disconnected, cannot close page gracefully.`,
        );
        return;
      }

      // Get the target ID before attempting to close to help with debugging
      let targetId: string | undefined;
      try {
        const target = await page.createCDPSession();
        targetId = target.id() || 'unknown';
      } catch {
        // Ignore if we can't get target ID
      }

      this.logger.debug(
        `releasePage [${context}]: Attempting to close page (target: ${targetId}).`,
      );

      // Use intelligent timeout system if available, otherwise fallback to static timeout
      if (this.timeoutService) {
        const result =
          await this.timeoutService.closePageWithTimeout(
            page,
            `${context}-close`,
          );

        if (!result.success) {
          throw new Error(result.error || 'Failed to close page');
        }

        this.logger.debug(
          `releasePage [${context}]: Closed page successfully in ${result.duration}ms using ${result.strategy} strategy.`,
        );
      } else {
        // Fallback to static timeout with proper cleanup
        await Promise.race([
          page.close({ runBeforeUnload: false }), // Skip beforeunload to prevent hanging
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(
              () =>
                reject(
                  new AppError(
                    'Page close timeout',
                    HttpStatus.EXPECTATION_FAILED,
                  ),
                ),
              3000, // Reduced timeout for faster recovery
            );
          }),
        ]);

        this.logger.debug(
          `releasePage [${context}]: Closed page successfully (fallback method).`,
        );
      }
    } catch (closeError: unknown) {
      const errorMessage =
        closeError instanceof Error ? closeError.message : String(closeError);

      // Handle specific Chrome DevTools Protocol errors gracefully
      if (
        errorMessage.includes('No target with given id found') ||
        [
          'Target page, context or browser has been closed',
          'Protocol error (Target.closeTarget): No target with given id found',
          ' Target closed',
          'Session closed',
        ].includes(errorMessage)
      ) {
        this.logger.debug(
          `releasePage [${context}]: Page already closed by browser - ${errorMessage}`,
        );
      } else if (errorMessage.includes('Page close timeout')) {
        this.logger.warn(
          `releasePage [${context}]: Page close timed out, page may still be open`,
        );
      } else {
        this.logger.warn(
          `releasePage [${context}]: Error closing page: ${errorMessage}`,
        );
      }
      // Log the error, but don't rethrow. The goal is to release the slot.
    } finally {
      // Clean up timeout if it was set
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  // Helper to notify the wait queue
  private _notifyWaitQueue(): void {
    if (this.waitQueue.length > 0) {
      this.logger.debug(
        `_notifyWaitQueue: Notifying ${
          this.waitQueue.length
        } waiting request(s). Current pool size ${this.getCurrentSize()}/${
          this.maxSize
        }`,
      );
      const resolve = this.waitQueue.shift(); // Get the first waiting resolver
      if (resolve) {
        resolve(); // Unblock the promise
        this.logger.debug('_notifyWaitQueue: Signaled one waiting request.');
      }
    }
  }

  /**
   * Closes the browser instance and cleans up resources.
   */
  public async close(): Promise<void> {
    this.logger.debug('BrowserPool: Closing browser and cleaning up...');

    // Clear wait queue to prevent pending operations
    this.waitQueue.forEach((resolve) => resolve()); // Resolve all waiting promises immediately
    this.waitQueue = [];

    // Close all pages with improved error handling
    const allPages = [...this.requiredPages, ...this.releasedPages];
    const closePagePromises = allPages.map(async (page) => {
      let timeoutHandle: NodeJS.Timeout | undefined;
      try {
        if (!page.isClosed()) {
          // Use race condition to prevent hanging on close
          await Promise.race([
            page.close({ runBeforeUnload: false }), // Skip beforeunload
            new Promise((_, reject) => {
              timeoutHandle = setTimeout(
                () =>
                  reject(
                    new AppError(
                      'Page close timeout during pool cleanup',
                      HttpStatus.EXPECTATION_FAILED,
                    ),
                  ),
                3000,
              );
            }),
          ]);
        }
      } catch (e: any) {
        const errorMessage = e.message || String(e);
        if (
          errorMessage.includes(
            'Target page, context or browser has been closed',
          ) ||
          errorMessage.includes(
            'Protocol error (Target.closeTarget): No target with given id found',
          ) ||
          errorMessage.includes('No target with given id found') ||
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Session closed')
        ) {
          this.logger.debug(
            'close: Page already closed during pool cleanup (expected).',
          );
        } else {
          this.logger.warn(
            `close: Error closing page during pool cleanup: ${errorMessage}`,
          );
        }
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    });

    // Wait for all page closures with a reasonable timeout
    try {
      let timeoutHandle: NodeJS.Timeout | undefined;
      await Promise.race([
        Promise.all(closePagePromises),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () =>
              reject(
                new AppError(
                  'Pool cleanup timeout',
                  HttpStatus.EXPECTATION_FAILED,
                ),
              ),
            10000,
          );
        }),
      ]).finally(() => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      });
    } catch {
      this.logger.warn(
        'close: Page cleanup timed out, proceeding with browser closure.',
      );
    }
    this.requiredPages = [];
    this.releasedPages = [];

    // Clean up browser
    await this.cleanupBrowser();

    // Clear idle check timer
    this.stopIdleCheckTimer();
  }

  /**
   * Clean up browser instance and event handlers
   */
  private async cleanupBrowser(): Promise<void> {
    if (this.browser && !this.browserClosed) {
      try {
        // Clean up event handlers first
        this.cleanupBrowserEventHandlers();

        // Close browser with timeout to prevent hanging
        let timeoutHandle: NodeJS.Timeout | undefined;
        await Promise.race([
          this.browser.close(),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(
              () =>
                reject(
                  new AppError(
                    'Browser close timeout',
                    HttpStatus.EXPECTATION_FAILED,
                  ),
                ),
              5000,
            );
          }),
        ]).finally(() => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        });
        this.logger.debug('BrowserPool: Browser instance closed.');
      } catch (e: any) {
        const errorMessage = e.message || String(e);
        if (errorMessage.includes('Browser close timeout')) {
          this.logger.warn(
            'BrowserPool: Browser close timed out, forcing cleanup.',
          );
        } else {
          this.logger.error(
            `BrowserPool: Error closing browser instance: ${errorMessage}`,
          );
        }
      }
    }
    this.browser = undefined;
    this.browserClosed = true;
  }

  /**
   * Start the idle check timer
   */
  private startIdleCheckTimer(): void {
    if (this.idleCheckTimer) {
      return; // Already running
    }

    this.idleCheckTimer = setInterval(() => {
      this._checkIdleTimeout().catch((error) => {
        this.logger.error('Error in idle timeout check:', error.message);
      });
    }, this.idleCheckIntervalMs);

    // Track the timer for cleanup
    this.trackTimeout(this.idleCheckTimer);

    // Prevent Node.js from exiting just because this timer is active
    this.idleCheckTimer.unref();
  }

  /**
   * Stop the idle check timer
   */
  private stopIdleCheckTimer(): void {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.untrackTimeout(this.idleCheckTimer);
      this.idleCheckTimer = null;
      this.logger.debug('BrowserPool: Idle check timer stopped.');
    }
  }

  /**
   * OnModuleDestroy lifecycle hook - ensures cleanup when the module is destroyed
   * This prevents memory leaks when the service is destroyed by the DI container
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      'BrowserPoolService: onModuleDestroy lifecycle hook triggered',
    );

    try {
      // Stop idle timer first to prevent new operations
      this.stopIdleCheckTimer();

      // Clean up all tracked timeouts
      this.cleanupActiveTimeouts();

      // Clean up event handlers
      this.cleanupBrowserEventHandlers();

      // Close browser and clean up pages
      await this.close();

      this.logger.log(
        'BrowserPoolService: Successfully cleaned up all resources',
      );
    } catch (error) {
      this.logger.error(
        'BrowserPoolService: Error during onModuleDestroy cleanup:',
        error,
      );
      // Don't throw - we want graceful degradation during shutdown
    }
  }

  // --- Idle Timeout Logic ---
  private async _checkIdleTimeout(): Promise<void> {
    if (!this.browser || this.browserClosed || !this.browser.connected) {
      // No browser or already closed/disconnected, nothing to do
      return;
    }

    if (this.requiredPages.length > 0) {
      // Pages are actively in use, reset activity time and return
      this.lastActivityTime = Date.now();
      return;
    }

    const idleDuration = Date.now() - this.lastActivityTime;
    this.logger.debug(
      `_checkIdleTimeout: Current idle duration: ${idleDuration}ms / ${this.idleTimeoutMs}ms`,
    );

    if (idleDuration > this.idleTimeoutMs) {
      this.logger.debug(
        `BrowserPool: Idle timeout exceeded (${idleDuration}ms > ${this.idleTimeoutMs}ms). Closing idle browser.`,
      );
      await this.close(); // Close the pool (which closes the browser)
    }
  }
}

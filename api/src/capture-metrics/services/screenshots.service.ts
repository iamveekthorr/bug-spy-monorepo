import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BrowserPoolService } from './browser-pool.service';

export interface ScreenshotOptions {
  deviceType: DeviceType;
  interval?: number;
  maxDuration?: number;
  maxFrames?: number;
  outputDir?: string;
  prefix?: string;
  format?: 'png' | 'jpeg';
  fullPage?: boolean;
  networkAware?: boolean; // Whether to adapt to network conditions
}
@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(private readonly browserPool: BrowserPoolService) {}

  async *captureScreenshots(
    page: Page,
    options: ScreenshotOptions,
  ): AsyncGenerator<any> {
    const {
      deviceType,
      interval = 500, // Faster screenshots
      maxDuration = 10000, // Shorter duration
      maxFrames = 15, // Fewer frames
      outputDir = './screenshots',
      prefix = `${deviceType}-frame`,
      format = 'jpeg',
    } = options;

    // const config = this.deviceConfigs[deviceType];
    let frameCount = 0;
    const startTime = Date.now();
    const screenshots: string[] = [];

    try {
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      yield {
        status: 'SCREENSHOT_START',
        deviceType,
        message: `Starting ${deviceType} screenshot capture`,
      };

      // Start immediately - capture from the very beginning like WebPageTest.org
      // This captures blank screens, loading states, and full page progression

      while (frameCount < maxFrames) {
        const elapsed = Date.now() - startTime;
        const _currentTimestamp = Date.now();

        if (elapsed >= maxDuration || page.isClosed()) {
          break;
        }

        // Create filename with timestamp (like WebPageTest.org)
        const secondsElapsed = Math.floor(elapsed / 1000);
        const filename = `${prefix}-${secondsElapsed}s-${String(frameCount + 1).padStart(4, '0')}.${format}`;
        const filepath = path.join(outputDir, filename);

        try {
          // Speed-optimized screenshot settings
          const screenshotOptions: any = {
            path: filepath as `${string}.${string}`,
            type: format === 'jpeg' ? 'jpeg' : 'png',
            quality: format === 'jpeg' ? 75 : undefined, // Reduced from 90 for speed
            fullPage: false, // Always capture viewport only
            omitBackground: true, // Faster processing
          };

          await page.screenshot(screenshotOptions);

          // Verify file was created - accept ALL screenshots including blank ones (like WebPageTest.org)
          const stats = await fs.stat(filepath).catch(() => null);
          if (stats && stats.size > 500) {
            // Lower threshold to capture blank/loading screens
            screenshots.push(filepath);
            frameCount++;

            this.logger.log(
              `Screenshot ${frameCount} at ${secondsElapsed}s: ${stats.size} bytes`,
            );
          } else {
            this.logger.warn(
              `Screenshot ${frameCount + 1} at ${secondsElapsed}s was too small (${stats?.size || 0} bytes)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Screenshot ${frameCount + 1} failed:`,
            error.message,
          );
          yield {
            status: 'SCREENSHOT_ERROR',
            error: error.message,
            frameNumber: frameCount + 1,
          };
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      yield {
        status: 'SCREENSHOT_COMPLETE',
        frameCount,
        deviceType,
        message: `Screenshot capture complete - ${frameCount} screenshots taken`,
      };

      return { screenshots, frameCount, deviceType };
    } catch (error) {
      this.logger.error('Screenshot service error:', error);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BrowserPoolService } from './browser-pool.service';
import { S3StorageService } from './s3-storage.service';

export interface ScreenshotOptions {
  deviceType: DeviceType;
  testId: string; // Required for S3 storage organization
  interval?: number;
  maxDuration?: number;
  maxFrames?: number;
  format?: 'png' | 'jpeg';
  fullPage?: boolean;
  networkAware?: boolean; // Whether to adapt to network conditions
}
@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly s3Storage: S3StorageService,
  ) {}

  async *captureScreenshots(
    page: Page,
    options: ScreenshotOptions,
  ): AsyncGenerator<any> {
    const {
      deviceType,
      testId,
      interval = 500, // Faster screenshots
      maxDuration = 10000, // Shorter duration
      maxFrames = 15, // Fewer frames
      format = 'jpeg',
    } = options;

    let frameCount = 0;
    const startTime = Date.now();
    const screenshotUrls: string[] = [];

    try {
      yield {
        status: 'SCREENSHOT_START',
        deviceType,
        message: `Starting ${deviceType} screenshot capture`,
      };

      // Start immediately - capture from the very beginning like WebPageTest.org
      // This captures blank screens, loading states, and full page progression

      while (frameCount < maxFrames) {
        const elapsed = Date.now() - startTime;

        if (elapsed >= maxDuration || page.isClosed()) {
          break;
        }

        const secondsElapsed = Math.floor(elapsed / 1000);

        try {
          // Capture screenshot as buffer (in-memory, no disk I/O)
          const screenshotBuffer = await page.screenshot({
            type: format === 'jpeg' ? 'jpeg' : 'png',
            quality: format === 'jpeg' ? 75 : undefined, // Reduced from 90 for speed
            fullPage: false, // Always capture viewport only
            omitBackground: true, // Faster processing
            encoding: 'binary', // Return Buffer instead of base64
          });

          // Verify buffer size - accept ALL screenshots including blank ones (like WebPageTest.org)
          if (screenshotBuffer && screenshotBuffer.length > 500) {
            // Upload to S3
            const s3Url = await this.s3Storage.uploadScreenshot(
              screenshotBuffer as Buffer,
              {
                testId,
                deviceType,
                frameNumber: frameCount + 1,
                format,
              },
            );

            screenshotUrls.push(s3Url);
            frameCount++;

            this.logger.log(
              `Screenshot ${frameCount} at ${secondsElapsed}s uploaded to S3: ${screenshotBuffer.length} bytes`,
            );

            // Yield progress update with S3 URL
            yield {
              status: 'SCREENSHOT_CAPTURED',
              frameNumber: frameCount,
              url: s3Url,
              deviceType,
              timestamp: secondsElapsed,
            };
          } else {
            this.logger.warn(
              `Screenshot ${frameCount + 1} at ${secondsElapsed}s was too small (${screenshotBuffer?.length || 0} bytes)`,
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
        screenshots: screenshotUrls, // Include S3 URLs in completion event
        message: `Screenshot capture complete - ${frameCount} screenshots uploaded to S3`,
      };

      return { screenshots: screenshotUrls, frameCount, deviceType };
    } catch (error) {
      this.logger.error('Screenshot service error:', error);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { KnownDevices } from 'puppeteer';

export interface DeviceConfig {
  viewport: { width: number; height: number };
  userAgent: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

@Injectable()
export class DeviceConfigService {
  private readonly customDevices: Record<string, DeviceConfig> = {
    desktop: {
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
    'desktop-hd': {
      viewport: { width: 2560, height: 1440 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  };

  getDeviceConfig(deviceType: DeviceType): DeviceConfig {
    // Check if it's a custom device
    if (this.customDevices[deviceType]) {
      return this.customDevices[deviceType];
    }

    // Check if it's a Puppeteer device
    const puppeteerDevice = KnownDevices[deviceType];
    if (puppeteerDevice) {
      return {
        viewport: puppeteerDevice.viewport,
        userAgent: puppeteerDevice.userAgent,
        deviceScaleFactor: puppeteerDevice.deviceScaleFactor || 1,
        isMobile: puppeteerDevice.isMobile || false,
        hasTouch: puppeteerDevice.hasTouch || false,
      };
    }

    // Default to desktop if device not found
    return this.customDevices['desktop'];
  }

  async configurePageForDevice(
    page: any,
    deviceType: DeviceType,
  ): Promise<void> {
    const config = this.getDeviceConfig(deviceType);

    try {
      // Set viewport - use Puppeteer API
      await page.setViewport(config.viewport);

      // For user agent, we'll use evaluate to override navigator.userAgent
      // This is more reliable than trying to set headers
      await page.evaluate((userAgent) => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => userAgent,
          configurable: true,
        });
      }, config.userAgent);

      // Configure mobile-specific settings
      if (config.isMobile) {
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 5,
            configurable: true,
          });
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to configure device ${deviceType}: ${errorMessage}`,
      );
      // Continue anyway - basic page functionality should still work
    }
  }

  private readonly logger = new Logger(DeviceConfigService.name);

  getAvailableDevices(): string[] {
    return [...Object.keys(this.customDevices), ...Object.keys(KnownDevices)];
  }
}

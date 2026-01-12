import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsService } from '../../services/screenshots.service';
import { BrowserPoolService } from '../../services/browser-pool.service';
import { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import * as _path from 'path';

// fs is already mocked globally in jest.setup.js

describe('ScreenshotsService', () => {
  let service: ScreenshotsService;
  let mockPage: jest.Mocked<Page>;
  let mockFs: jest.Mocked<typeof fs>;
  let activeGenerators: Set<AsyncGenerator<any, any, unknown>> = new Set();

  beforeEach(async () => {
    jest.useFakeTimers();
    activeGenerators = new Set();

    const mockBrowserPoolService = {
      requirePage: jest.fn(),
      releasePage: jest.fn(),
      isPageTracked: jest.fn(),
      close: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenshotsService,
        {
          provide: BrowserPoolService,
          useValue: mockBrowserPoolService,
        },
      ],
    }).compile();

    service = module.get<ScreenshotsService>(ScreenshotsService);
    mockFs = fs as jest.Mocked<typeof fs>;

    // Mock page object
    mockPage = {
      screenshot: jest.fn(),
      isClosed: jest.fn().mockReturnValue(false),
    } as any;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up all active generators
    for (const generator of activeGenerators) {
      try {
        await generator.return(undefined);
      } catch (_error) {
        // Ignore errors during cleanup
      }
    }
    activeGenerators.clear();

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('captureScreenshots', () => {
    const defaultOptions = {
      deviceType: 'desktop' as DeviceType,
      interval: 500,
      maxDuration: 5000,
      maxFrames: 10,
      outputDir: './test-screenshots',
      format: 'jpeg' as const,
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        size: 1000,
        isFile: () => true,
      } as any);
      mockPage.screenshot.mockResolvedValue(Buffer.from('fake-screenshot'));
    });

    it('should capture screenshots successfully', async () => {
      const generator = service.captureScreenshots(mockPage, defaultOptions);
      activeGenerators.add(generator);
      const results: any[] = [];

      try {
        for await (const result of generator) {
          results.push(result);
        }
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }

      expect(results).toHaveLength(2); // START and COMPLETE
      expect(results[0]).toEqual({
        status: 'SCREENSHOT_START',
        deviceType: 'desktop',
        message: 'Starting desktop screenshot capture',
      });
      expect(results[1]).toEqual({
        status: 'SCREENSHOT_COMPLETE',
        frameCount: 10,
        deviceType: 'desktop',
        message: 'Screenshot capture complete - 10 screenshots taken',
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('./test-screenshots', {
        recursive: true,
      });
      expect(mockPage.screenshot).toHaveBeenCalledTimes(10);
    }, 10000);

    it('should respect maxFrames limit', async () => {
      const options = { ...defaultOptions, maxFrames: 3 };
      const generator = service.captureScreenshots(mockPage, options);
      activeGenerators.add(generator);
      const results: any[] = [];

      try {
        for await (const result of generator) {
          results.push(result);
        }
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }

      expect(mockPage.screenshot).toHaveBeenCalledTimes(3);
      expect(results[1].frameCount).toBe(3);
    });

    it('should respect maxDuration limit', async () => {
      const options = { ...defaultOptions, maxDuration: 100, interval: 50 };
      const generator = service.captureScreenshots(mockPage, options);
      activeGenerators.add(generator);
      const results: any[] = [];

      try {
        for await (const result of generator) {
          results.push(result);
        }
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }

      // Should capture fewer frames due to time limit
      expect(mockPage.screenshot).toHaveBeenCalledTimes(2);
    });

    it('should handle screenshot errors gracefully', async () => {
      mockPage.screenshot
        .mockResolvedValueOnce(Buffer.from('screenshot1'))
        .mockRejectedValueOnce(new Error('Screenshot failed'))
        .mockResolvedValueOnce(Buffer.from('screenshot3'));

      const generator = service.captureScreenshots(mockPage, defaultOptions);
      activeGenerators.add(generator);
      const results: any[] = [];

      try {
        for await (const result of generator) {
          results.push(result);
        }
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }

      const errorResults = results.filter(
        (r) => r.status === 'SCREENSHOT_ERROR',
      );
      expect(errorResults).toHaveLength(1);
      expect(errorResults[0]).toEqual({
        status: 'SCREENSHOT_ERROR',
        error: 'Screenshot failed',
        frameNumber: 2,
      });
    }, 10000);

    it('should skip screenshots that are too small', async () => {
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000 } as any) // Good size
        .mockResolvedValueOnce({ size: 200 } as any) // Too small
        .mockResolvedValueOnce({ size: 1500 } as any); // Good size

      const options = { ...defaultOptions, maxFrames: 3 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      // Should complete with 3 total frames (including the skipped small one)
      expect(results[1].frameCount).toBe(3);
    });

    it('should stop when page is closed', async () => {
      mockPage.isClosed
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true); // Page closed on third check

      const generator = service.captureScreenshots(mockPage, defaultOptions);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      // Should stop early when page is closed
      expect(mockPage.screenshot).toHaveBeenCalledTimes(2);
    });

    it('should use correct screenshot options', async () => {
      const options = {
        ...defaultOptions,
        format: 'png' as const,
        maxFrames: 2,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringContaining('.png'),
        type: 'png',
        quality: undefined,
        fullPage: false,
        animations: 'disabled',
        omitBackground: true,
      });
    });

    it('should use JPEG quality settings', async () => {
      const options = {
        ...defaultOptions,
        format: 'jpeg' as const,
        maxFrames: 1,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringContaining('.jpeg'),
        type: 'jpeg',
        quality: 75,
        fullPage: false,
        animations: 'disabled',
        omitBackground: true,
      });
    });

    it('should create output directory if it does not exist', async () => {
      const options = {
        ...defaultOptions,
        outputDir: './custom-dir',
        maxFrames: 1,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockFs.mkdir).toHaveBeenCalledWith('./custom-dir', {
        recursive: true,
      });
    });

    it('should generate correct filename format', async () => {
      const options = {
        ...defaultOptions,
        prefix: 'test-frame',
        maxFrames: 1,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringMatching(/test-frame-\d+s-\d{4}\.jpeg$/),
        type: 'jpeg',
        quality: 75,
        fullPage: false,
        animations: 'disabled',
        omitBackground: true,
      });
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const generator = service.captureScreenshots(mockPage, defaultOptions);
      activeGenerators.add(generator);

      try {
        await expect(async () => {
          for await (const _result of generator) {
            // Should throw error
          }
        }).rejects.toThrow('Permission denied');
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }
    });

    it('should handle stat errors gracefully', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      const options = { ...defaultOptions, maxFrames: 1 };
      const generator = service.captureScreenshots(mockPage, options);
      activeGenerators.add(generator);
      const results: any[] = [];

      try {
        for await (const result of generator) {
          results.push(result);
        }
      } finally {
        await generator.return(undefined);
        activeGenerators.delete(generator);
      }

      // Should continue despite stat error
      expect(results[1].frameCount).toBe(0); // No successful screenshots due to stat error
    }, 10000);

    it('should respect interval timing', async () => {
      jest.useRealTimers(); // Use real timers for this timing test

      const options = {
        ...defaultOptions,
        interval: 10, // Use shorter interval to speed up test
        maxFrames: 2,
      };

      const startTime = Date.now();
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least the interval time (10ms between 2 screenshots)
      expect(duration).toBeGreaterThan(10);
    });

    it('should generate unique filenames with timestamps', async () => {
      const options = { ...defaultOptions, maxFrames: 2 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const calls = mockPage.screenshot.mock.calls;
      const path1 = calls[0]?.[0]?.path;
      const path2 = calls[1]?.[0]?.path;

      // Filenames should be different
      expect(path1).not.toBe(path2);
      expect(path1).toMatch(/desktop-frame-\d+s-0001\.jpeg$/);
      expect(path2).toMatch(/desktop-frame-\d+s-0002\.jpeg$/);
    });
  });
});

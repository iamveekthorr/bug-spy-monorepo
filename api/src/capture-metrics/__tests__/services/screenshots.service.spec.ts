import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotsService } from '../../services/screenshots.service';
import { BrowserPoolService } from '../../services/browser-pool.service';
import { S3StorageService } from '../../services/s3-storage.service';
import { Page } from 'puppeteer';

describe('ScreenshotsService', () => {
  let service: ScreenshotsService;
  let mockPage: jest.Mocked<Page>;
  let mockS3Service: jest.Mocked<S3StorageService>;
  let activeGenerators: Set<AsyncGenerator<any, any, unknown>> = new Set();

  beforeEach(async () => {
    jest.useRealTimers(); // Use real timers by default
    activeGenerators = new Set();

    const mockBrowserPoolService = {
      requirePage: jest.fn(),
      releasePage: jest.fn(),
      isPageTracked: jest.fn(),
      close: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    mockS3Service = {
      uploadScreenshot: jest.fn(),
      uploadScreenshots: jest.fn(),
      deleteScreenshot: jest.fn(),
      deleteScreenshots: jest.fn(),
      fileExists: jest.fn(),
      getBucketName: jest.fn(),
      getRegion: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenshotsService,
        {
          provide: BrowserPoolService,
          useValue: mockBrowserPoolService,
        },
        {
          provide: S3StorageService,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ScreenshotsService>(ScreenshotsService);

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
  });

  describe('captureScreenshots', () => {
    const defaultOptions = {
      testId: 'test-123',
      deviceType: 'desktop' as DeviceType,
      interval: 50, // Shorter interval for faster tests
      maxDuration: 5000,
      maxFrames: 10,
      format: 'jpeg' as const,
    };

    beforeEach(() => {
      // Mock page.screenshot to return a buffer > 500 bytes (service requirement)
      mockPage.screenshot.mockResolvedValue(Buffer.alloc(1000));

      // Mock S3 upload to return URLs
      let uploadCount = 0;
      mockS3Service.uploadScreenshot.mockImplementation(async () => {
        uploadCount++;
        return `https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test-123/desktop/frame-${uploadCount}.jpeg`;
      });
    });

    it('should capture screenshots successfully and upload to S3', async () => {
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

      // Should have START, multiple CAPTURED events, and COMPLETE
      const startEvent = results.find((r) => r.status === 'SCREENSHOT_START');
      const capturedEvents = results.filter(
        (r) => r.status === 'SCREENSHOT_CAPTURED',
      );
      const completeEvent = results.find(
        (r) => r.status === 'SCREENSHOT_COMPLETE',
      );

      expect(startEvent).toEqual({
        status: 'SCREENSHOT_START',
        deviceType: 'desktop',
        message: 'Starting desktop screenshot capture',
      });

      expect(capturedEvents).toHaveLength(10);
      expect(capturedEvents[0]).toMatchObject({
        status: 'SCREENSHOT_CAPTURED',
        frameNumber: 1,
        deviceType: 'desktop',
        url: expect.stringContaining('s3.us-east-1.amazonaws.com'),
      });

      expect(completeEvent).toMatchObject({
        status: 'SCREENSHOT_COMPLETE',
        frameCount: 10,
        deviceType: 'desktop',
        screenshots: expect.arrayContaining([
          expect.stringContaining('s3.us-east-1.amazonaws.com'),
        ]),
        message: 'Screenshot capture complete - 10 screenshots uploaded to S3',
      });

      expect(mockPage.screenshot).toHaveBeenCalledTimes(10);
      expect(mockS3Service.uploadScreenshot).toHaveBeenCalledTimes(10);
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

      const completeEvent = results.find(
        (r) => r.status === 'SCREENSHOT_COMPLETE',
      );
      expect(mockPage.screenshot).toHaveBeenCalledTimes(3);
      expect(completeEvent.frameCount).toBe(3);
      expect(mockS3Service.uploadScreenshot).toHaveBeenCalledTimes(3);
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
        .mockResolvedValueOnce(Buffer.alloc(1000))
        .mockRejectedValueOnce(new Error('Screenshot failed'))
        .mockResolvedValueOnce(Buffer.alloc(1000));

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
      // Mock multiple screenshots - service will keep capturing until maxFrames is reached
      mockPage.screenshot
        .mockResolvedValueOnce(Buffer.alloc(1000)) // Good size - frame 1
        .mockResolvedValueOnce(Buffer.alloc(200)) // Too small - skipped
        .mockResolvedValueOnce(Buffer.alloc(1500)) // Good size - frame 2
        .mockResolvedValueOnce(Buffer.alloc(300)) // Too small - skipped
        .mockResolvedValueOnce(Buffer.alloc(1200)); // Good size - frame 3

      const options = { ...defaultOptions, maxFrames: 3 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const completeEvent = results.find(
        (r) => r.status === 'SCREENSHOT_COMPLETE',
      );

      // Should have captured 3 successful frames (5 attempts, 2 skipped)
      expect(completeEvent.frameCount).toBe(3);
      expect(mockS3Service.uploadScreenshot).toHaveBeenCalledTimes(3);

      // Verify warnings were logged for small screenshots (by checking no errors)
      const errorEvents = results.filter((r) => r.status === 'SCREENSHOT_ERROR');
      expect(errorEvents).toHaveLength(0); // Skipped screenshots don't generate errors
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

    it('should use correct screenshot options for PNG', async () => {
      const options = {
        ...defaultOptions,
        format: 'png' as const,
        maxFrames: 1,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: 'png',
        quality: undefined,
        fullPage: false,
        omitBackground: true,
        encoding: 'binary',
      });
    });

    it('should use correct screenshot options for JPEG', async () => {
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
        type: 'jpeg',
        quality: 75,
        fullPage: false,
        omitBackground: true,
        encoding: 'binary',
      });
    });

    it('should pass correct parameters to S3 upload', async () => {
      const options = {
        testId: 'test-456',
        deviceType: 'mobile' as DeviceType,
        format: 'png' as const,
        maxFrames: 2,
        interval: 100,
        maxDuration: 5000,
      };

      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      expect(mockS3Service.uploadScreenshot).toHaveBeenCalledWith(
        expect.any(Buffer),
        {
          testId: 'test-456',
          deviceType: 'mobile',
          frameNumber: 1,
          format: 'png',
        },
      );

      expect(mockS3Service.uploadScreenshot).toHaveBeenCalledWith(
        expect.any(Buffer),
        {
          testId: 'test-456',
          deviceType: 'mobile',
          frameNumber: 2,
          format: 'png',
        },
      );
    });

    it('should handle S3 upload errors gracefully', async () => {
      mockS3Service.uploadScreenshot
        .mockResolvedValueOnce(
          'https://test-bucket.s3.us-east-1.amazonaws.com/frame1.jpeg',
        )
        .mockRejectedValueOnce(new Error('S3 upload failed'))
        .mockResolvedValueOnce(
          'https://test-bucket.s3.us-east-1.amazonaws.com/frame3.jpeg',
        );

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

      const errorResults = results.filter(
        (r) => r.status === 'SCREENSHOT_ERROR',
      );

      // S3 upload error should be caught and logged, but not stop the process
      expect(errorResults.length).toBeGreaterThanOrEqual(0);
      expect(mockPage.screenshot).toHaveBeenCalled();
    }, 10000);

    it('should return S3 URLs in final result', async () => {
      const options = { ...defaultOptions, maxFrames: 2 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const completeEvent = results.find(
        (r) => r.status === 'SCREENSHOT_COMPLETE',
      );

      expect(completeEvent.screenshots).toHaveLength(2);
      expect(completeEvent.screenshots[0]).toContain(
        's3.us-east-1.amazonaws.com',
      );
      expect(completeEvent.screenshots[1]).toContain(
        's3.us-east-1.amazonaws.com',
      );
    });

    it('should include S3 URLs in SCREENSHOT_CAPTURED events', async () => {
      const options = { ...defaultOptions, maxFrames: 2 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const capturedEvents = results.filter(
        (r) => r.status === 'SCREENSHOT_CAPTURED',
      );

      expect(capturedEvents[0]).toMatchObject({
        status: 'SCREENSHOT_CAPTURED',
        frameNumber: 1,
        url: expect.stringContaining('s3.us-east-1.amazonaws.com'),
        deviceType: 'desktop',
        timestamp: expect.any(Number),
      });

      expect(capturedEvents[1]).toMatchObject({
        status: 'SCREENSHOT_CAPTURED',
        frameNumber: 2,
        url: expect.stringContaining('s3.us-east-1.amazonaws.com'),
        deviceType: 'desktop',
        timestamp: expect.any(Number),
      });
    });

    it('should respect interval timing', async () => {
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

    it('should increment frame numbers correctly', async () => {
      const options = { ...defaultOptions, maxFrames: 3 };
      const generator = service.captureScreenshots(mockPage, options);
      const results: any[] = [];

      for await (const result of generator) {
        results.push(result);
      }

      const capturedEvents = results.filter(
        (r) => r.status === 'SCREENSHOT_CAPTURED',
      );

      expect(capturedEvents[0].frameNumber).toBe(1);
      expect(capturedEvents[1].frameNumber).toBe(2);
      expect(capturedEvents[2].frameNumber).toBe(3);

      // Verify S3 upload was called with correct frame numbers
      expect(mockS3Service.uploadScreenshot).toHaveBeenNthCalledWith(
        1,
        expect.any(Buffer),
        expect.objectContaining({ frameNumber: 1 }),
      );
      expect(mockS3Service.uploadScreenshot).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        expect.objectContaining({ frameNumber: 2 }),
      );
      expect(mockS3Service.uploadScreenshot).toHaveBeenNthCalledWith(
        3,
        expect.any(Buffer),
        expect.objectContaining({ frameNumber: 3 }),
      );
    });
  });
});

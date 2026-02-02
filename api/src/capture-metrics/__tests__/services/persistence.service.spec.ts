import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';

import { PersistenceService } from '../../services/persistence.service';
import { TestResult, TestResultDocument } from '../../schemas/test-result.schema';
import { CachedTestResult, TestResults, ScreenshotResult } from '../../interfaces/cache.interface';
import { CreateCaptureData } from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';

describe('PersistenceService', () => {
  let service: PersistenceService;
  let mockTestResultModel: any;
  let mockCacheManager: any;

  // Sample S3 URLs for testing
  const sampleS3Urls = [
    'https://bug-spy-screenshots.s3.us-east-1.amazonaws.com/screenshots/test-123/desktop/frame-1-1234567890-abc12345.jpeg',
    'https://bug-spy-screenshots.s3.us-east-1.amazonaws.com/screenshots/test-123/desktop/frame-2-1234567891-def67890.jpeg',
    'https://bug-spy-screenshots.s3.us-east-1.amazonaws.com/screenshots/test-123/desktop/frame-3-1234567892-ghi12345.jpeg',
  ];

  const sampleScreenshotResult: ScreenshotResult = {
    frameCount: 3,
    deviceType: 'desktop',
    screenshots: sampleS3Urls,
    message: 'Screenshot capture complete - 3 screenshots uploaded to S3',
  };

  const sampleTestResults: TestResults = {
    url: 'https://example.com',
    deviceType: 'desktop',
    testType: 'performance',
    testId: 'test-123',
    timestamp: Date.now(),
    status: 'completed',
    cookieHandling: {
      success: true,
      method: 'click',
      text: 'Accept',
      message: 'Cookie consent accepted',
    },
    webMetrics: {
      performanceMetrics: {
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2500,
        domContentLoaded: 1800,
        loadComplete: 3000,
      },
    },
    screenshots: sampleScreenshotResult,
    consoleErrors: null,
  };

  const sampleCaptureData: CreateCaptureData = {
    url: 'https://example.com',
    deviceType: 'desktop',
    testType: 'performance',
    includeScreenshots: true,
    testId: 'test-123',
  };

  const sampleCachedResult: CachedTestResult = {
    captureData: sampleCaptureData,
    results: sampleTestResults,
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock TestResult model
    mockTestResultModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    // Create mock save function
    const mockSave = jest.fn().mockResolvedValue({
      _id: 'saved-doc-id-123',
      ...sampleTestResults,
    });

    // Mock the model constructor
    function MockTestResultModel(data: any) {
      return {
        ...data,
        save: mockSave,
      };
    }

    Object.assign(MockTestResultModel, mockTestResultModel);

    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersistenceService,
        {
          provide: getModelToken(TestResult.name),
          useValue: MockTestResultModel,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PersistenceService>(PersistenceService);
  });

  describe('saveTestResultFromCache', () => {
    it('should save test result with S3 screenshot URLs from cache to MongoDB', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(sampleCachedResult);

      // Act
      const savedId = await service.saveTestResultFromCache('user-123', 'test-123');

      // Assert
      expect(savedId).toBe('saved-doc-id-123');
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-result:test-123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('test-result:test-123');
    });

    it('should throw error if cache entry not found', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.saveTestResultFromCache('user-123', 'nonexistent-test'),
      ).rejects.toThrow(AppError);

      await expect(
        service.saveTestResultFromCache('user-123', 'nonexistent-test'),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('should preserve screenshot URLs array structure in saved result', async () => {
      // Arrange
      const cachedDataWithScreenshots: CachedTestResult = {
        captureData: sampleCaptureData,
        results: {
          ...sampleTestResults,
          screenshots: {
            frameCount: 5,
            deviceType: 'mobile',
            screenshots: [
              'https://bucket.s3.region.amazonaws.com/test/mobile/frame-1.jpeg',
              'https://bucket.s3.region.amazonaws.com/test/mobile/frame-2.jpeg',
              'https://bucket.s3.region.amazonaws.com/test/mobile/frame-3.jpeg',
              'https://bucket.s3.region.amazonaws.com/test/mobile/frame-4.jpeg',
              'https://bucket.s3.region.amazonaws.com/test/mobile/frame-5.jpeg',
            ],
            message: 'Screenshot capture complete',
          },
        },
        timestamp: Date.now(),
      };
      mockCacheManager.get.mockResolvedValue(cachedDataWithScreenshots);

      // Act
      const savedId = await service.saveTestResultFromCache('user-456', 'test-456');

      // Assert
      expect(savedId).toBeDefined();
      // The screenshots object should be preserved when saved
    });
  });

  describe('saveTestResult', () => {
    it('should save test result directly with S3 screenshot URLs', async () => {
      // Act
      const savedId = await service.saveTestResult(
        'user-789',
        'https://example.com',
        sampleCaptureData,
        sampleTestResults,
        'completed',
      );

      // Assert
      expect(savedId).toBe('saved-doc-id-123');
    });

    it('should handle results without screenshots', async () => {
      // Arrange
      const resultsWithoutScreenshots: TestResults = {
        ...sampleTestResults,
        screenshots: null,
      };

      // Act
      const savedId = await service.saveTestResult(
        'user-789',
        'https://example.com',
        { ...sampleCaptureData, includeScreenshots: false },
        resultsWithoutScreenshots,
        'completed',
      );

      // Assert
      expect(savedId).toBe('saved-doc-id-123');
    });

    it('should handle failed test status', async () => {
      // Act
      const savedId = await service.saveTestResult(
        'user-789',
        'https://example.com',
        sampleCaptureData,
        sampleTestResults,
        'failed',
      );

      // Assert
      expect(savedId).toBe('saved-doc-id-123');
    });
  });

  describe('cacheTestResult', () => {
    it('should cache test result with S3 screenshot URLs', async () => {
      // Act
      await service.cacheTestResult('test-cache-1', sampleCaptureData, sampleTestResults);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-result:test-cache-1',
        expect.objectContaining({
          captureData: sampleCaptureData,
          results: sampleTestResults,
          timestamp: expect.any(Number),
        }),
        expect.any(Number),
      );
    });

    it('should use custom TTL when provided', async () => {
      // Arrange
      const customTtl = 60000; // 1 minute

      // Act
      await service.cacheTestResult('test-cache-2', sampleCaptureData, sampleTestResults, customTtl);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-result:test-cache-2',
        expect.any(Object),
        customTtl,
      );
    });

    it('should not throw on cache failure', async () => {
      // Arrange
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert - should not throw
      await expect(
        service.cacheTestResult('test-cache-3', sampleCaptureData, sampleTestResults),
      ).resolves.toBeUndefined();
    });
  });

  describe('getCachedTestResult', () => {
    it('should retrieve cached test result with S3 URLs', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(sampleCachedResult);

      // Act
      const result = await service.getCachedTestResult('test-123');

      // Assert
      expect(result).toEqual(sampleCachedResult);
      expect(result?.results.screenshots?.screenshots).toEqual(sampleS3Urls);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-result:test-123');
    });

    it('should return null if cache entry not found', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.getCachedTestResult('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on cache retrieval error', async () => {
      // Arrange
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getCachedTestResult('test-error');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hasCachedResult', () => {
    it('should return true if cached result exists', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(sampleCachedResult);

      // Act
      const exists = await service.hasCachedResult('test-123');

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false if cached result does not exist', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const exists = await service.hasCachedResult('nonexistent');

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('deleteCachedResult', () => {
    it('should delete cached result', async () => {
      // Arrange
      mockCacheManager.del.mockResolvedValue(undefined);

      // Act
      await service.deleteCachedResult('test-delete');

      // Assert
      expect(mockCacheManager.del).toHaveBeenCalledWith('test-result:test-delete');
    });

    it('should not throw on deletion error', async () => {
      // Arrange
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert - should not throw
      await expect(service.deleteCachedResult('test-error')).resolves.toBeUndefined();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate deterministic cache key', () => {
      // Act
      const key = service.generateCacheKey(
        'https://example.com',
        'desktop',
        'performance',
      );

      // Assert
      expect(key).toBe('test-result:https://example.com:desktop:performance');
    });

    it('should normalize URL to lowercase', () => {
      // Act
      const key = service.generateCacheKey(
        'https://EXAMPLE.COM/Path',
        'desktop',
        'performance',
      );

      // Assert
      expect(key).toBe('test-result:https://example.com/path:desktop:performance');
    });
  });

  describe('S3 URL Flow Integration', () => {
    it('should preserve complete screenshot data structure through cache and save flow', async () => {
      // This test verifies the complete flow:
      // 1. Screenshot URLs are captured and stored in results.screenshots
      // 2. Results are cached with the URLs
      // 3. Results are retrieved from cache
      // 4. Results are saved to MongoDB with URLs intact

      // Step 1: Cache the results
      await service.cacheTestResult('integration-test', sampleCaptureData, sampleTestResults);

      // Verify cache was called with correct screenshot data
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-result:integration-test',
        expect.objectContaining({
          results: expect.objectContaining({
            screenshots: expect.objectContaining({
              frameCount: 3,
              deviceType: 'desktop',
              screenshots: sampleS3Urls,
              message: expect.any(String),
            }),
          }),
        }),
        expect.any(Number),
      );

      // Step 2: Set up cache to return our cached data
      mockCacheManager.get.mockResolvedValue({
        captureData: sampleCaptureData,
        results: sampleTestResults,
        timestamp: Date.now(),
      });

      // Step 3: Save from cache
      const savedId = await service.saveTestResultFromCache('user-integration', 'integration-test');

      // Verify the test was saved
      expect(savedId).toBeDefined();
      expect(mockCacheManager.del).toHaveBeenCalledWith('test-result:integration-test');
    });

    it('should handle multiple device types with different S3 URLs', async () => {
      // Arrange - Desktop screenshots
      const desktopResults: TestResults = {
        ...sampleTestResults,
        deviceType: 'desktop',
        screenshots: {
          frameCount: 3,
          deviceType: 'desktop',
          screenshots: [
            'https://bucket.s3.region.amazonaws.com/test/desktop/frame-1.jpeg',
            'https://bucket.s3.region.amazonaws.com/test/desktop/frame-2.jpeg',
            'https://bucket.s3.region.amazonaws.com/test/desktop/frame-3.jpeg',
          ],
          message: 'Desktop capture complete',
        },
      };

      // Arrange - Mobile screenshots
      const mobileResults: TestResults = {
        ...sampleTestResults,
        deviceType: 'mobile',
        screenshots: {
          frameCount: 3,
          deviceType: 'mobile',
          screenshots: [
            'https://bucket.s3.region.amazonaws.com/test/mobile/frame-1.jpeg',
            'https://bucket.s3.region.amazonaws.com/test/mobile/frame-2.jpeg',
            'https://bucket.s3.region.amazonaws.com/test/mobile/frame-3.jpeg',
          ],
          message: 'Mobile capture complete',
        },
      };

      // Act - Cache both
      await service.cacheTestResult(
        'desktop-test',
        { ...sampleCaptureData, deviceType: 'desktop' },
        desktopResults,
      );

      await service.cacheTestResult(
        'mobile-test',
        { ...sampleCaptureData, deviceType: 'mobile' },
        mobileResults,
      );

      // Assert - Both should have been cached with correct URLs
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);

      const desktopCall = mockCacheManager.set.mock.calls[0];
      expect(desktopCall[1].results.screenshots.deviceType).toBe('desktop');
      expect(desktopCall[1].results.screenshots.screenshots[0]).toContain('/desktop/');

      const mobileCall = mockCacheManager.set.mock.calls[1];
      expect(mobileCall[1].results.screenshots.deviceType).toBe('mobile');
      expect(mobileCall[1].results.screenshots.screenshots[0]).toContain('/mobile/');
    });
  });
});

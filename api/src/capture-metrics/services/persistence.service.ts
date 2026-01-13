import { Injectable, Logger, Inject, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { TestResult, TestResultDocument } from '../schemas/test-result.schema';
import { CachedTestResult, TestResults } from '../interfaces/cache.interface';
import { CreateCaptureData } from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';
import { CACHE_CONFIG } from '../config/capture.config';

/**
 * Persistence Service
 *
 * Handles all data persistence operations:
 * - Saving test results to MongoDB
 * - Caching results in Redis
 * - Retrieving cached results
 * - Cache management and invalidation
 *
 * Extracted from CaptureOrchestratorService to follow Single Responsibility Principle
 */
@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);
  private readonly CACHE_TTL_MS = CACHE_CONFIG.TTL_MS;
  private readonly CACHE_KEY_PREFIX = CACHE_CONFIG.KEY_PREFIX;

  constructor(
    @InjectModel(TestResult.name)
    private readonly testResultModel: Model<TestResultDocument>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.logger.log('PersistenceService initialized');
  }

  /**
   * Save test result from temporary cache to permanent database storage
   *
   * @param userId - User ID who owns this test result
   * @param testId - Unique test identifier
   * @returns MongoDB document ID of saved result
   */
  async saveTestResultFromCache(
    userId: string,
    testId: string,
  ): Promise<string> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;
    const tempData = await this.cacheManager.get<CachedTestResult>(cacheKey);

    if (!tempData) {
      throw new AppError(
        `Test result not found for testId: ${testId}. Result may have expired or doesn't exist.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const testResult = new this.testResultModel({
        userId,
        url: tempData.captureData.url,
        timestamp: new Date(),
        results: tempData.results,
        testConfig: {
          deviceType: tempData.captureData.deviceType,
          testType: tempData.captureData.testType,
          includeScreenshots: tempData.captureData.includeScreenshots,
          networkType: tempData.captureData.networkType,
          testId: testId,
        },
        status: 'completed',
      });

      const savedResult = await testResult.save();

      // Remove from cache after successful save
      await this.cacheManager.del(cacheKey);

      this.logger.log(
        `Test result saved to database for user: ${userId}, testId: ${testId}`,
      );

      return savedResult._id.toString();
    } catch (error: any) {
      this.logger.error(
        'Failed to save test result to database:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Save test result directly to database
   *
   * @param userId - User ID who owns this test result
   * @param url - URL that was tested
   * @param captureData - Capture configuration data
   * @param results - Test results to save
   * @param status - Test status (completed/failed)
   * @returns MongoDB document ID of saved result
   */
  async saveTestResult(
    userId: string,
    url: string,
    captureData: CreateCaptureData,
    results: TestResults,
    status: 'completed' | 'failed',
  ): Promise<string> {
    try {
      const testResult = new this.testResultModel({
        userId,
        url,
        timestamp: new Date(),
        results,
        testConfig: {
          deviceType: captureData.deviceType,
          testType: captureData.testType,
          includeScreenshots: captureData.includeScreenshots,
          networkType: captureData.networkType,
          testId: captureData.testId,
        },
        status,
      });

      const savedResult = await testResult.save();
      this.logger.log(`Test result saved to database for user: ${userId}`);
      return savedResult._id.toString();
    } catch (error: any) {
      this.logger.error(
        'Failed to save test result to database:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Cache test result in Redis for temporary storage
   *
   * @param testId - Unique test identifier
   * @param captureData - Capture configuration
   * @param results - Test results to cache
   * @param ttlMs - Time-to-live in milliseconds (optional, uses default if not provided)
   */
  async cacheTestResult(
    testId: string,
    captureData: CreateCaptureData,
    results: TestResults,
    ttlMs?: number,
  ): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;
    const cachedData: CachedTestResult = {
      captureData,
      results,
      timestamp: Date.now(),
    };

    const ttl = ttlMs || this.CACHE_TTL_MS;

    try {
      await this.cacheManager.set(cacheKey, cachedData, ttl);
      this.logger.debug(
        `Cached test result for testId: ${testId} with TTL: ${ttl}ms`,
      );
    } catch (error: any) {
      this.logger.error('Failed to cache test result:', error.message);
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Retrieve cached test result from Redis
   *
   * @param testId - Unique test identifier
   * @returns Cached test result or null if not found/expired
   */
  async getCachedTestResult(
    testId: string,
  ): Promise<CachedTestResult | null> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;

    try {
      const cachedData =
        await this.cacheManager.get<CachedTestResult>(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for testId: ${testId}`);
      }
      return cachedData || null;
    } catch (error: any) {
      this.logger.error('Failed to retrieve cached result:', error.message);
      return null;
    }
  }

  /**
   * Check if a test result exists in cache
   *
   * @param testId - Unique test identifier
   * @returns True if result exists in cache
   */
  async hasCachedResult(testId: string): Promise<boolean> {
    const result = await this.getCachedTestResult(testId);
    return result !== null;
  }

  /**
   * Delete cached test result
   *
   * @param testId - Unique test identifier
   */
  async deleteCachedResult(testId: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${testId}`;
    try {
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Deleted cached result for testId: ${testId}`);
    } catch (error: any) {
      this.logger.error('Failed to delete cached result:', error.message);
    }
  }

  /**
   * Generate cache key for a specific test configuration
   * Useful for checking if identical test already exists in cache
   *
   * @param url - URL being tested
   * @param deviceType - Device type (desktop/mobile/tablet)
   * @param testType - Test type (performance/accessibility)
   * @returns Cache key string
   */
  generateCacheKey(
    url: string,
    deviceType: string,
    testType: string,
  ): string {
    // Create a deterministic key based on test parameters
    const normalizedUrl = url.toLowerCase().trim();
    return `${this.CACHE_KEY_PREFIX}${normalizedUrl}:${deviceType}:${testType}`;
  }

  /**
   * Find existing test result by URL and configuration
   * Checks cache first, then database
   *
   * @param url - URL to search for
   * @param deviceType - Device type
   * @param testType - Test type
   * @param maxAgeMs - Maximum age of result to consider (optional)
   * @returns Test result if found and not expired
   */
  async findExistingResult(
    url: string,
    deviceType: string,
    testType: string,
    maxAgeMs?: number,
  ): Promise<TestResultDocument | null> {
    try {
      const query: any = {
        url,
        'testConfig.deviceType': deviceType,
        'testConfig.testType': testType,
        status: 'completed',
      };

      // Add age filter if specified
      if (maxAgeMs) {
        const cutoffDate = new Date(Date.now() - maxAgeMs);
        query.timestamp = { $gte: cutoffDate };
      }

      const result = await this.testResultModel
        .findOne(query)
        .sort({ timestamp: -1 }) // Get most recent
        .exec();

      if (result) {
        this.logger.debug(`Found existing result for URL: ${url}`);
      }

      return result;
    } catch (error: any) {
      this.logger.error('Failed to find existing result:', error.message);
      return null;
    }
  }
}

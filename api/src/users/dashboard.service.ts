import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';

import { AppError } from '~/common/app-error.common';
import { User } from './schema/user.schema';
import { TestResult } from '~/capture-metrics/schemas/test-result.schema';
import { TestSchedule } from '~/capture-metrics/schemas/test-schedule.schema';
import {
  GetTestsQueryDto,
  DashboardStatsResponseDto,
  PaginatedTestsResponseDto,
  PerformanceAnalyticsQueryDto,
} from '~/dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TestResult.name)
    private readonly testResultModel: Model<TestResult>,
    @InjectModel(TestSchedule.name)
    private readonly testScheduleModel: Model<TestSchedule>,
  ) {}

  /**
   * Get comprehensive dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      // Get total tests count
      const totalTests = await this.testResultModel.countDocuments({
        userId: userObjectId,
        isArchived: { $ne: true },
      });

      // Get tests this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const testsThisMonth = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfMonth },
        isArchived: { $ne: true },
      });

      // Calculate average performance score from completed tests
      const completedTests = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          'results.webMetrics.metrics': { $exists: true },
          isArchived: { $ne: true },
        })
        .select('results.webMetrics.metrics performanceScore')
        .lean()
        .exec();

      let averageScore = 0;
      if (completedTests.length > 0) {
        const scores = completedTests
          .map((test) => {
            // Use stored performance score if available
            if (test.performanceScore !== undefined) {
              return test.performanceScore;
            }

            // Otherwise calculate from metrics
            const fcp =
              test.results?.webMetrics?.metrics?.firstContentfulPaint || 0;
            const lcp =
              test.results?.webMetrics?.metrics?.largestContentfulPaint || 0;
            const tbt = test.results?.webMetrics?.metrics?.totalBlockingTime || 0;
            const cls =
              test.results?.webMetrics?.metrics?.cumulativeLayoutShift || 0;

            let score = 100;
            if (fcp > 3000) score -= 15;
            else if (fcp > 1800) score -= 7;
            if (lcp > 4000) score -= 20;
            else if (lcp > 2500) score -= 10;
            if (tbt > 600) score -= 20;
            else if (tbt > 200) score -= 10;
            if (cls > 0.25) score -= 15;
            else if (cls > 0.1) score -= 8;

            return Math.max(0, Math.min(100, score));
          })
          .filter((score) => score > 0);

        if (scores.length > 0) {
          averageScore = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length,
          );
        }
      }

      // Count critical issues (console errors)
      const testsWithErrors = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          'results.errors': { $exists: true, $ne: [] },
          isArchived: { $ne: true },
        })
        .select('results.errors')
        .lean()
        .exec();

      const criticalIssues = testsWithErrors.reduce((count, test) => {
        return count + (test.results?.errors?.length || 0);
      }, 0);

      // Get performance trends
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [weekTests, monthTests, threeMonthTests] = await Promise.all([
        this.testResultModel.countDocuments({
          userId: userObjectId,
          createdAt: { $gte: oneWeekAgo },
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          createdAt: { $gte: oneMonthAgo },
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          createdAt: { $gte: threeMonthsAgo },
          isArchived: { $ne: true },
        }),
      ]);

      // Get tests by status
      const [completedCount, failedCount, runningCount] = await Promise.all([
        this.testResultModel.countDocuments({
          userId: userObjectId,
          status: 'completed',
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          status: 'failed',
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          status: 'running',
          isArchived: { $ne: true },
        }),
      ]);

      // Get tests by type
      const [performanceCount, screenshotCount, cookieCount] = await Promise.all([
        this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'performance',
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'screenshot',
          isArchived: { $ne: true },
        }),
        this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'cookie',
          isArchived: { $ne: true },
        }),
      ]);

      // Calculate changes for stats
      // For Total Tests: Compare this week vs previous week
      const twoWeeksAgo = new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previousWeekTests = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
        isArchived: { $ne: true },
      });

      // For Tests This Month: Compare with last month
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      const endOfLastMonth = new Date(startOfMonth);
      endOfLastMonth.setDate(0);
      endOfLastMonth.setHours(23, 59, 59, 999);

      const testsLastMonth = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        isArchived: { $ne: true },
      });

      // For Average Score: Compare this month vs last month
      const lastMonthCompletedTests = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          'results.webMetrics.metrics': { $exists: true },
          isArchived: { $ne: true },
        })
        .select('results.webMetrics.metrics performanceScore')
        .lean()
        .exec();

      let lastMonthAverageScore = 0;
      if (lastMonthCompletedTests.length > 0) {
        const scores = lastMonthCompletedTests
          .map((test) => {
            if (test.performanceScore !== undefined) {
              return test.performanceScore;
            }
            const fcp = test.results?.webMetrics?.metrics?.firstContentfulPaint || 0;
            const lcp = test.results?.webMetrics?.metrics?.largestContentfulPaint || 0;
            const tbt = test.results?.webMetrics?.metrics?.totalBlockingTime || 0;
            const cls = test.results?.webMetrics?.metrics?.cumulativeLayoutShift || 0;
            let score = 100;
            if (fcp > 3000) score -= 15;
            else if (fcp > 1800) score -= 7;
            if (lcp > 4000) score -= 20;
            else if (lcp > 2500) score -= 10;
            if (tbt > 600) score -= 20;
            else if (tbt > 200) score -= 10;
            if (cls > 0.25) score -= 15;
            else if (cls > 0.1) score -= 8;
            return Math.max(0, Math.min(100, score));
          })
          .filter((score) => score > 0);

        if (scores.length > 0) {
          lastMonthAverageScore = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length,
          );
        }
      }

      // For Critical Issues: Compare this month vs last month
      const lastMonthTestsWithErrors = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          'results.errors': { $exists: true, $ne: [] },
          isArchived: { $ne: true },
        })
        .select('results.errors')
        .lean()
        .exec();

      const lastMonthCriticalIssues = lastMonthTestsWithErrors.reduce((count, test) => {
        return count + (test.results?.errors?.length || 0);
      }, 0);

      // Helper function to calculate percentage change and trend
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) {
          return {
            value: current,
            percentage: current > 0 ? 100 : 0,
            trend: current > 0 ? ('up' as const) : ('neutral' as const),
          };
        }
        const change = current - previous;
        const percentage = Math.round((change / previous) * 100);
        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        if (change > 0) trend = 'up';
        else if (change < 0) trend = 'down';
        return { value: change, percentage: Math.abs(percentage), trend };
      };

      return {
        totalTests,
        testsThisMonth,
        averageScore,
        criticalIssues,
        changes: {
          totalTests: calculateChange(weekTests, previousWeekTests),
          testsThisMonth: calculateChange(testsThisMonth, testsLastMonth),
          averageScore: calculateChange(averageScore, lastMonthAverageScore),
          criticalIssues: calculateChange(criticalIssues, lastMonthCriticalIssues),
        },
        performanceTrend: {
          thisWeek: weekTests,
          thisMonth: monthTests,
          lastThreeMonths: threeMonthTests,
        },
        testsByStatus: {
          completed: completedCount,
          failed: failedCount,
          running: runningCount,
        },
        testsByType: {
          performance: performanceCount,
          screenshot: screenshotCount,
          cookie: cookieCount,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve dashboard stats: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve dashboard stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get paginated and filtered tests for a user
   */
  async getUserTestsPaginated(
    userId: string,
    query: GetTestsQueryDto,
  ): Promise<PaginatedTestsResponseDto> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      // Build filter query
      const filter: FilterQuery<TestResult> = {
        userId: userObjectId,
        isArchived: { $ne: true },
      };

      // Apply status filter
      if (query.status && query.status !== 'all') {
        filter.status = query.status;
      }

      // Apply test type filter
      if (query.testType && query.testType !== 'all') {
        filter['testConfig.testType'] = query.testType;
      }

      // Apply device type filter
      if (query.deviceType && query.deviceType !== 'all') {
        filter['testConfig.deviceType'] = query.deviceType;
      }

      // Apply date range filter
      if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate) {
          filter.createdAt.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          filter.createdAt.$lte = new Date(query.endDate);
        }
      }

      // Apply search filter
      if (query.search) {
        filter.url = { $regex: query.search, $options: 'i' };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      // Execute query with pagination
      const [tests, total] = await Promise.all([
        this.testResultModel
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .select('-__v')
          .lean()
          .exec(),
        this.testResultModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Helper function to map backend status to frontend status
      const mapStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
          completed: 'COMPLETE',
          failed: 'FAILED',
          running: 'RUNNING',
        };
        return statusMap[status] || 'PENDING';
      };

      // Transform the data to match frontend expectations
      const transformedTests = tests.map((test) => ({
        id: test._id.toString(),
        url: test.url,
        status: mapStatus(test.status),
        createdAt: test.createdAt,
        completedAt: test.completedAt || (test.status === 'completed' ? test.updatedAt : undefined),
        testType: test.testConfig?.testType || 'performance',
        deviceType: test.testConfig?.deviceType || 'desktop',
        testName: test.testName,
        tags: test.tags,
        performanceScore: test.performanceScore,
        results: test.results
          ? {
              webMetrics: test.results.webMetrics,
              consoleErrors: test.results.errors || [],
              // For paginated list: only include count, not full URLs to reduce payload size
              screenshotCount: test.results.screenshots?.frameCount || 0,
              hasScreenshots: !!(test.results.screenshots?.screenshots?.length),
              duration: test.results.duration,
              summary: test.results.summary,
            }
          : undefined,
      }));

      return {
        data: transformedTests,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve paginated tests: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve user tests',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single test result by ID
   */
  async getTestById(userId: string, testId: string) {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(testId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const testObjectId = new Types.ObjectId(testId);

      const test = await this.testResultModel
        .findOne({
          _id: testObjectId,
          userId: userObjectId,
        })
        .select('-__v')
        .lean()
        .exec();

      if (!test) {
        throw new AppError('Test not found', HttpStatus.NOT_FOUND);
      }

      // Helper function to map backend status to frontend status
      const mapStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
          completed: 'COMPLETE',
          failed: 'FAILED',
          running: 'RUNNING',
        };
        return statusMap[status] || 'PENDING';
      };

      // Transform the data
      return {
        id: test._id.toString(),
        url: test.url,
        status: mapStatus(test.status),
        createdAt: test.createdAt,
        completedAt: test.completedAt || (test.status === 'completed' ? test.updatedAt : undefined),
        testType: test.testConfig?.testType || 'performance',
        deviceType: test.testConfig?.deviceType || 'desktop',
        testName: test.testName,
        tags: test.tags,
        performanceScore: test.performanceScore,
        batchId: test.batchId,
        results: test.results
          ? {
              webMetrics: test.results.webMetrics,
              // Return full screenshot object with metadata and URLs array
              screenshots: test.results.screenshots
                ? {
                    frameCount: test.results.screenshots.frameCount || 0,
                    deviceType: test.results.screenshots.deviceType || 'desktop',
                    urls: test.results.screenshots.screenshots || [], // Array of S3 URLs
                    message: test.results.screenshots.message || '',
                  }
                : null,
              cookieHandling: test.results.cookieHandling,
              errors: test.results.errors || [],
              duration: test.results.duration,
              summary: test.results.summary,
            }
          : undefined,
        testConfig: test.testConfig,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve test: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve test',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a test result
   */
  async deleteTest(userId: string, testId: string): Promise<{ message: string }> {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(testId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const testObjectId = new Types.ObjectId(testId);

      const result = await this.testResultModel.deleteOne({
        _id: testObjectId,
        userId: userObjectId,
      });

      if (result.deletedCount === 0) {
        throw new AppError('Test not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Test deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(`Failed to delete test: ${error.message}`, error.stack);
      throw new AppError(
        'Failed to delete test',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Archive a test result
   */
  async archiveTest(userId: string, testId: string): Promise<{ message: string }> {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(testId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const testObjectId = new Types.ObjectId(testId);

      const result = await this.testResultModel.updateOne(
        {
          _id: testObjectId,
          userId: userObjectId,
        },
        { $set: { isArchived: true } },
      );

      if (result.matchedCount === 0) {
        throw new AppError('Test not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Test archived successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(`Failed to archive test: ${error.message}`, error.stack);
      throw new AppError(
        'Failed to archive test',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get performance analytics over time
   */
  async getPerformanceAnalytics(
    userId: string,
    query: PerformanceAnalyticsQueryDto,
  ) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const { period = '30d', testType = 'all', url } = query;

      // Calculate date range based on period
      const now = new Date();
      const periodMap = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
      };

      const startDate = new Date(now.getTime() - periodMap[period]);

      // Build filter
      const filter: FilterQuery<TestResult> = {
        userId: userObjectId,
        status: 'completed',
        createdAt: { $gte: startDate },
        isArchived: { $ne: true },
      };

      if (testType !== 'all') {
        filter['testConfig.testType'] = testType;
      }

      if (url) {
        filter.url = url;
      }

      // Get tests with performance metrics
      const tests = await this.testResultModel
        .find(filter)
        .select('createdAt performanceScore results.webMetrics.metrics')
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      // Group by date and calculate averages
      const dataPoints = tests.map((test) => ({
        date: test.createdAt,
        score: test.performanceScore || 0,
        metrics: test.results?.webMetrics?.metrics,
      }));

      return {
        period,
        startDate,
        endDate: now,
        dataPoints,
        summary: {
          totalTests: tests.length,
          averageScore:
            tests.length > 0
              ? Math.round(
                  tests.reduce((sum, t) => sum + (t.performanceScore || 0), 0) /
                    tests.length,
                )
              : 0,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve performance analytics: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve performance analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

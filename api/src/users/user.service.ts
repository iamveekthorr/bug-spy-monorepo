import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { TestResult } from '~/capture-metrics/schemas/test-result.schema';
import { Model, Types } from 'mongoose';
import { AppError } from '~/common/app-error.common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TestResult.name) private readonly testResultModel: Model<TestResult>,
  ) {}

  async getUserById(id: string) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userModel
        .findById(id)
        .select('-password -__v')
        .lean()
        .exec();

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Transform the user object to include 'id' field for controller compatibility
      const userWithId = {
        ...user,
        id: user._id.toString(),
      };

      return userWithId;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      this.logger.error(`getUserById failed for id="${id}": ${error?.message}`, error?.stack);
      throw new AppError('Failed to retrieve user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await this.userModel
        .findOne({ email })
        .select('-password -__v')
        .lean()
        .exec();

      if (!user) {
        return null;
      }

      // Transform the user object to include 'id' field for controller compatibility
      const userWithId = {
        ...user,
        id: user._id.toString(),
      };

      return userWithId;
    } catch (error) {
      throw new AppError('Failed to retrieve user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getDashboardStats(userId: string) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      // Get total tests count
      const totalTests = await this.testResultModel.countDocuments({ userId: userObjectId });

      // Get tests this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const testsThisMonth = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfMonth },
      });

      // Get tests this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);

      const testsThisWeek = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfWeek },
      });

      // Get tests last three months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      const testsLastThreeMonths = await this.testResultModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: threeMonthsAgo },
      });

      // Calculate average performance score from completed tests
      const completedTests = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          'results.webMetrics.metrics': { $exists: true },
        })
        .select('results.webMetrics.metrics')
        .lean()
        .exec();

      let averageScore = 0;
      if (completedTests.length > 0) {
        const scores = completedTests
          .map(test => {
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
          .filter(score => score > 0);

        if (scores.length > 0) {
          averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      }

      // Count critical issues (console errors)
      const testsWithErrors = await this.testResultModel
        .find({
          userId: userObjectId,
          status: 'completed',
          'results.errors': { $exists: true, $ne: [] },
        })
        .select('results.errors')
        .lean()
        .exec();

      const criticalIssues = testsWithErrors.reduce((count, test) => {
        return count + (test.results?.errors?.length || 0);
      }, 0);

      // Get tests by status
      const testsByStatus = {
        completed: await this.testResultModel.countDocuments({ userId: userObjectId, status: 'completed' }),
        failed: await this.testResultModel.countDocuments({ userId: userObjectId, status: 'failed' }),
        running: await this.testResultModel.countDocuments({ userId: userObjectId, status: 'running' }),
      };

      // Get tests by type
      const testsByType = {
        performance: await this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'performance'
        }),
        screenshot: await this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'screenshot'
        }),
        cookie: await this.testResultModel.countDocuments({
          userId: userObjectId,
          'testConfig.testType': 'cookie'
        }),
      };

      return {
        totalTests,
        testsThisMonth,
        averageScore,
        criticalIssues,
        performanceTrend: {
          thisWeek: testsThisWeek,
          thisMonth: testsThisMonth,
          lastThreeMonths: testsLastThreeMonths,
        },
        testsByStatus,
        testsByType,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve dashboard stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserTests(userId: string) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      const tests = await this.testResultModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 }) // Most recent first
        .select('-__v')
        .lean()
        .exec();

      // Transform the data to match frontend expectations
      return tests.map(test => ({
        id: test._id.toString(),
        url: test.url,
        status: test.status.toUpperCase(),
        createdAt: test.createdAt,
        completedAt: test.status === 'completed' ? test.updatedAt : undefined,
        testType: test.testConfig?.testType || 'performance',
        deviceType: test.testConfig?.deviceType || 'desktop',
        results: test.results ? {
          webMetrics: test.results.webMetrics,
          consoleErrors: test.results.errors || [],
          screenshots: test.results.screenshots || [],
        } : undefined,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve user tests', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async syncTestResults(userId: string, tests: Array<{
    url: string;
    testType?: string;
    deviceType?: string;
    results: Record<string, unknown>;
    timestamp: number;
  }>) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      let syncedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      // Process each test
      for (const test of tests) {
        try {
          const testTimestamp = new Date(test.timestamp);
          
          // Check if a test with the same URL and timestamp already exists for this user
          // Use a time window of 1 second to account for minor timestamp variations
          const existingTest = await this.testResultModel.findOne({
            userId: userObjectId,
            url: test.url,
            timestamp: {
              $gte: new Date(testTimestamp.getTime() - 1000),
              $lte: new Date(testTimestamp.getTime() + 1000),
            },
          }).lean().exec();

          if (existingTest) {
            // Test already exists, skip it
            skippedCount++;
            continue;
          }

          // Create test result document
          await this.testResultModel.create({
            userId: userObjectId,
            url: test.url,
            timestamp: testTimestamp,
            results: test.results,
            testConfig: {
              deviceType: test.deviceType || 'desktop',
              testType: test.testType || 'performance',
            },
            status: 'completed',
            completedAt: testTimestamp,
          });

          syncedCount++;
        } catch (error) {
          console.error('Failed to sync test:', error);
          failedCount++;
        }
      }

      return {
        message: `Synced ${syncedCount} test results, ${skippedCount} skipped (already exist), ${failedCount} failed`,
        syncedCount,
        skippedCount,
        failedCount,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to sync test results', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userModel
        .findById(userId)
        .select('notificationPreferences')
        .lean()
        .exec();

      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      // Return default preferences if not set
      return user.notificationPreferences || {
        scoreDropAlerts: true,
        scoreDropThreshold: 5,
        weeklyReports: false,
        testCompletionAlerts: false,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(`Failed to get notification preferences: ${error.message}`);
      throw new AppError('Failed to get notification preferences', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      scoreDropAlerts?: boolean;
      scoreDropThreshold?: number;
      weeklyReports?: boolean;
      testCompletionAlerts?: boolean;
    },
  ) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      // Build update object with only provided fields
      const updateObj: Record<string, any> = {};
      if (typeof preferences.scoreDropAlerts === 'boolean') {
        updateObj['notificationPreferences.scoreDropAlerts'] = preferences.scoreDropAlerts;
      }
      if (typeof preferences.scoreDropThreshold === 'number') {
        // Ensure threshold is between 1 and 50
        updateObj['notificationPreferences.scoreDropThreshold'] = Math.min(50, Math.max(1, preferences.scoreDropThreshold));
      }
      if (typeof preferences.weeklyReports === 'boolean') {
        updateObj['notificationPreferences.weeklyReports'] = preferences.weeklyReports;
      }
      if (typeof preferences.testCompletionAlerts === 'boolean') {
        updateObj['notificationPreferences.testCompletionAlerts'] = preferences.testCompletionAlerts;
      }

      const updated = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateObj },
          { new: true },
        )
        .select('notificationPreferences')
        .lean()
        .exec();

      if (!updated) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Notification preferences updated for user ${userId}`);

      return {
        message: 'Notification preferences updated successfully',
        preferences: updated.notificationPreferences,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(`Failed to update notification preferences: ${error.message}`);
      throw new AppError('Failed to update notification preferences', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

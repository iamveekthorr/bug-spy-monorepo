import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { EmailService } from '~/common/email/email.service';
import { TestResult } from '~/capture-metrics/schemas/test-result.schema';
import { User } from '~/users/schema/user.schema';

export interface ScoreDropCheckResult {
  hasScoreDrop: boolean;
  previousScore?: number;
  currentScore?: number;
  scoreDrop?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  
  // Minimum score drop threshold to trigger notification (default: 5 points)
  private readonly SCORE_DROP_THRESHOLD = 5;

  constructor(
    private readonly emailService: EmailService,
    @InjectModel(TestResult.name)
    private readonly testResultModel: Model<TestResult>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Check if there's a significant score drop compared to previous test
   */
  async checkForScoreDrop(
    userId: string,
    url: string,
    testType: string,
    currentScore: number,
  ): Promise<ScoreDropCheckResult> {
    try {
      // Find the previous test for the same URL and test type
      const previousTest = await this.testResultModel
        .findOne({
          userId: new Types.ObjectId(userId),
          url,
          'testConfig.testType': testType,
          status: 'completed',
        })
        .sort({ createdAt: -1 })
        .skip(1) // Skip the current test
        .select('results performanceScore')
        .lean()
        .exec();

      if (!previousTest) {
        this.logger.debug(`No previous test found for ${url} (${testType})`);
        return { hasScoreDrop: false };
      }

      // Get the previous score based on test type
      let previousScore: number;
      
      if (testType === 'performance') {
        previousScore = previousTest.performanceScore || 
          previousTest.results?.webMetrics?.performanceScore || 0;
      } else if (testType === 'seo') {
        previousScore = previousTest.results?.webMetrics?.seoScore || 
          previousTest.results?.seoAnalysis?.score || 0;
      } else {
        previousScore = previousTest.performanceScore || 0;
      }

      const scoreDrop = previousScore - currentScore;

      if (scoreDrop >= this.SCORE_DROP_THRESHOLD) {
        this.logger.log(
          `Score drop detected for ${url} (${testType}): ${previousScore} -> ${currentScore} (-${scoreDrop})`,
        );
        return {
          hasScoreDrop: true,
          previousScore,
          currentScore,
          scoreDrop,
        };
      }

      return { hasScoreDrop: false };
    } catch (error) {
      this.logger.error(`Error checking for score drop: ${error.message}`);
      return { hasScoreDrop: false };
    }
  }

  /**
   * Send score drop notification if user has notifications enabled
   */
  async notifyScoreDrop(
    userId: string,
    testId: string,
    url: string,
    testType: string,
    previousScore: number,
    currentScore: number,
    scheduleName?: string,
  ): Promise<void> {
    try {
      // Get user to check notification preferences
      const user = await this.userModel
        .findById(new Types.ObjectId(userId))
        .select('email notificationPreferences')
        .lean()
        .exec();

      if (!user) {
        this.logger.warn(`User ${userId} not found for notification`);
        return;
      }

      // Check if user has score drop notifications enabled
      const notificationsEnabled = 
        user.notificationPreferences?.scoreDropAlerts !== false;

      if (!notificationsEnabled) {
        this.logger.debug(
          `Score drop notifications disabled for user ${userId}`,
        );
        return;
      }

      const scoreDrop = previousScore - currentScore;

      await this.emailService.sendScoreDropNotification(user.email, {
        url,
        testType: testType === 'seo' ? 'SEO' : 'Performance',
        previousScore,
        currentScore,
        scoreDrop,
        testId,
        scheduleName,
      });

      this.logger.log(
        `Score drop notification sent to ${user.email} for ${url}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send score drop notification: ${error.message}`,
      );
    }
  }

  /**
   * Process a completed test and send notifications if needed
   */
  async processCompletedTest(
    userId: string,
    testId: string,
    url: string,
    testType: string,
    score: number,
    scheduleName?: string,
  ): Promise<void> {
    const dropCheck = await this.checkForScoreDrop(
      userId,
      url,
      testType,
      score,
    );

    if (dropCheck.hasScoreDrop) {
      await this.notifyScoreDrop(
        userId,
        testId,
        url,
        testType,
        dropCheck.previousScore!,
        dropCheck.currentScore!,
        scheduleName,
      );
    }
  }
}

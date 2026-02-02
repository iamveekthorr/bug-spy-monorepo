import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { AppError } from '~/common/app-error.common';
import { TestSchedule } from '~/capture-metrics/schemas/test-schedule.schema';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from '~/dto/dashboard.dto';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectModel(TestSchedule.name)
    private readonly testScheduleModel: Model<TestSchedule>,
  ) {}

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    const frequencyMap = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(now.getTime() + frequencyMap[frequency]);
  }

  /**
   * Create a new test schedule
   */
  async createSchedule(userId: string, dto: CreateScheduleDto) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      // Check if user has too many schedules (limit to 10 for free tier)
      const existingSchedules = await this.testScheduleModel.countDocuments({
        userId: userObjectId,
      });

      if (existingSchedules >= 10) {
        throw new AppError(
          'Schedule limit reached. Please upgrade your plan or delete existing schedules.',
          HttpStatus.FORBIDDEN,
        );
      }

      const nextRun = this.calculateNextRun(dto.frequency);

      const schedule = new this.testScheduleModel({
        userId: userObjectId,
        name: dto.name,
        url: dto.url,
        frequency: dto.frequency,
        testType: dto.testType || 'performance',
        deviceType: dto.deviceType || 'desktop',
        includeScreenshots: dto.includeScreenshots !== false,
        description: dto.description,
        tags: dto.tags,
        nextRun,
        isActive: true,
      });

      const saved = await schedule.save();

      return {
        id: saved._id.toString(),
        name: saved.name,
        url: saved.url,
        frequency: saved.frequency,
        testType: saved.testType,
        deviceType: saved.deviceType,
        isActive: saved.isActive,
        includeScreenshots: saved.includeScreenshots,
        description: saved.description,
        tags: saved.tags,
        nextRun: saved.nextRun,
        lastRun: saved.lastRun,
        totalRuns: saved.totalRuns,
        successfulRuns: saved.successfulRuns,
        failedRuns: saved.failedRuns,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to create schedule: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to create schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all schedules for a user
   */
  async getUserSchedules(userId: string) {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);

      const schedules = await this.testScheduleModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .select('-__v')
        .lean()
        .exec();

      return schedules.map((schedule) => ({
        id: schedule._id.toString(),
        name: schedule.name,
        url: schedule.url,
        frequency: schedule.frequency,
        testType: schedule.testType,
        deviceType: schedule.deviceType,
        isActive: schedule.isActive,
        includeScreenshots: schedule.includeScreenshots,
        description: schedule.description,
        tags: schedule.tags,
        nextRun: schedule.nextRun,
        lastRun: schedule.lastRun,
        lastRunStatus: schedule.lastRunStatus,
        totalRuns: schedule.totalRuns,
        successfulRuns: schedule.successfulRuns,
        failedRuns: schedule.failedRuns,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve schedules: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve schedules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a single schedule by ID
   */
  async getScheduleById(userId: string, scheduleId: string) {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(scheduleId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const scheduleObjectId = new Types.ObjectId(scheduleId);

      const schedule = await this.testScheduleModel
        .findOne({
          _id: scheduleObjectId,
          userId: userObjectId,
        })
        .select('-__v')
        .lean()
        .exec();

      if (!schedule) {
        throw new AppError('Schedule not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: schedule._id.toString(),
        name: schedule.name,
        url: schedule.url,
        frequency: schedule.frequency,
        testType: schedule.testType,
        deviceType: schedule.deviceType,
        isActive: schedule.isActive,
        includeScreenshots: schedule.includeScreenshots,
        description: schedule.description,
        tags: schedule.tags,
        nextRun: schedule.nextRun,
        lastRun: schedule.lastRun,
        lastRunTestId: schedule.lastRunTestId,
        lastRunStatus: schedule.lastRunStatus,
        totalRuns: schedule.totalRuns,
        successfulRuns: schedule.successfulRuns,
        failedRuns: schedule.failedRuns,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve schedule: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to retrieve schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    userId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ) {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(scheduleId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const scheduleObjectId = new Types.ObjectId(scheduleId);

      // Build update object
      const updateData: any = { ...dto };

      // Recalculate next run if frequency changed
      if (dto.frequency) {
        updateData.nextRun = this.calculateNextRun(dto.frequency);
      }

      const updated = await this.testScheduleModel
        .findOneAndUpdate(
          {
            _id: scheduleObjectId,
            userId: userObjectId,
          },
          { $set: updateData },
          { new: true },
        )
        .select('-__v')
        .lean()
        .exec();

      if (!updated) {
        throw new AppError('Schedule not found', HttpStatus.NOT_FOUND);
      }

      return {
        id: updated._id.toString(),
        name: updated.name,
        url: updated.url,
        frequency: updated.frequency,
        testType: updated.testType,
        deviceType: updated.deviceType,
        isActive: updated.isActive,
        includeScreenshots: updated.includeScreenshots,
        description: updated.description,
        tags: updated.tags,
        nextRun: updated.nextRun,
        lastRun: updated.lastRun,
        lastRunStatus: updated.lastRunStatus,
        totalRuns: updated.totalRuns,
        successfulRuns: updated.successfulRuns,
        failedRuns: updated.failedRuns,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to update schedule: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to update schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(
    userId: string,
    scheduleId: string,
  ): Promise<{ message: string }> {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(scheduleId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const scheduleObjectId = new Types.ObjectId(scheduleId);

      const result = await this.testScheduleModel.deleteOne({
        _id: scheduleObjectId,
        userId: userObjectId,
      });

      if (result.deletedCount === 0) {
        throw new AppError('Schedule not found', HttpStatus.NOT_FOUND);
      }

      return { message: 'Schedule deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to delete schedule: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to delete schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Toggle schedule active status
   */
  async toggleSchedule(
    userId: string,
    scheduleId: string,
  ): Promise<{ isActive: boolean; message: string }> {
    try {
      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(scheduleId)) {
        throw new AppError('Invalid ID format', HttpStatus.BAD_REQUEST);
      }

      const userObjectId = new Types.ObjectId(userId);
      const scheduleObjectId = new Types.ObjectId(scheduleId);

      const schedule = await this.testScheduleModel
        .findOne({
          _id: scheduleObjectId,
          userId: userObjectId,
        })
        .exec();

      if (!schedule) {
        throw new AppError('Schedule not found', HttpStatus.NOT_FOUND);
      }

      schedule.isActive = !schedule.isActive;

      // If reactivating, recalculate next run
      if (schedule.isActive) {
        schedule.nextRun = this.calculateNextRun(schedule.frequency);
      }

      await schedule.save();

      return {
        isActive: schedule.isActive,
        message: `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.logger.error(
        `Failed to toggle schedule: ${error.message}`,
        error.stack,
      );
      throw new AppError(
        'Failed to toggle schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model, Types } from 'mongoose';
import { AppError } from '~/common/app-error.common';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
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

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
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

      return user;
    } catch (error) {
      throw new AppError('Failed to retrieve user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getDashboardStats(userId: string) {
    try {
      // For now, return mock stats
      // TODO: Implement real stats aggregation from saved tests
      return {
        totalTests: 24,
        testsThisMonth: 12,
        averageScore: 85,
        criticalIssues: 3,
      };
    } catch (error) {
      throw new AppError('Failed to retrieve dashboard stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserTests(userId: string) {
    try {
      // For now, return empty array
      // TODO: Implement fetching user's saved tests from database
      return [];
    } catch (error) {
      throw new AppError('Failed to retrieve user tests', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

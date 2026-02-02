import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardService } from '../dashboard.service';
import { User } from '../schema/user.schema';
import { TestResult } from '~/capture-metrics/schemas/test-result.schema';
import { TestSchedule } from '~/capture-metrics/schemas/test-schedule.schema';
import { AppError } from '~/common/app-error.common';
import { HttpStatus } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;
  let userModel: Model<User>;
  let testResultModel: Model<TestResult>;
  let testScheduleModel: Model<TestSchedule>;

  const mockUserId = new Types.ObjectId().toString();
  const mockTestId = new Types.ObjectId().toString();

  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    subscription: 'free',
  };

  const mockTestResult = {
    _id: mockTestId,
    userId: new Types.ObjectId(mockUserId),
    url: 'https://example.com',
    status: 'completed',
    testConfig: {
      testType: 'performance',
      deviceType: 'desktop',
    },
    results: {
      webMetrics: {
        metrics: {
          firstContentfulPaint: 1200,
          largestContentfulPaint: 2100,
          cumulativeLayoutShift: 0.05,
          totalBlockingTime: 150,
        },
      },
      errors: [],
    },
    performanceScore: 87,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            findOne: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: getModelToken(TestResult.name),
          useValue: {
            countDocuments: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(TestSchedule.name),
          useValue: {
            countDocuments: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    testResultModel = module.get<Model<TestResult>>(
      getModelToken(TestResult.name),
    );
    testScheduleModel = module.get<Model<TestSchedule>>(
      getModelToken(TestSchedule.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      // Mock countDocuments for various queries
      jest
        .spyOn(testResultModel, 'countDocuments')
        .mockResolvedValueOnce(156) // totalTests
        .mockResolvedValueOnce(42) // testsThisMonth
        .mockResolvedValueOnce(15) // weekTests
        .mockResolvedValueOnce(42) // monthTests
        .mockResolvedValueOnce(124) // threeMonthTests
        .mockResolvedValueOnce(140) // completedCount
        .mockResolvedValueOnce(12) // failedCount
        .mockResolvedValueOnce(4) // runningCount
        .mockResolvedValueOnce(98) // performanceCount
        .mockResolvedValueOnce(45) // screenshotCount
        .mockResolvedValueOnce(13); // cookieCount

      // Mock find for completed tests with metrics
      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          {
            performanceScore: 85,
            results: {
              webMetrics: {
                metrics: {
                  firstContentfulPaint: 1200,
                  largestContentfulPaint: 2100,
                },
              },
            },
          },
          {
            performanceScore: 90,
            results: {
              webMetrics: {
                metrics: {
                  firstContentfulPaint: 1100,
                  largestContentfulPaint: 1900,
                },
              },
            },
          },
        ]),
      };

      jest
        .spyOn(testResultModel, 'find')
        .mockReturnValueOnce(mockFindChain as any)
        .mockReturnValueOnce({
          ...mockFindChain,
          exec: jest.fn().mockResolvedValue([
            { results: { errors: ['error1', 'error2'] } },
            { results: { errors: ['error3'] } },
          ]),
        } as any);

      const result = await service.getDashboardStats(mockUserId);

      expect(result).toEqual({
        totalTests: 156,
        testsThisMonth: 42,
        averageScore: 88, // (85 + 90) / 2 rounded
        criticalIssues: 3,
        performanceTrend: {
          thisWeek: 15,
          thisMonth: 42,
          lastThreeMonths: 124,
        },
        testsByStatus: {
          completed: 140,
          failed: 12,
          running: 4,
        },
        testsByType: {
          performance: 98,
          screenshot: 45,
          cookie: 13,
        },
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(service.getDashboardStats('invalid-id')).rejects.toThrow(
        AppError,
      );
      await expect(service.getDashboardStats('invalid-id')).rejects.toThrow(
        'Invalid user ID format',
      );
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(testResultModel, 'countDocuments')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        AppError,
      );
      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        'Failed to retrieve dashboard stats',
      );
    });
  });

  describe('getUserTestsPaginated', () => {
    it('should return paginated tests with filtering', async () => {
      const mockTests = [
        {
          ...mockTestResult,
          _id: new Types.ObjectId(),
        },
        {
          ...mockTestResult,
          _id: new Types.ObjectId(),
        },
      ];

      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTests),
      };

      jest.spyOn(testResultModel, 'find').mockReturnValue(mockFindChain as any);
      jest.spyOn(testResultModel, 'countDocuments').mockResolvedValue(156);

      const query = {
        page: 1,
        limit: 20,
        status: 'completed' as const,
        testType: 'performance' as const,
        deviceType: 'desktop' as const,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };

      const result = await service.getUserTestsPaginated(mockUserId, query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(156);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(8);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should handle search filter', async () => {
      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(testResultModel, 'find').mockReturnValue(mockFindChain as any);
      jest.spyOn(testResultModel, 'countDocuments').mockResolvedValue(0);

      const query = {
        search: 'example.com',
      };

      await service.getUserTestsPaginated(mockUserId, query);

      expect(testResultModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          url: { $regex: 'example.com', $options: 'i' },
        }),
      );
    });

    it('should handle date range filter', async () => {
      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(testResultModel, 'find').mockReturnValue(mockFindChain as any);
      jest.spyOn(testResultModel, 'countDocuments').mockResolvedValue(0);

      const query = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      await service.getUserTestsPaginated(mockUserId, query);

      expect(testResultModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date(query.startDate),
            $lte: new Date(query.endDate),
          },
        }),
      );
    });
  });

  describe('getTestById', () => {
    it('should return a single test by ID', async () => {
      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTestResult),
      };

      jest
        .spyOn(testResultModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      const result = await service.getTestById(mockUserId, mockTestId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTestId);
      expect(result.url).toBe('https://example.com');
    });

    it('should throw error if test not found', async () => {
      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(testResultModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      await expect(service.getTestById(mockUserId, mockTestId)).rejects.toThrow(
        AppError,
      );
      await expect(service.getTestById(mockUserId, mockTestId)).rejects.toThrow(
        'Test not found',
      );
    });

    it('should throw error for invalid ID format', async () => {
      await expect(
        service.getTestById('invalid-id', mockTestId),
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteTest', () => {
    it('should delete a test successfully', async () => {
      jest
        .spyOn(testResultModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 1 } as any);

      const result = await service.deleteTest(mockUserId, mockTestId);

      expect(result).toEqual({ message: 'Test deleted successfully' });
      expect(testResultModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockTestId),
        userId: new Types.ObjectId(mockUserId),
      });
    });

    it('should throw error if test not found', async () => {
      jest
        .spyOn(testResultModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 0 } as any);

      await expect(service.deleteTest(mockUserId, mockTestId)).rejects.toThrow(
        AppError,
      );
      await expect(service.deleteTest(mockUserId, mockTestId)).rejects.toThrow(
        'Test not found',
      );
    });
  });

  describe('archiveTest', () => {
    it('should archive a test successfully', async () => {
      jest
        .spyOn(testResultModel, 'updateOne')
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

      const result = await service.archiveTest(mockUserId, mockTestId);

      expect(result).toEqual({ message: 'Test archived successfully' });
      expect(testResultModel.updateOne).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(mockTestId),
          userId: new Types.ObjectId(mockUserId),
        },
        { $set: { isArchived: true } },
      );
    });

    it('should throw error if test not found', async () => {
      jest
        .spyOn(testResultModel, 'updateOne')
        .mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as any);

      await expect(
        service.archiveTest(mockUserId, mockTestId),
      ).rejects.toThrow(AppError);
      await expect(
        service.archiveTest(mockUserId, mockTestId),
      ).rejects.toThrow('Test not found');
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return performance analytics for 30 days', async () => {
      const mockTests = [
        {
          createdAt: new Date('2024-01-01'),
          performanceScore: 85,
          results: { webMetrics: { metrics: {} } },
        },
        {
          createdAt: new Date('2024-01-15'),
          performanceScore: 90,
          results: { webMetrics: { metrics: {} } },
        },
      ];

      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTests),
      };

      jest.spyOn(testResultModel, 'find').mockReturnValue(mockFindChain as any);

      const query = {
        period: '30d' as const,
        testType: 'performance' as const,
      };

      const result = await service.getPerformanceAnalytics(mockUserId, query);

      expect(result.period).toBe('30d');
      expect(result.dataPoints).toHaveLength(2);
      expect(result.summary.totalTests).toBe(2);
      expect(result.summary.averageScore).toBe(88); // (85 + 90) / 2 rounded
    });

    it('should filter by URL when provided', async () => {
      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(testResultModel, 'find').mockReturnValue(mockFindChain as any);

      const query = {
        period: '30d' as const,
        url: 'https://example.com',
      };

      await service.getPerformanceAnalytics(mockUserId, query);

      expect(testResultModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
        }),
      );
    });
  });
});

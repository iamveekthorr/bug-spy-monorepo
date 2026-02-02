import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScheduleService } from '../schedule.service';
import { TestSchedule } from '~/capture-metrics/schemas/test-schedule.schema';
import { AppError } from '~/common/app-error.common';
import { HttpStatus } from '@nestjs/common';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let testScheduleModel: Model<TestSchedule>;

  const mockUserId = new Types.ObjectId().toString();
  const mockScheduleId = new Types.ObjectId().toString();

  const mockSchedule = {
    _id: new Types.ObjectId(mockScheduleId),
    userId: new Types.ObjectId(mockUserId),
    name: 'Daily Homepage Check',
    url: 'https://example.com',
    frequency: 'daily',
    testType: 'performance',
    deviceType: 'desktop',
    isActive: true,
    includeScreenshots: true,
    description: 'Daily monitoring',
    tags: ['homepage'],
    nextRun: new Date(),
    lastRun: null,
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create a mock model constructor
    const MockModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() }),
    }));

    // Add static methods to the mock model
    Object.assign(MockModel, {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getModelToken(TestSchedule.name),
          useValue: MockModel,
        },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    testScheduleModel = module.get<Model<TestSchedule>>(
      getModelToken(TestSchedule.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    const createDto = {
      name: 'Daily Homepage Check',
      url: 'https://example.com',
      frequency: 'daily' as const,
      testType: 'performance' as const,
      deviceType: 'desktop' as const,
      includeScreenshots: true,
      description: 'Daily monitoring',
      tags: ['homepage'],
    };

    it('should create a new schedule successfully', async () => {
      (testScheduleModel.countDocuments as jest.Mock).mockResolvedValue(5);

      // Mock the constructor to return an instance with save method
      (testScheduleModel as any).mockImplementation((data) => ({
        ...data,
        _id: new Types.ObjectId(mockScheduleId),
        save: jest.fn().mockResolvedValue({
          ...data,
          _id: new Types.ObjectId(mockScheduleId),
        }),
      }));

      const result = await service.createSchedule(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.url).toBe(createDto.url);
      expect(result.frequency).toBe(createDto.frequency);
    });

    it('should throw error when schedule limit reached', async () => {
      jest.spyOn(testScheduleModel, 'countDocuments').mockResolvedValue(10);

      await expect(
        service.createSchedule(mockUserId, createDto),
      ).rejects.toThrow(AppError);
      await expect(
        service.createSchedule(mockUserId, createDto),
      ).rejects.toThrow('Schedule limit reached');
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        service.createSchedule('invalid-id', createDto),
      ).rejects.toThrow(AppError);
      await expect(
        service.createSchedule('invalid-id', createDto),
      ).rejects.toThrow('Invalid user ID format');
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(testScheduleModel, 'countDocuments')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createSchedule(mockUserId, createDto),
      ).rejects.toThrow(AppError);
      await expect(
        service.createSchedule(mockUserId, createDto),
      ).rejects.toThrow('Failed to create schedule');
    });
  });

  describe('getUserSchedules', () => {
    it('should return all schedules for a user', async () => {
      const mockSchedules = [mockSchedule, { ...mockSchedule, _id: new Types.ObjectId() }];

      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSchedules),
      };

      jest
        .spyOn(testScheduleModel, 'find')
        .mockReturnValue(mockFindChain as any);

      const result = await service.getUserSchedules(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe(mockSchedule.name);
      expect(mockFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return empty array when no schedules exist', async () => {
      const mockFindChain = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(testScheduleModel, 'find')
        .mockReturnValue(mockFindChain as any);

      const result = await service.getUserSchedules(mockUserId);

      expect(result).toEqual([]);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(service.getUserSchedules('invalid-id')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('getScheduleById', () => {
    it('should return a single schedule by ID', async () => {
      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSchedule),
      };

      jest
        .spyOn(testScheduleModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      const result = await service.getScheduleById(mockUserId, mockScheduleId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScheduleId);
      expect(result.name).toBe(mockSchedule.name);
    });

    it('should throw error if schedule not found', async () => {
      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(testScheduleModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      await expect(
        service.getScheduleById(mockUserId, mockScheduleId),
      ).rejects.toThrow(AppError);
      await expect(
        service.getScheduleById(mockUserId, mockScheduleId),
      ).rejects.toThrow('Schedule not found');
    });

    it('should throw error for invalid ID format', async () => {
      await expect(
        service.getScheduleById('invalid-id', mockScheduleId),
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateSchedule', () => {
    const updateDto = {
      name: 'Updated Schedule',
      frequency: 'weekly' as const,
    };

    it('should update a schedule successfully', async () => {
      const updatedSchedule = { ...mockSchedule, ...updateDto };

      const mockFindChain = {
        findOneAndUpdate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSchedule),
      };

      jest
        .spyOn(testScheduleModel, 'findOneAndUpdate')
        .mockReturnValue(mockFindChain as any);

      const result = await service.updateSchedule(
        mockUserId,
        mockScheduleId,
        updateDto,
      );

      expect(result.name).toBe(updateDto.name);
      expect(result.frequency).toBe(updateDto.frequency);
    });

    it('should recalculate next run when frequency changes', async () => {
      const updatedSchedule = { ...mockSchedule, frequency: 'weekly' };

      const mockFindChain = {
        findOneAndUpdate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedSchedule),
      };

      jest
        .spyOn(testScheduleModel, 'findOneAndUpdate')
        .mockReturnValue(mockFindChain as any);

      await service.updateSchedule(mockUserId, mockScheduleId, {
        frequency: 'weekly',
      });

      expect(testScheduleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            frequency: 'weekly',
            nextRun: expect.any(Date),
          }),
        }),
        expect.any(Object),
      );
    });

    it('should throw error if schedule not found', async () => {
      const mockFindChain = {
        findOneAndUpdate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(testScheduleModel, 'findOneAndUpdate')
        .mockReturnValue(mockFindChain as any);

      await expect(
        service.updateSchedule(mockUserId, mockScheduleId, updateDto),
      ).rejects.toThrow(AppError);
      await expect(
        service.updateSchedule(mockUserId, mockScheduleId, updateDto),
      ).rejects.toThrow('Schedule not found');
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule successfully', async () => {
      jest
        .spyOn(testScheduleModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 1 } as any);

      const result = await service.deleteSchedule(mockUserId, mockScheduleId);

      expect(result).toEqual({ message: 'Schedule deleted successfully' });
      expect(testScheduleModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockScheduleId),
        userId: new Types.ObjectId(mockUserId),
      });
    });

    it('should throw error if schedule not found', async () => {
      jest
        .spyOn(testScheduleModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 0 } as any);

      await expect(
        service.deleteSchedule(mockUserId, mockScheduleId),
      ).rejects.toThrow(AppError);
      await expect(
        service.deleteSchedule(mockUserId, mockScheduleId),
      ).rejects.toThrow('Schedule not found');
    });
  });

  describe('toggleSchedule', () => {
    it('should toggle schedule from active to inactive', async () => {
      const activeSchedule = { ...mockSchedule, isActive: true, save: jest.fn() };

      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(activeSchedule),
      };

      jest
        .spyOn(testScheduleModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      activeSchedule.save.mockResolvedValue({ ...activeSchedule, isActive: false });

      const result = await service.toggleSchedule(mockUserId, mockScheduleId);

      expect(result.isActive).toBe(false);
      expect(result.message).toBe('Schedule deactivated successfully');
      expect(activeSchedule.save).toHaveBeenCalled();
    });

    it('should toggle schedule from inactive to active and recalculate next run', async () => {
      const inactiveSchedule = {
        ...mockSchedule,
        isActive: false,
        frequency: 'daily',
        save: jest.fn(),
      };

      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(inactiveSchedule),
      };

      jest
        .spyOn(testScheduleModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      inactiveSchedule.save.mockResolvedValue({ ...inactiveSchedule, isActive: true });

      const result = await service.toggleSchedule(mockUserId, mockScheduleId);

      expect(result.isActive).toBe(true);
      expect(result.message).toBe('Schedule activated successfully');
      expect(inactiveSchedule.nextRun).toBeInstanceOf(Date);
      expect(inactiveSchedule.save).toHaveBeenCalled();
    });

    it('should throw error if schedule not found', async () => {
      const mockFindChain = {
        findOne: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(testScheduleModel, 'findOne')
        .mockReturnValue(mockFindChain as any);

      await expect(
        service.toggleSchedule(mockUserId, mockScheduleId),
      ).rejects.toThrow(AppError);
      await expect(
        service.toggleSchedule(mockUserId, mockScheduleId),
      ).rejects.toThrow('Schedule not found');
    });
  });
});

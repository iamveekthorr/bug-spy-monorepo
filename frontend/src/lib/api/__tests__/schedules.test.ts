import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schedulesAPI, type Schedule, type CreateScheduleRequest, type UpdateScheduleRequest } from '../schedules';
import { api } from '../../api-client';

vi.mock('../../api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('schedulesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSchedule: Schedule = {
    _id: '123',
    userId: 'user123',
    name: 'Test Schedule',
    url: 'https://example.com',
    frequency: 'daily',
    testType: 'performance',
    deviceType: 'desktop',
    isActive: true,
    nextRun: '2024-01-01T00:00:00Z',
    lastRun: '2023-12-31T00:00:00Z',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2023-12-31T00:00:00Z',
  };

  describe('getSchedules', () => {
    it('should fetch all schedules', async () => {
      const mockResponse = {
        data: {
          schedules: [mockSchedule],
          total: 1,
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.getSchedules();

      expect(api.get).toHaveBeenCalledWith('/user/schedules');
      expect(result).toEqual(mockResponse.data);
      expect(result.schedules).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(schedulesAPI.getSchedules()).rejects.toThrow('Network error');
      expect(api.get).toHaveBeenCalledWith('/user/schedules');
    });
  });

  describe('getSchedule', () => {
    it('should fetch a specific schedule by ID', async () => {
      const mockResponse = { data: mockSchedule };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.getSchedule('123');

      expect(api.get).toHaveBeenCalledWith('/user/schedules/123');
      expect(result).toEqual(mockSchedule);
    });

    it('should handle 404 errors', async () => {
      const error = { response: { status: 404, data: { message: 'Schedule not found' } } };
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(schedulesAPI.getSchedule('invalid-id')).rejects.toEqual(error);
    });
  });

  describe('createSchedule', () => {
    it('should create a new schedule', async () => {
      const createData: CreateScheduleRequest = {
        name: 'New Schedule',
        url: 'https://test.com',
        frequency: 'hourly',
        testType: 'accessibility',
        deviceType: 'mobile',
      };

      const mockResponse = {
        data: { ...mockSchedule, ...createData, _id: 'new-123' },
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.createSchedule(createData);

      expect(api.post).toHaveBeenCalledWith('/user/schedules', createData);
      expect(result.name).toBe(createData.name);
      expect(result.url).toBe(createData.url);
      expect(result.frequency).toBe(createData.frequency);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '',
        url: 'invalid-url',
      } as CreateScheduleRequest;

      const error = {
        response: {
          status: 400,
          data: { message: 'Validation failed', errors: ['Invalid URL'] },
        },
      };

      vi.mocked(api.post).mockRejectedValue(error);

      await expect(schedulesAPI.createSchedule(invalidData)).rejects.toEqual(error);
    });
  });

  describe('updateSchedule', () => {
    it('should update an existing schedule', async () => {
      const updateData: UpdateScheduleRequest = {
        name: 'Updated Name',
        frequency: 'weekly',
      };

      const updatedSchedule = { ...mockSchedule, ...updateData };
      const mockResponse = { data: updatedSchedule };

      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.updateSchedule('123', updateData);

      expect(api.patch).toHaveBeenCalledWith('/user/schedules/123', updateData);
      expect(result.name).toBe(updateData.name);
      expect(result.frequency).toBe(updateData.frequency);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdateScheduleRequest = {
        isActive: false,
      };

      const mockResponse = { data: { ...mockSchedule, isActive: false } };
      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.updateSchedule('123', partialUpdate);

      expect(api.patch).toHaveBeenCalledWith('/user/schedules/123', partialUpdate);
      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      const mockResponse = { data: { message: 'Schedule deleted successfully' } };
      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.deleteSchedule('123');

      expect(api.delete).toHaveBeenCalledWith('/user/schedules/123');
      expect(result.message).toBe('Schedule deleted successfully');
    });

    it('should handle delete errors', async () => {
      const error = {
        response: { status: 403, data: { message: 'Unauthorized' } },
      };
      vi.mocked(api.delete).mockRejectedValue(error);

      await expect(schedulesAPI.deleteSchedule('123')).rejects.toEqual(error);
    });
  });

  describe('toggleSchedule', () => {
    it('should toggle schedule active status', async () => {
      const toggledSchedule = { ...mockSchedule, isActive: false };
      const mockResponse = { data: toggledSchedule };

      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.toggleSchedule('123');

      expect(api.patch).toHaveBeenCalledWith('/user/schedules/123/toggle');
      expect(result.isActive).toBe(false);
    });

    it('should handle toggle from inactive to active', async () => {
      const activeSchedule = { ...mockSchedule, isActive: true };
      const mockResponse = { data: activeSchedule };

      vi.mocked(api.patch).mockResolvedValue(mockResponse);

      const result = await schedulesAPI.toggleSchedule('123');

      expect(result.isActive).toBe(true);
    });
  });
});

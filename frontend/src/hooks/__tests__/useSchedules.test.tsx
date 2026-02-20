import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSchedules,
  useSchedule,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from '../useSchedules';
import { schedulesAPI } from '@/lib/api/schedules';
import type { Schedule, CreateScheduleRequest } from '@/lib/api/schedules';

vi.mock('@/lib/api/schedules');
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSchedules', () => {
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
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2023-12-31T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchedules', () => {
    it('should fetch all schedules successfully', async () => {
      const mockResponse = {
        schedules: [mockSchedule],
        total: 1,
      };

      vi.mocked(schedulesAPI.getSchedules).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.schedules).toHaveLength(1);
      expect(schedulesAPI.getSchedules).toHaveBeenCalledTimes(1);
    });

    it('should handle loading state', () => {
      vi.mocked(schedulesAPI.getSchedules).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useSchedules(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error state', async () => {
      const error = new Error('Network error');
      vi.mocked(schedulesAPI.getSchedules).mockRejectedValue(error);

      const { result } = renderHook(() => useSchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useSchedule', () => {
    it('should fetch a specific schedule', async () => {
      vi.mocked(schedulesAPI.getSchedule).mockResolvedValue(mockSchedule);

      const { result } = renderHook(() => useSchedule('123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSchedule);
      expect(schedulesAPI.getSchedule).toHaveBeenCalledWith('123');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useSchedule(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(schedulesAPI.getSchedule).not.toHaveBeenCalled();
    });
  });

  describe('useCreateSchedule', () => {
    it('should create a schedule successfully', async () => {
      const newScheduleData: CreateScheduleRequest = {
        name: 'New Schedule',
        url: 'https://test.com',
        frequency: 'hourly',
        testType: 'accessibility',
        deviceType: 'mobile',
      };

      const createdSchedule = { ...mockSchedule, ...newScheduleData, _id: 'new123' };
      vi.mocked(schedulesAPI.createSchedule).mockResolvedValue(createdSchedule);

      const { result } = renderHook(() => useCreateSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newScheduleData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(createdSchedule);
      expect(schedulesAPI.createSchedule).toHaveBeenCalledWith(newScheduleData);
    });

    it('should handle creation errors', async () => {
      const error = {
        response: { data: { message: 'Validation failed' } },
      };
      vi.mocked(schedulesAPI.createSchedule).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({} as CreateScheduleRequest);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateSchedule', () => {
    it('should update a schedule successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedSchedule = { ...mockSchedule, ...updateData };

      vi.mocked(schedulesAPI.updateSchedule).mockResolvedValue(updatedSchedule);

      const { result } = renderHook(() => useUpdateSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: '123', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(updatedSchedule);
      expect(schedulesAPI.updateSchedule).toHaveBeenCalledWith('123', updateData);
    });

    it('should handle update errors', async () => {
      const error = {
        response: { data: { message: 'Schedule not found' } },
      };
      vi.mocked(schedulesAPI.updateSchedule).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'invalid', data: {} });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDeleteSchedule', () => {
    it('should delete a schedule successfully', async () => {
      vi.mocked(schedulesAPI.deleteSchedule).mockResolvedValue({
        message: 'Deleted successfully',
      });

      const { result } = renderHook(() => useDeleteSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(schedulesAPI.deleteSchedule).toHaveBeenCalledWith('123');
    });

    it('should handle delete errors', async () => {
      const error = {
        response: { data: { message: 'Unauthorized' } },
      };
      vi.mocked(schedulesAPI.deleteSchedule).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useToggleSchedule', () => {
    it('should toggle schedule from active to inactive', async () => {
      const toggledSchedule = { ...mockSchedule, isActive: false };
      vi.mocked(schedulesAPI.toggleSchedule).mockResolvedValue(toggledSchedule);

      const { result } = renderHook(() => useToggleSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.isActive).toBe(false);
      expect(schedulesAPI.toggleSchedule).toHaveBeenCalledWith('123');
    });

    it('should toggle schedule from inactive to active', async () => {
      const toggledSchedule = { ...mockSchedule, isActive: true };
      vi.mocked(schedulesAPI.toggleSchedule).mockResolvedValue(toggledSchedule);

      const { result } = renderHook(() => useToggleSchedule(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.isActive).toBe(true);
    });
  });
});

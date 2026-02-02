import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBatchTests,
  useBatchTest,
  useDeleteBatchTest,
  useRetryBatchTest,
} from '../useBatchTests';
import { batchAPI } from '@/lib/api/batch';
import type { BatchTest, BatchTestsResponse } from '@/lib/api/batch';

vi.mock('@/lib/api/batch');
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

describe('useBatchTests hooks', () => {
  const mockBatchTest: BatchTest = {
    _id: 'batch123',
    userId: 'user123',
    batchId: 'batch-abc',
    batchName: 'Test Batch',
    urls: ['https://example1.com', 'https://example2.com'],
    labels: ['Site 1', 'Site 2'],
    testType: 'performance',
    deviceType: 'desktop',
    status: 'COMPLETE',
    results: [
      { url: 'https://example1.com', label: 'Site 1', status: 'COMPLETE', testId: 'test1' },
      { url: 'https://example2.com', label: 'Site 2', status: 'COMPLETE', testId: 'test2' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:05:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useBatchTests', () => {
    it('should fetch batch tests with default pagination', async () => {
      const mockResponse: BatchTestsResponse = {
        batches: [mockBatchTest],
        total: 1,
        page: 1,
        limit: 10,
      };

      vi.mocked(batchAPI.getBatchTests).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBatchTests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(batchAPI.getBatchTests).toHaveBeenCalledWith(1, 10);
    });

    it('should fetch batch tests with custom pagination', async () => {
      const mockResponse: BatchTestsResponse = {
        batches: [],
        total: 0,
        page: 2,
        limit: 20,
      };

      vi.mocked(batchAPI.getBatchTests).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBatchTests(2, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(batchAPI.getBatchTests).toHaveBeenCalledWith(2, 20);
      expect(result.current.data?.page).toBe(2);
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch batch tests');
      vi.mocked(batchAPI.getBatchTests).mockRejectedValue(error);

      const { result } = renderHook(() => useBatchTests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useBatchTest', () => {
    it('should fetch a specific batch test', async () => {
      vi.mocked(batchAPI.getBatchTest).mockResolvedValue(mockBatchTest);

      const { result } = renderHook(() => useBatchTest('batch123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBatchTest);
      expect(batchAPI.getBatchTest).toHaveBeenCalledWith('batch123');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useBatchTest(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(batchAPI.getBatchTest).not.toHaveBeenCalled();
    });

    it('should auto-refetch when status is RUNNING', async () => {
      const runningBatch: BatchTest = {
        ...mockBatchTest,
        status: 'RUNNING',
      };

      vi.mocked(batchAPI.getBatchTest).mockResolvedValue(runningBatch);

      const { result } = renderHook(() => useBatchTest('batch123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('RUNNING');
    });

    it('should auto-refetch when status is PENDING', async () => {
      const pendingBatch: BatchTest = {
        ...mockBatchTest,
        status: 'PENDING',
      };

      vi.mocked(batchAPI.getBatchTest).mockResolvedValue(pendingBatch);

      const { result } = renderHook(() => useBatchTest('batch123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('PENDING');
    });

    it('should not auto-refetch when status is COMPLETE', async () => {
      vi.mocked(batchAPI.getBatchTest).mockResolvedValue(mockBatchTest);

      const { result } = renderHook(() => useBatchTest('batch123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('COMPLETE');
    });
  });

  describe('useDeleteBatchTest', () => {
    it('should delete a batch test successfully', async () => {
      vi.mocked(batchAPI.deleteBatchTest).mockResolvedValue({
        message: 'Deleted successfully',
      });

      const { result } = renderHook(() => useDeleteBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(batchAPI.deleteBatchTest).toHaveBeenCalledWith('batch123');
    });

    it('should handle delete errors', async () => {
      const error = {
        response: { data: { message: 'Unauthorized' } },
      };
      vi.mocked(batchAPI.deleteBatchTest).mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });

    it('should show loading state during deletion', async () => {
      vi.mocked(batchAPI.deleteBatchTest).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useDeleteBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      expect(result.current.isPending).toBe(true);

      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

  describe('useRetryBatchTest', () => {
    it('should retry a failed batch test', async () => {
      const retriedBatch: BatchTest = {
        ...mockBatchTest,
        status: 'RUNNING',
        results: mockBatchTest.results.map((r) => ({ ...r, status: 'PENDING' as const })),
      };

      vi.mocked(batchAPI.retryBatchTest).mockResolvedValue(retriedBatch);

      const { result } = renderHook(() => useRetryBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.status).toBe('RUNNING');
      expect(batchAPI.retryBatchTest).toHaveBeenCalledWith('batch123');
    });

    it('should handle retry errors', async () => {
      const error = {
        response: {
          data: { message: 'Cannot retry completed batch' },
        },
      };
      vi.mocked(batchAPI.retryBatchTest).mockRejectedValue(error);

      const { result } = renderHook(() => useRetryBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should show loading state during retry', async () => {
      vi.mocked(batchAPI.retryBatchTest).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useRetryBatchTest(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('batch123');

      expect(result.current.isPending).toBe(true);

      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it('should invalidate queries after successful retry', async () => {
      vi.mocked(batchAPI.retryBatchTest).mockResolvedValue(mockBatchTest);

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useRetryBatchTest(), { wrapper });

      result.current.mutate('batch123');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});

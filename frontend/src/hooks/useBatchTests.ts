import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchAPI } from '@/lib/api/batch';
import { useToast } from '@/hooks/useToast';

export const useBatchTests = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['batch-tests', page, limit],
    queryFn: () => batchAPI.getBatchTests(page, limit),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useBatchTest = (id: string) => {
  return useQuery({
    queryKey: ['batch-tests', id],
    queryFn: () => batchAPI.getBatchTest(id),
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds for active batch tests
    refetchInterval: (data) => {
      // Auto-refetch every 5 seconds if batch is still running
      if (data?.status === 'RUNNING' || data?.status === 'PENDING') {
        return 5000;
      }
      return false;
    },
  });
};

export const useDeleteBatchTest = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => batchAPI.deleteBatchTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-tests'] });
      toast.success('Batch test deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete batch test');
    },
  });
};

export const useRetryBatchTest = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => batchAPI.retryBatchTest(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batch-tests'] });
      queryClient.invalidateQueries({ queryKey: ['batch-tests', data._id] });
      toast.success('Batch test retried successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to retry batch test');
    },
  });
};

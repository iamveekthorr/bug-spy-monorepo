import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, type TimeRangeParams } from '@/lib/api/analytics';
import { useAuthStore } from '@/store';

export const useAnalyticsOverview = (params?: TimeRangeParams) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () => analyticsAPI.getAnalyticsOverview(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!accessToken,
    retry: false, // endpoint not yet implemented — don't retry on 404
  });
};

export const usePerformanceTrends = (params?: TimeRangeParams) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['analytics', 'performance-trends', params],
    queryFn: () => analyticsAPI.getPerformanceTrends(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!accessToken,
    retry: false,
  });
};

export const useErrorDistribution = (params?: TimeRangeParams) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['analytics', 'error-distribution', params],
    queryFn: () => analyticsAPI.getErrorDistribution(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!accessToken,
    retry: false,
  });
};

export const useTestTypeBreakdown = (params?: TimeRangeParams) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['analytics', 'test-types', params],
    queryFn: () => analyticsAPI.getTestTypeBreakdown(params),
    staleTime: 5 * 60 * 1000,
    enabled: !!accessToken,
    retry: false,
  });
};

export const useExportReport = () => {
  const exportReport = async (
    format: 'csv' | 'pdf',
    params?: TimeRangeParams
  ) => {
    try {
      const blob = await analyticsAPI.exportReport(format, params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      throw error;
    }
  };

  return { exportReport };
};

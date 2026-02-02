import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, type TimeRangeParams } from '@/lib/api/analytics';

export const useAnalyticsOverview = (params?: TimeRangeParams) => {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () => analyticsAPI.getAnalyticsOverview(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePerformanceTrends = (params?: TimeRangeParams) => {
  return useQuery({
    queryKey: ['analytics', 'performance-trends', params],
    queryFn: () => analyticsAPI.getPerformanceTrends(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useErrorDistribution = (params?: TimeRangeParams) => {
  return useQuery({
    queryKey: ['analytics', 'error-distribution', params],
    queryFn: () => analyticsAPI.getErrorDistribution(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTestTypeBreakdown = (params?: TimeRangeParams) => {
  return useQuery({
    queryKey: ['analytics', 'test-types', params],
    queryFn: () => analyticsAPI.getTestTypeBreakdown(params),
    staleTime: 5 * 60 * 1000,
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

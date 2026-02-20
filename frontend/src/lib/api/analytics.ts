import { api } from '../api-client';

export interface PerformanceTrend {
  date: string;
  averageScore: number;
  testCount: number;
}

export interface ErrorDistribution {
  type: 'console' | 'network' | 'javascript' | 'ui';
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TestTypeBreakdown {
  testType: 'performance' | 'accessibility' | 'seo' | 'best-practices' | 'full';
  count: number;
  averageScore: number;
}

export interface DeviceBreakdown {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  count: number;
  averageScore: number;
}

export interface AnalyticsOverview {
  performanceTrends: PerformanceTrend[];
  errorDistribution: ErrorDistribution[];
  testTypeBreakdown: TestTypeBreakdown[];
  deviceBreakdown: DeviceBreakdown[];
  totalTests: number;
  totalIssues: number;
  averagePerformanceScore: number;
  improvementRate: number; // percentage
}

export interface TimeRangeParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export const analyticsAPI = {
  /**
   * Get analytics overview for a given time period
   * Backend endpoint: GET /dashboard/analytics/performance
   */
  async getAnalyticsOverview(params?: TimeRangeParams): Promise<AnalyticsOverview> {
    // The backend only has /dashboard/analytics/performance endpoint
    // We'll use that and build the overview from it
    const response = await api.get('/dashboard/analytics/performance', {
      params,
    });
    // Backend wraps in { status: 'success', data: {...} }
    return response.data.data || response.data;
  },

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(params?: TimeRangeParams): Promise<PerformanceTrend[]> {
    const response = await api.get('/dashboard/analytics/performance', {
      params,
    });
    return response.data.data || response.data;
  },

  /**
   * Get error distribution analytics
   */
  async getErrorDistribution(params?: TimeRangeParams): Promise<ErrorDistribution[]> {
    const response = await api.get('/dashboard/analytics/performance', {
      params,
    });
    // Extract error distribution from performance data
    return response.data.data?.errorDistribution || [];
  },

  /**
   * Get test type breakdown
   */
  async getTestTypeBreakdown(params?: TimeRangeParams): Promise<TestTypeBreakdown[]> {
    const response = await api.get('/dashboard/analytics/performance', {
      params,
    });
    return response.data.data?.testTypeBreakdown || [];
  },

  /**
   * Export analytics report
   */
  async exportReport(format: 'csv' | 'pdf', params?: TimeRangeParams): Promise<Blob> {
    const response = await api.get('/dashboard/analytics/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

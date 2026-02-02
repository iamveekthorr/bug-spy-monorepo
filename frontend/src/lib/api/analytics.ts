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
   */
  async getAnalyticsOverview(params?: TimeRangeParams): Promise<AnalyticsOverview> {
    const response = await api.get<AnalyticsOverview>('/user/analytics/overview', {
      params,
    });
    return response.data;
  },

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(params?: TimeRangeParams): Promise<PerformanceTrend[]> {
    const response = await api.get<PerformanceTrend[]>('/user/analytics/performance-trends', {
      params,
    });
    return response.data;
  },

  /**
   * Get error distribution analytics
   */
  async getErrorDistribution(params?: TimeRangeParams): Promise<ErrorDistribution[]> {
    const response = await api.get<ErrorDistribution[]>('/user/analytics/error-distribution', {
      params,
    });
    return response.data;
  },

  /**
   * Get test type breakdown
   */
  async getTestTypeBreakdown(params?: TimeRangeParams): Promise<TestTypeBreakdown[]> {
    const response = await api.get<TestTypeBreakdown[]>('/user/analytics/test-types', {
      params,
    });
    return response.data;
  },

  /**
   * Export analytics report
   */
  async exportReport(format: 'csv' | 'pdf', params?: TimeRangeParams): Promise<Blob> {
    const response = await api.get('/user/analytics/export', {
      params: { ...params, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

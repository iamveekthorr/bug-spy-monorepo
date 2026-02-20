import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyticsAPI,
  type AnalyticsOverview,
  type PerformanceTrend,
  type ErrorDistribution,
  type TestTypeBreakdown,
  type TimeRangeParams,
} from '../analytics';
import { api } from '../../api-client';

vi.mock('../../api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('analyticsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAnalyticsOverview: AnalyticsOverview = {
    performanceTrends: [
      { date: '2024-01-01', averageScore: 85, testCount: 10 },
      { date: '2024-01-02', averageScore: 88, testCount: 12 },
    ],
    errorDistribution: [
      { type: 'console', count: 5, severity: 'low' },
      { type: 'network', count: 3, severity: 'high' },
    ],
    testTypeBreakdown: [
      { testType: 'performance', count: 20, averageScore: 85 },
      { testType: 'accessibility', count: 15, averageScore: 90 },
    ],
    deviceBreakdown: [
      { deviceType: 'desktop', count: 30, averageScore: 88 },
      { deviceType: 'mobile', count: 25, averageScore: 82 },
    ],
    totalTests: 100,
    totalIssues: 25,
    averagePerformanceScore: 85,
    improvementRate: 12.5,
  };

  describe('getAnalyticsOverview', () => {
    it('should fetch analytics overview without params', async () => {
      const mockResponse = { data: mockAnalyticsOverview };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getAnalyticsOverview();

      expect(api.get).toHaveBeenCalledWith('/user/analytics/overview', {
        params: undefined,
      });
      expect(result).toEqual(mockAnalyticsOverview);
      expect(result.totalTests).toBe(100);
    });

    it('should fetch analytics overview with time range params', async () => {
      const params: TimeRangeParams = {
        period: 'month',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockResponse = { data: mockAnalyticsOverview };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getAnalyticsOverview(params);

      expect(api.get).toHaveBeenCalledWith('/user/analytics/overview', { params });
      expect(result).toEqual(mockAnalyticsOverview);
    });

    it('should handle empty analytics data', async () => {
      const emptyData: AnalyticsOverview = {
        performanceTrends: [],
        errorDistribution: [],
        testTypeBreakdown: [],
        deviceBreakdown: [],
        totalTests: 0,
        totalIssues: 0,
        averagePerformanceScore: 0,
        improvementRate: 0,
      };

      const mockResponse = { data: emptyData };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getAnalyticsOverview();

      expect(result.totalTests).toBe(0);
      expect(result.performanceTrends).toHaveLength(0);
    });
  });

  describe('getPerformanceTrends', () => {
    it('should fetch performance trends', async () => {
      const mockTrends: PerformanceTrend[] = [
        { date: '2024-01-01', averageScore: 85, testCount: 10 },
        { date: '2024-01-02', averageScore: 88, testCount: 12 },
        { date: '2024-01-03', averageScore: 90, testCount: 15 },
      ];

      const mockResponse = { data: mockTrends };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getPerformanceTrends();

      expect(api.get).toHaveBeenCalledWith('/user/analytics/performance-trends', {
        params: undefined,
      });
      expect(result).toEqual(mockTrends);
      expect(result).toHaveLength(3);
    });

    it('should fetch performance trends with date range', async () => {
      const params: TimeRangeParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      const mockResponse = { data: [] };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await analyticsAPI.getPerformanceTrends(params);

      expect(api.get).toHaveBeenCalledWith('/user/analytics/performance-trends', {
        params,
      });
    });
  });

  describe('getErrorDistribution', () => {
    it('should fetch error distribution', async () => {
      const mockErrors: ErrorDistribution[] = [
        { type: 'console', count: 15, severity: 'low' },
        { type: 'network', count: 8, severity: 'high' },
        { type: 'javascript', count: 3, severity: 'critical' },
      ];

      const mockResponse = { data: mockErrors };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getErrorDistribution();

      expect(api.get).toHaveBeenCalledWith('/user/analytics/error-distribution', {
        params: undefined,
      });
      expect(result).toEqual(mockErrors);
      expect(result).toHaveLength(3);
    });

    it('should handle no errors', async () => {
      const mockResponse = { data: [] };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getErrorDistribution();

      expect(result).toHaveLength(0);
    });
  });

  describe('getTestTypeBreakdown', () => {
    it('should fetch test type breakdown', async () => {
      const mockBreakdown: TestTypeBreakdown[] = [
        { testType: 'performance', count: 50, averageScore: 85 },
        { testType: 'accessibility', count: 30, averageScore: 92 },
        { testType: 'seo', count: 20, averageScore: 88 },
      ];

      const mockResponse = { data: mockBreakdown };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.getTestTypeBreakdown();

      expect(api.get).toHaveBeenCalledWith('/user/analytics/test-types', {
        params: undefined,
      });
      expect(result).toEqual(mockBreakdown);
    });

    it('should filter by period', async () => {
      const params: TimeRangeParams = { period: 'week' };
      const mockResponse = { data: [] };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await analyticsAPI.getTestTypeBreakdown(params);

      expect(api.get).toHaveBeenCalledWith('/user/analytics/test-types', { params });
    });
  });

  describe('exportReport', () => {
    it('should export report as CSV', async () => {
      const csvBlob = new Blob(['test,data\n1,2'], { type: 'text/csv' });
      const mockResponse = { data: csvBlob };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.exportReport('csv');

      expect(api.get).toHaveBeenCalledWith('/user/analytics/export', {
        params: { format: 'csv' },
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/csv');
    });

    it('should export report as PDF', async () => {
      const pdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      const mockResponse = { data: pdfBlob };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await analyticsAPI.exportReport('pdf');

      expect(api.get).toHaveBeenCalledWith('/user/analytics/export', {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export report with time range params', async () => {
      const params: TimeRangeParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        period: 'month',
      };

      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      const mockResponse = { data: mockBlob };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await analyticsAPI.exportReport('csv', params);

      expect(api.get).toHaveBeenCalledWith('/user/analytics/export', {
        params: { ...params, format: 'csv' },
        responseType: 'blob',
      });
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(analyticsAPI.exportReport('pdf')).rejects.toThrow('Export failed');
    });
  });
});

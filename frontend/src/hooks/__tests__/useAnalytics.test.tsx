import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAnalyticsOverview,
  usePerformanceTrends,
  useErrorDistribution,
  useTestTypeBreakdown,
  useExportReport,
} from '../useAnalytics';
import { analyticsAPI } from '@/lib/api/analytics';
import type { AnalyticsOverview, TimeRangeParams } from '@/lib/api/analytics';

vi.mock('@/lib/api/analytics');

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

describe('useAnalytics hooks', () => {
  const mockAnalyticsOverview: AnalyticsOverview = {
    performanceTrends: [
      { date: '2024-01-01', averageScore: 85, testCount: 10 },
    ],
    errorDistribution: [
      { type: 'console', count: 5, severity: 'low' },
    ],
    testTypeBreakdown: [
      { testType: 'performance', count: 20, averageScore: 85 },
    ],
    deviceBreakdown: [
      { deviceType: 'desktop', count: 30, averageScore: 88 },
    ],
    totalTests: 100,
    totalIssues: 25,
    averagePerformanceScore: 85,
    improvementRate: 12.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAnalyticsOverview', () => {
    it('should fetch analytics overview without params', async () => {
      vi.mocked(analyticsAPI.getAnalyticsOverview).mockResolvedValue(
        mockAnalyticsOverview
      );

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAnalyticsOverview);
      expect(analyticsAPI.getAnalyticsOverview).toHaveBeenCalledWith(undefined);
    });

    it('should fetch analytics overview with time range params', async () => {
      const params: TimeRangeParams = {
        period: 'month',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      vi.mocked(analyticsAPI.getAnalyticsOverview).mockResolvedValue(
        mockAnalyticsOverview
      );

      const { result } = renderHook(() => useAnalyticsOverview(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(analyticsAPI.getAnalyticsOverview).toHaveBeenCalledWith(params);
    });

    it('should handle loading state', () => {
      vi.mocked(analyticsAPI.getAnalyticsOverview).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch analytics');
      vi.mocked(analyticsAPI.getAnalyticsOverview).mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('usePerformanceTrends', () => {
    it('should fetch performance trends', async () => {
      const mockTrends = [
        { date: '2024-01-01', averageScore: 85, testCount: 10 },
        { date: '2024-01-02', averageScore: 88, testCount: 12 },
      ];

      vi.mocked(analyticsAPI.getPerformanceTrends).mockResolvedValue(mockTrends);

      const { result } = renderHook(() => usePerformanceTrends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTrends);
    });

    it('should fetch trends with time range', async () => {
      const params: TimeRangeParams = { period: 'week' };
      vi.mocked(analyticsAPI.getPerformanceTrends).mockResolvedValue([]);

      const { result } = renderHook(() => usePerformanceTrends(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(analyticsAPI.getPerformanceTrends).toHaveBeenCalledWith(params);
    });
  });

  describe('useErrorDistribution', () => {
    it('should fetch error distribution', async () => {
      const mockErrors = [
        { type: 'console' as const, count: 5, severity: 'low' as const },
        { type: 'network' as const, count: 3, severity: 'high' as const },
      ];

      vi.mocked(analyticsAPI.getErrorDistribution).mockResolvedValue(mockErrors);

      const { result } = renderHook(() => useErrorDistribution(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockErrors);
    });
  });

  describe('useTestTypeBreakdown', () => {
    it('should fetch test type breakdown', async () => {
      const mockBreakdown = [
        { testType: 'performance' as const, count: 50, averageScore: 85 },
        { testType: 'accessibility' as const, count: 30, averageScore: 92 },
      ];

      vi.mocked(analyticsAPI.getTestTypeBreakdown).mockResolvedValue(
        mockBreakdown
      );

      const { result } = renderHook(() => useTestTypeBreakdown(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockBreakdown);
    });
  });

  describe('useExportReport', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let clickSpy: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      clickSpy = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: clickSpy,
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('should export report as CSV', async () => {
      const csvBlob = new Blob(['test,data'], { type: 'text/csv' });
      vi.mocked(analyticsAPI.exportReport).mockResolvedValue(csvBlob);

      const { result } = renderHook(() => useExportReport(), {
        wrapper: createWrapper(),
      });

      await result.current.exportReport('csv');

      expect(analyticsAPI.exportReport).toHaveBeenCalledWith('csv', undefined);
      expect(createObjectURLSpy).toHaveBeenCalledWith(csvBlob);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('mock-url');
    });

    it('should export report as PDF with time range', async () => {
      const pdfBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      vi.mocked(analyticsAPI.exportReport).mockResolvedValue(pdfBlob);

      const params: TimeRangeParams = { period: 'month' };

      const { result } = renderHook(() => useExportReport(), {
        wrapper: createWrapper(),
      });

      await result.current.exportReport('pdf', params);

      expect(analyticsAPI.exportReport).toHaveBeenCalledWith('pdf', params);
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      vi.mocked(analyticsAPI.exportReport).mockRejectedValue(error);

      const { result } = renderHook(() => useExportReport(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.exportReport('csv')).rejects.toThrow('Export failed');
    });

    it('should set correct download filename', async () => {
      const csvBlob = new Blob(['data'], { type: 'text/csv' });
      vi.mocked(analyticsAPI.exportReport).mockResolvedValue(csvBlob);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      createElementSpy.mockReturnValue(mockLink as any);

      const { result } = renderHook(() => useExportReport(), {
        wrapper: createWrapper(),
      });

      await result.current.exportReport('csv');

      expect(mockLink.download).toMatch(/^analytics-report-.*\.csv$/);
    });
  });
});

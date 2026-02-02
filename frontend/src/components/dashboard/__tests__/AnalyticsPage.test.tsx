import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import AnalyticsPage from '../AnalyticsPage';
import { useAnalyticsOverview, useExportReport } from '@/hooks/useAnalytics';
import type { AnalyticsOverview } from '@/lib/api/analytics';

vi.mock('@/hooks/useAnalytics');

const mockAnalytics: AnalyticsOverview = {
  performanceTrends: [
    { date: '2024-01-01', averageScore: 85, testCount: 10 },
    { date: '2024-01-02', averageScore: 88, testCount: 12 },
  ],
  errorDistribution: [
    { type: 'console', count: 15, severity: 'low' },
    { type: 'network', count: 8, severity: 'high' },
  ],
  testTypeBreakdown: [
    { testType: 'performance', count: 50, averageScore: 85 },
    { testType: 'accessibility', count: 30, averageScore: 92 },
  ],
  deviceBreakdown: [
    { deviceType: 'desktop', count: 60, averageScore: 88 },
    { deviceType: 'mobile', count: 40, averageScore: 82 },
  ],
  totalTests: 100,
  totalIssues: 25,
  averagePerformanceScore: 85,
  improvementRate: 12.5,
};

describe('AnalyticsPage', () => {
  const mockExportReport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExportReport).mockReturnValue({
      exportReport: mockExportReport,
    });
  });

  it('should render loading state', () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
    expect(screen.getAllByRole('generic').some(el =>
      el.className.includes('animate-pulse')
    )).toBe(true);
  });

  it('should render analytics overview with data', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Total tests
      expect(screen.getByText('85%')).toBeInTheDocument(); // Average score
      expect(screen.getByText('25')).toBeInTheDocument(); // Total issues
    });
  });

  it('should display metric cards correctly', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Tests')).toBeInTheDocument();
      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('Total Issues')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });

  it('should change time range filter', async () => {
    const user = userEvent.setup();
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    const timeRangeSelect = screen.getByRole('combobox');
    await user.click(timeRangeSelect);

    const weekOption = screen.getByText('Last Week');
    await user.click(weekOption);

    await waitFor(() => {
      expect(useAnalyticsOverview).toHaveBeenCalledWith({ period: 'week' });
    });
  });

  it('should export analytics as CSV', async () => {
    const user = userEvent.setup();
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockExportReport.mockResolvedValue(undefined);

    render(<AnalyticsPage />);

    const csvButton = screen.getByRole('button', { name: /csv/i });
    await user.click(csvButton);

    await waitFor(() => {
      expect(mockExportReport).toHaveBeenCalledWith('csv', { period: 'month' });
    });
  });

  it('should export analytics as PDF', async () => {
    const user = userEvent.setup();
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockExportReport.mockResolvedValue(undefined);

    render(<AnalyticsPage />);

    const pdfButton = screen.getByRole('button', { name: /pdf/i });
    await user.click(pdfButton);

    await waitFor(() => {
      expect(mockExportReport).toHaveBeenCalledWith('pdf', { period: 'month' });
    });
  });

  it('should disable export buttons while exporting', async () => {
    const user = userEvent.setup();
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockExportReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<AnalyticsPage />);

    const csvButton = screen.getByRole('button', { name: /csv/i });
    await user.click(csvButton);

    expect(csvButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
  });

  it('should display error distribution', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error Distribution')).toBeInTheDocument();
      expect(screen.getByText('Console')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('should display test type breakdown', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Type Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
      expect(screen.getByText('50 tests')).toBeInTheDocument();
      expect(screen.getByText('30 tests')).toBeInTheDocument();
    });
  });

  it('should display device breakdown', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Device Performance')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
      expect(screen.getByText('60 tests')).toBeInTheDocument();
      expect(screen.getByText('40 tests')).toBeInTheDocument();
    });
  });

  it('should show empty state for error distribution when no data', async () => {
    const emptyAnalytics = {
      ...mockAnalytics,
      errorDistribution: [],
    };

    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: emptyAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('No error data available for this period')).toBeInTheDocument();
    });
  });

  it('should show empty state for test type breakdown when no data', async () => {
    const emptyAnalytics = {
      ...mockAnalytics,
      testTypeBreakdown: [],
    };

    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: emptyAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('No test type data available for this period')).toBeInTheDocument();
    });
  });

  it('should show empty state for device breakdown when no data', async () => {
    const emptyAnalytics = {
      ...mockAnalytics,
      deviceBreakdown: [],
    };

    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: emptyAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('No device data available for this period')).toBeInTheDocument();
    });
  });

  it('should display key insights', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Key Insights')).toBeInTheDocument();
      expect(screen.getByText('Performance Improving')).toBeInTheDocument();
      expect(screen.getByText('Increased Testing')).toBeInTheDocument();
    });
  });

  it('should display performance trends chart placeholder', async () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Performance Trends')).toBeInTheDocument();
      expect(screen.getByText('Chart visualization will be displayed here')).toBeInTheDocument();
      expect(screen.getByText('2 data points available')).toBeInTheDocument();
    });
  });
});

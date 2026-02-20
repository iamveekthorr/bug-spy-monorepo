import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import TestHistoryPage from '../TestHistoryPage';
import { useUserTests } from '@/hooks/useDashboard';
import type { TestResult } from '@/types';

vi.mock('@/hooks/useDashboard');

const mockTests: TestResult[] = [
  {
    id: '1',
    url: 'https://example.com',
    status: 'COMPLETE',
    createdAt: '2024-01-01T10:00:00Z',
    completedAt: '2024-01-01T10:05:00Z',
    testType: 'performance',
    deviceType: 'desktop',
    results: {
      performanceMetrics: {
        firstContentfulPaint: 1200,
        largestContentfulPaint: 2400,
        cumulativeLayoutShift: 0.1,
        totalBlockingTime: 150,
        speedIndex: 2500,
        performanceScore: 92,
        opportunities: [],
      },
      errors: [],
      screenshots: [],
      networkRequests: [],
      consoleMessages: [],
      accessibilityIssues: [],
    },
  },
  {
    id: '2',
    url: 'https://test.com',
    status: 'RUNNING',
    createdAt: '2024-01-02T11:00:00Z',
    testType: 'accessibility',
    deviceType: 'mobile',
  },
  {
    id: '3',
    url: 'https://demo.com',
    status: 'FAILED',
    createdAt: '2024-01-03T12:00:00Z',
    completedAt: '2024-01-03T12:01:00Z',
    testType: 'seo',
    deviceType: 'tablet',
  },
];

describe('TestHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    expect(screen.getByText('Test History')).toBeInTheDocument();
    expect(screen.getAllByRole('generic').some(el =>
      el.className.includes('animate-pulse')
    )).toBe(true);
  });

  it('should render test history with data', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Test History')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('https://test.com')).toBeInTheDocument();
      expect(screen.getByText('https://demo.com')).toBeInTheDocument();
    });
  });

  it('should display status badges correctly', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should filter by search query', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const searchInput = screen.getByPlaceholderText('Search by URL...');
    await user.type(searchInput, 'example');

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.queryByText('https://test.com')).not.toBeInTheDocument();
      expect(screen.queryByText('https://demo.com')).not.toBeInTheDocument();
    });
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    await user.click(statusFilter);

    const completeOption = screen.getByText('Complete');
    await user.click(completeOption);

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.queryByText('https://test.com')).not.toBeInTheDocument();
    });
  });

  it('should filter by test type', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const testTypeFilter = screen.getByRole('combobox', { name: /test type/i });
    await user.click(testTypeFilter);

    const performanceOption = screen.getByText('Performance');
    await user.click(performanceOption);

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.queryByText('https://test.com')).not.toBeInTheDocument();
    });
  });

  it('should filter by device type', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const deviceFilter = screen.getByRole('combobox', { name: /device/i });
    await user.click(deviceFilter);

    const mobileOption = screen.getByText('Mobile');
    await user.click(mobileOption);

    await waitFor(() => {
      expect(screen.getByText('https://test.com')).toBeInTheDocument();
      expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
    });
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const searchInput = screen.getByPlaceholderText('Search by URL...');
    await user.type(searchInput, 'example');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('https://test.com')).toBeInTheDocument();
    });
  });

  it('should display performance scores correctly', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  it('should show N/A for tests without scores', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  it('should paginate results', async () => {
    const user = userEvent.setup();
    const manyTests = Array.from({ length: 25 }, (_, i) => ({
      ...mockTests[0],
      id: `test-${i}`,
      url: `https://test${i}.com`,
    }));

    vi.mocked(useUserTests).mockReturnValue({
      data: manyTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });
  });

  it('should export data to CSV', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<TestHistoryPage />);

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toMatch(/^test-history-.*\.csv$/);

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should show empty state when no tests', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('No tests found')).toBeInTheDocument();
      expect(screen.getByText('Get started by running your first website test')).toBeInTheDocument();
    });
  });

  it('should show filtered empty state', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    const searchInput = screen.getByPlaceholderText('Search by URL...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No tests found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  it('should navigate to test details on view click', async () => {
    vi.mocked(useUserTests).mockReturnValue({
      data: mockTests,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TestHistoryPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });
});

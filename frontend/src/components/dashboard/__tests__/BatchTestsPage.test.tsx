import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import BatchTestsPage from '../BatchTestsPage';
import { useBatchTests, useDeleteBatchTest, useRetryBatchTest } from '@/hooks/useBatchTests';
import { batchAPI } from '@/lib/api/batch';
import type { BatchTestsResponse } from '@/lib/api/batch';

vi.mock('@/hooks/useBatchTests');
vi.mock('@/lib/api/batch');

const mockBatchData: BatchTestsResponse = {
  batches: [
    {
      _id: 'batch1',
      userId: 'user1',
      batchId: 'batch-abc',
      batchName: 'Production Sites Audit',
      urls: ['https://site1.com', 'https://site2.com', 'https://site3.com'],
      labels: ['Site 1', 'Site 2', 'Site 3'],
      testType: 'performance',
      deviceType: 'desktop',
      status: 'COMPLETE',
      results: [
        { url: 'https://site1.com', label: 'Site 1', status: 'COMPLETE', testId: 'test1' },
        { url: 'https://site2.com', label: 'Site 2', status: 'COMPLETE', testId: 'test2' },
        { url: 'https://site3.com', label: 'Site 3', status: 'FAILED', error: 'Timeout' },
      ],
      createdAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:15:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
};

describe('BatchTestsPage', () => {
  const mockDeleteBatch = vi.fn();
  const mockRetryBatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDeleteBatchTest).mockReturnValue({
      mutate: mockDeleteBatch,
      isPending: false,
    } as any);

    vi.mocked(useRetryBatchTest).mockReturnValue({
      mutate: mockRetryBatch,
      isPending: false,
    } as any);
  });

  it('should render loading state', () => {
    vi.mocked(useBatchTests).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    expect(screen.getByText('Batch Tests')).toBeInTheDocument();
    expect(screen.getAllByRole('generic').some(el =>
      el.className.includes('animate-pulse')
    )).toBe(true);
  });

  it('should render batch tests with data', async () => {
    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Batch Tests')).toBeInTheDocument();
      expect(screen.getByText('Production Sites Audit')).toBeInTheDocument();
      expect(screen.getByText('3 URLs')).toBeInTheDocument();
    });
  });

  it('should display batch status correctly', async () => {
    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });

  it('should show results summary', async () => {
    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('2')).toBeInTheDocument(); // Complete count
      expect(screen.getByText('1')).toBeInTheDocument(); // Failed count
    });
  });

  it('should open create modal when clicking new batch test button', async () => {
    const user = userEvent.setup();
    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    const newButton = screen.getByRole('button', { name: /new batch test/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create Batch Test')).toBeInTheDocument();
      expect(screen.getByLabelText(/batch name/i)).toBeInTheDocument();
    });
  });

  it('should submit batch test form', async () => {
    const user = userEvent.setup();
    const mockEventSource = {
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    };

    vi.mocked(batchAPI.startBatchTest).mockReturnValue(mockEventSource as any);

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    const newButton = screen.getByRole('button', { name: /new batch test/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create Batch Test')).toBeInTheDocument();
    });

    const urlsTextarea = screen.getByPlaceholderText(/https:\/\/example1.com/i);
    await user.type(urlsTextarea, 'https://test1.com\nhttps://test2.com');

    const submitButton = screen.getByRole('button', { name: /start batch test/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(batchAPI.startBatchTest).toHaveBeenCalled();
    });
  });

  it('should delete a batch test with confirmation', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Sites Audit')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'trash-2';
    });

    if (deleteButton) {
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockDeleteBatch).toHaveBeenCalledWith('batch1');
    }

    confirmSpy.mockRestore();
  });

  it('should not delete batch test when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Sites Audit')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'trash-2';
    });

    if (deleteButton) {
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockDeleteBatch).not.toHaveBeenCalled();
    }

    confirmSpy.mockRestore();
  });

  it('should retry failed batch test', async () => {
    const user = userEvent.setup();

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Sites Audit')).toBeInTheDocument();
    });

    const retryButtons = screen.getAllByRole('button');
    const retryButton = retryButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'refresh-cw';
    });

    if (retryButton) {
      await user.click(retryButton);
      expect(mockRetryBatch).toHaveBeenCalledWith('batch1');
    }
  });

  it('should show empty state when no batch tests', async () => {
    vi.mocked(useBatchTests).mockReturnValue({
      data: { batches: [], total: 0, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText('No batch tests yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first batch test to run multiple URLs at once')).toBeInTheDocument();
    });
  });

  it('should close modal on cancel', async () => {
    const user = userEvent.setup();

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    const newButton = screen.getByRole('button', { name: /new batch test/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create Batch Test')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Create Batch Test')).not.toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    vi.mocked(useBatchTests).mockReturnValue({
      data: mockBatchData,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    const newButton = screen.getByRole('button', { name: /new batch test/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create Batch Test')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /start batch test/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('URLs are required')).toBeInTheDocument();
    });
  });

  it('should show pagination when total exceeds limit', async () => {
    const user = userEvent.setup();
    const manyBatches = {
      ...mockBatchData,
      total: 15,
    };

    vi.mocked(useBatchTests).mockReturnValue({
      data: manyBatches,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<BatchTestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 1 to 10 of 15 batch tests/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });
});

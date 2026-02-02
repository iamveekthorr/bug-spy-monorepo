import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  batchAPI,
  type BatchTest,
  type BatchTestsResponse,
  type CreateBatchTestRequest,
} from '../batch';
import { api } from '../../api-client';

vi.mock('../../api-client', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    defaults: {
      baseURL: 'http://localhost:4000/api',
    },
  },
}));

describe('batchAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBatchTest: BatchTest = {
    _id: 'batch123',
    userId: 'user123',
    batchId: 'batch-abc',
    batchName: 'Test Batch',
    urls: ['https://example1.com', 'https://example2.com'],
    labels: ['Site 1', 'Site 2'],
    testType: 'performance',
    deviceType: 'desktop',
    status: 'COMPLETE',
    results: [
      { url: 'https://example1.com', label: 'Site 1', status: 'COMPLETE', testId: 'test1' },
      { url: 'https://example2.com', label: 'Site 2', status: 'COMPLETE', testId: 'test2' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:05:00Z',
  };

  describe('getBatchTests', () => {
    it('should fetch batch tests with default pagination', async () => {
      const mockResponse: BatchTestsResponse = {
        batches: [mockBatchTest],
        total: 1,
        page: 1,
        limit: 10,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      const result = await batchAPI.getBatchTests();

      expect(api.get).toHaveBeenCalledWith('/user/batch-tests', {
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual(mockResponse);
      expect(result.batches).toHaveLength(1);
    });

    it('should fetch batch tests with custom pagination', async () => {
      const mockResponse: BatchTestsResponse = {
        batches: [],
        total: 0,
        page: 2,
        limit: 20,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      const result = await batchAPI.getBatchTests(2, 20);

      expect(api.get).toHaveBeenCalledWith('/user/batch-tests', {
        params: { page: 2, limit: 20 },
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should handle empty batch list', async () => {
      const mockResponse: BatchTestsResponse = {
        batches: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

      const result = await batchAPI.getBatchTests();

      expect(result.batches).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getBatchTest', () => {
    it('should fetch a specific batch test by ID', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockBatchTest });

      const result = await batchAPI.getBatchTest('batch123');

      expect(api.get).toHaveBeenCalledWith('/user/batch-tests/batch123');
      expect(result).toEqual(mockBatchTest);
      expect(result._id).toBe('batch123');
    });

    it('should handle batch test not found', async () => {
      const error = {
        response: { status: 404, data: { message: 'Batch test not found' } },
      };
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(batchAPI.getBatchTest('invalid-id')).rejects.toEqual(error);
    });
  });

  describe('startBatchTest', () => {
    it('should create EventSource with correct URL and params', () => {
      const params: CreateBatchTestRequest = {
        urls: 'https://example1.com\nhttps://example2.com',
        labels: 'Site 1\nSite 2',
        testType: 'performance',
        deviceType: 'mobile',
        sequential: true,
        includeScreenshots: true,
        batchName: 'My Batch',
      };

      const eventSource = batchAPI.startBatchTest(params);

      expect(eventSource).toBeInstanceOf(EventSource);
      expect(eventSource.url).toContain('/capture-metrics/batch');
      expect(eventSource.url).toContain('urls=https://example1.com');
      expect(eventSource.url).toContain('testType=performance');
      expect(eventSource.url).toContain('deviceType=mobile');
      expect(eventSource.url).toContain('sequential=true');
      expect(eventSource.url).toContain('includeScreenshots=true');
      expect(eventSource.url).toContain('batchName=My+Batch');
    });

    it('should create EventSource with minimal params', () => {
      const params: CreateBatchTestRequest = {
        urls: 'https://example.com',
      };

      const eventSource = batchAPI.startBatchTest(params);

      expect(eventSource).toBeInstanceOf(EventSource);
      expect(eventSource.url).toContain('urls=https://example.com');
      expect(eventSource.url).not.toContain('testType');
      expect(eventSource.url).not.toContain('sequential');
    });

    it('should handle boolean false values correctly', () => {
      const params: CreateBatchTestRequest = {
        urls: 'https://example.com',
        sequential: false,
        includeScreenshots: false,
      };

      const eventSource = batchAPI.startBatchTest(params);

      expect(eventSource.url).toContain('sequential=false');
      expect(eventSource.url).toContain('includeScreenshots=false');
    });
  });

  describe('deleteBatchTest', () => {
    it('should delete a batch test', async () => {
      const mockResponse = { data: { message: 'Batch test deleted successfully' } };
      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      const result = await batchAPI.deleteBatchTest('batch123');

      expect(api.delete).toHaveBeenCalledWith('/user/batch-tests/batch123');
      expect(result.message).toBe('Batch test deleted successfully');
    });

    it('should handle delete errors', async () => {
      const error = {
        response: { status: 403, data: { message: 'Unauthorized' } },
      };
      vi.mocked(api.delete).mockRejectedValue(error);

      await expect(batchAPI.deleteBatchTest('batch123')).rejects.toEqual(error);
    });
  });

  describe('retryBatchTest', () => {
    it('should retry a failed batch test', async () => {
      const retriedBatch: BatchTest = {
        ...mockBatchTest,
        status: 'RUNNING',
        results: mockBatchTest.results.map((r) => ({ ...r, status: 'PENDING' as const })),
      };

      vi.mocked(api.post).mockResolvedValue({ data: retriedBatch });

      const result = await batchAPI.retryBatchTest('batch123');

      expect(api.post).toHaveBeenCalledWith('/user/batch-tests/batch123/retry');
      expect(result.status).toBe('RUNNING');
      expect(result.results.every((r) => r.status === 'PENDING')).toBe(true);
    });

    it('should handle retry errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Cannot retry completed batch' },
        },
      };
      vi.mocked(api.post).mockRejectedValue(error);

      await expect(batchAPI.retryBatchTest('batch123')).rejects.toEqual(error);
    });

    it('should retry only failed URLs', async () => {
      const batchWithFailures: BatchTest = {
        ...mockBatchTest,
        status: 'COMPLETE',
        results: [
          { url: 'https://example1.com', status: 'COMPLETE', testId: 'test1' },
          { url: 'https://example2.com', status: 'FAILED', error: 'Timeout' },
        ],
      };

      vi.mocked(api.post).mockResolvedValue({ data: batchWithFailures });

      const result = await batchAPI.retryBatchTest('batch123');

      expect(api.post).toHaveBeenCalled();
      expect(result.results).toHaveLength(2);
    });
  });
});

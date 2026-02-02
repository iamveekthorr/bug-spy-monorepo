import { api } from '../api-client';

export interface BatchTest {
  _id: string;
  userId: string;
  batchId: string;
  batchName?: string;
  urls: string[];
  labels?: string[];
  testType: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  results: BatchTestResult[];
  createdAt: string;
  completedAt?: string;
}

export interface BatchTestResult {
  url: string;
  label?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  testId?: string;
  error?: string;
}

export interface CreateBatchTestRequest {
  urls: string;
  labels?: string;
  testType?: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  sequential?: boolean;
  includeScreenshots?: boolean;
  batchName?: string;
}

export interface BatchTestsResponse {
  batches: BatchTest[];
  total: number;
  page: number;
  limit: number;
}

export const batchAPI = {
  /**
   * Get all batch tests for the current user
   */
  async getBatchTests(page = 1, limit = 10): Promise<BatchTestsResponse> {
    const response = await api.get<BatchTestsResponse>('/user/batch-tests', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get a specific batch test by ID
   */
  async getBatchTest(id: string): Promise<BatchTest> {
    const response = await api.get<BatchTest>(`/user/batch-tests/${id}`);
    return response.data;
  },

  /**
   * Start a batch test
   */
  startBatchTest(params: CreateBatchTestRequest): EventSource {
    const queryParams = new URLSearchParams();
    queryParams.append('urls', params.urls);
    if (params.labels) queryParams.append('labels', params.labels);
    if (params.testType) queryParams.append('testType', params.testType);
    if (params.deviceType) queryParams.append('deviceType', params.deviceType);
    if (params.sequential !== undefined) {
      queryParams.append('sequential', String(params.sequential));
    }
    if (params.includeScreenshots !== undefined) {
      queryParams.append('includeScreenshots', String(params.includeScreenshots));
    }
    if (params.batchName) queryParams.append('batchName', params.batchName);

    const url = `${api.defaults.baseURL}/capture-metrics/batch?${queryParams.toString()}`;
    return new EventSource(url);
  },

  /**
   * Delete a batch test
   */
  async deleteBatchTest(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/user/batch-tests/${id}`);
    return response.data;
  },

  /**
   * Retry failed URLs in a batch test
   */
  async retryBatchTest(id: string): Promise<BatchTest> {
    const response = await api.post<BatchTest>(`/user/batch-tests/${id}/retry`);
    return response.data;
  },
};

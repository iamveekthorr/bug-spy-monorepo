import { api } from '../api-client';

export interface SingleTestRequest {
  url: string;
  testType?: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  includeScreenshots?: boolean;
}

export interface BatchTestRequest {
  urls: string;
  labels?: string;
  testType?: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  sequential?: boolean;
  includeScreenshots?: boolean;
  batchName?: string;
  batchId?: string;
}

export interface SaveTestRequest {
  testId: string;
}

export interface SaveTestResponse {
  message: string;
  savedTestId: string;
}

export interface SyncTestRequest {
  url: string;
  testType?: string;
  deviceType?: string;
  results: Record<string, unknown>;
  timestamp: number;
}

export interface SyncTestsResponse {
  message: string;
  syncedCount: number;
  failedCount: number;
}

export interface TestStreamEvent {
  type: 'progress' | 'complete' | 'error';
  data: any;
}

export const testsAPI = {
  /**
   * Start a single website test using Server-Sent Events (SSE)
   * Returns an EventSource for streaming real-time updates
   */
  startSingleTest(params: SingleTestRequest): EventSource {
    const queryParams = new URLSearchParams();
    queryParams.append('url', params.url);
    if (params.testType) queryParams.append('testType', params.testType);
    if (params.deviceType) queryParams.append('deviceType', params.deviceType);
    if (params.includeScreenshots !== undefined) {
      queryParams.append('includeScreenshots', String(params.includeScreenshots));
    }

    const url = `${api.defaults.baseURL}/capture-metrics/single?${queryParams.toString()}`;
    return new EventSource(url);
  },

  /**
   * Start a batch website test using Server-Sent Events (SSE)
   * Returns an EventSource for streaming real-time updates
   */
  startBatchTest(params: BatchTestRequest): EventSource {
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
    if (params.batchId) queryParams.append('batchId', params.batchId);

    const url = `${api.defaults.baseURL}/capture-metrics/batch?${queryParams.toString()}`;
    return new EventSource(url);
  },

  /**
   * Save a test result (requires authentication)
   */
  async saveTest(data: SaveTestRequest): Promise<SaveTestResponse> {
    const response = await api.post<SaveTestResponse>('/capture-metrics/save', data);
    return response.data;
  },

  /**
   * Sync local test results to server (requires authentication)
   */
  async syncTestResults(tests: SyncTestRequest[]): Promise<SyncTestsResponse> {
    // Backend wraps response in: { status: 'success', data: {...} }
    const response = await api.post<{ status: string; data: SyncTestsResponse }>('/user/tests/sync', { tests });
    return response.data.data;
  },

  /**
   * Check health status of the capture metrics service
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    const response = await api.get('/capture-metrics/health');
    return response.data;
  },
};

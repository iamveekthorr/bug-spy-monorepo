import { api } from '../api-client';
import type { TestResult, DashboardStats as DashboardStatsType } from '@/types';

export interface UserProfile {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTests: number;
  testsThisMonth: number;
  averageScore: number;
  criticalIssues: number;
  changes?: {
    totalTests: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    testsThisMonth: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    averageScore: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    criticalIssues: {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
  };
  performanceTrend: {
    thisWeek: number;
    thisMonth: number;
    lastThreeMonths: number;
  };
  testsByStatus: {
    completed: number;
    failed: number;
    running: number;
  };
  testsByType: {
    performance: number;
    screenshot: number;
    cookie: number;
  };
}

export interface PaginatedTestsResponse {
  data: TestResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const userAPI = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/user/profile');
    return response.data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    // Using the comprehensive dashboard endpoint
    // Backend wraps response in: { status: 'success', data: {...} }
    const response = await api.get<{ status: string; data: DashboardStats }>('/dashboard/stats');
    return response.data.data;
  },

  async getUserTests(page = 1, limit = 10): Promise<TestResult[]> {
    // Using the comprehensive dashboard endpoint - returns paginated data
    // Backend wraps response in: { status: 'success', data: {...} }
    const response = await api.get<{ status: string; data: PaginatedTestsResponse }>('/dashboard/tests', {
      params: { page, limit },
    });
    // Return just the data array for backwards compatibility
    return response.data.data.data;
  },

  async getUserTestsPaginated(page = 1, limit = 10): Promise<PaginatedTestsResponse> {
    // Using the comprehensive dashboard endpoint - returns full paginated response
    // Backend wraps response in: { status: 'success', data: {...} }
    const response = await api.get<{ status: string; data: PaginatedTestsResponse }>('/dashboard/tests', {
      params: { page, limit },
    });
    return response.data.data;
  },
};

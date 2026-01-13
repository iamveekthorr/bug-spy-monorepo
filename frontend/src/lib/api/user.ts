import { api } from '../api-client';

export interface DashboardStats {
  totalTests: number;
  testsThisMonth: number;
  averageScore: number;
  criticalIssues: number;
}

export interface UserProfile {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const userAPI = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/user/profile');
    return response.data;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/user/dashboard/stats');
    return response.data;
  },

  async getUserTests(): Promise<any[]> {
    const response = await api.get<any[]>('/user/tests');
    return response.data;
  },
};

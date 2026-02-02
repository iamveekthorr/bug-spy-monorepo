import { api } from '../api-client';

export interface Schedule {
  _id: string;
  userId: string;
  name: string;
  url: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  testType: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  isActive: boolean;
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  name: string;
  url: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  testType: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  isActive?: boolean;
}

export interface SchedulesResponse {
  schedules: Schedule[];
  total: number;
}

export const schedulesAPI = {
  /**
   * Get all schedules for the current user
   */
  async getSchedules(): Promise<SchedulesResponse> {
    const response = await api.get<SchedulesResponse>('/dashboard/schedules');
    return response.data;
  },

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(id: string): Promise<Schedule> {
    const response = await api.get<Schedule>(`/dashboard/schedules/${id}`);
    return response.data;
  },

  /**
   * Create a new schedule
   */
  async createSchedule(data: CreateScheduleRequest): Promise<Schedule> {
    const response = await api.post<Schedule>('/dashboard/schedules', data);
    return response.data;
  },

  /**
   * Update an existing schedule
   */
  async updateSchedule(id: string, data: UpdateScheduleRequest): Promise<Schedule> {
    // Backend uses PUT for full updates
    const response = await api.put<Schedule>(`/dashboard/schedules/${id}`, data);
    return response.data;
  },

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/dashboard/schedules/${id}`);
    return response.data;
  },

  /**
   * Toggle schedule active status
   */
  async toggleSchedule(id: string): Promise<Schedule> {
    const response = await api.patch<Schedule>(`/dashboard/schedules/${id}/toggle`);
    return response.data;
  },
};

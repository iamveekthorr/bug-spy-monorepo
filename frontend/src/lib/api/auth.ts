import { api, apiClient } from '../api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
}

export interface SignupResponse {
  message: string;
  user: {
    _id: string;
    email: string;
  };
}

export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);

    // Store access token in API client
    apiClient.setAccessToken(response.data.accessToken);

    return response.data;
  },

  async signup(data: SignupRequest): Promise<SignupResponse> {
    const response = await api.post<SignupResponse>('/auth/signup', data);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear token even if request fails
      apiClient.clearAccessToken();
    }
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>('/auth/refresh');

    // Update access token in API client
    apiClient.setAccessToken(response.data.accessToken);

    return response.data;
  },
};

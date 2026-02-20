import { api } from '../api-client';

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
    name?: string; // Optional from backend
    provider?: string;
    subscription?: string;
    plan?: string; // Optional from backend
    id?: string;
    createdAt?: string;
    updatedAt?: string;
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
    // Backend wraps response in: { status: 'success', data: { user, accessToken } }
    const response = await api.post<{ status: string; data: AuthResponse }>('/auth/login', credentials);

    console.log('🔍 Login response:', response.data);
    console.log('🔍 Access token from response:', response.data?.data?.accessToken);

    // Validate response structure
    if (!response.data?.data?.user || !response.data?.data?.accessToken) {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Invalid response from server');
    }

    // Token will be stored in auth store by the useLogin hook
    return response.data.data;
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    // Backend wraps response and now returns { user, accessToken } like login
    const response = await api.post<{ status: string; data: AuthResponse }>('/auth/signup', data);

    console.log('🔍 Signup response:', response.data);
    console.log('🔍 Access token from response:', response.data?.data?.accessToken);

    // Validate response structure
    if (!response.data?.data?.user || !response.data?.data?.accessToken) {
      console.error('❌ Invalid signup response structure:', response.data);
      throw new Error('Invalid response from server');
    }

    // Token will be stored in auth store by the useSignup hook
    return response.data.data;
  },

  async logout(): Promise<void> {
    // Logout endpoint will clear the refresh token cookie
    // The useLogout hook will clear the auth store (including access token)
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>('/auth/refresh');

    // Token will be stored in auth store by the refresh interceptor
    return response.data;
  },
};

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies (refresh token)
    });

    this.setupInterceptors();
  }

  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        console.log('📤 Request interceptor - URL:', config.url);

        // Get token from auth store
        const accessToken = useAuthStore.getState().accessToken;
        console.log('📤 Access token from store:', accessToken ? '✅ Token exists' : '❌ No token');

        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          console.log('📤 Added Authorization header with token:', accessToken.substring(0, 20) + '...');
        } else if (!accessToken) {
          console.warn('⚠️ No access token in store for request');
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Don't retry if it's the refresh endpoint itself or if already retried
        const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');

        // If error is 401 and we haven't retried yet, try to refresh token
        if (
          error.response?.status === 401 &&
          !originalRequest?._retry &&
          !isRefreshEndpoint &&
          originalRequest
        ) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve) => {
              this.addRefreshSubscriber((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Call refresh endpoint with credentials (httpOnly cookie will be sent automatically)
            const response = await this.client.post('/auth/refresh');
            const { accessToken } = response.data;

            console.log('✅ Token refresh successful');
            this.setAccessToken(accessToken);
            this.isRefreshing = false;

            // Notify all queued requests
            this.onRefreshed(accessToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, user needs to login again
            console.error('❌ Token refresh failed:', refreshError);
            this.isRefreshing = false;
            this.refreshSubscribers = [];
            this.clearAccessToken();

            // Redirect to home page where login modal can be opened
            if (!window.location.pathname.includes('/')) {
              window.location.href = '/';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  setAccessToken(token: string) {
    console.log('🔑 setAccessToken called with token:', token ? token.substring(0, 20) + '...' : 'null');
    // Store token in auth store (which persists to localStorage)
    useAuthStore.getState().setAccessToken(token);
    console.log('🔑 Token stored in auth store successfully');
  }

  clearAccessToken() {
    console.log('🗑️ clearAccessToken called');
    // Clear token from auth store
    useAuthStore.getState().setAccessToken(null);
    console.log('🗑️ Token cleared from auth store');
  }

  getClient() {
    return this.client;
  }
}

export const apiClient = new APIClient();
export const api = apiClient.getClient();

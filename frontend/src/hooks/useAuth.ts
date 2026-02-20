import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  SignupResponse,
} from '@/lib/api/auth';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/store';
import { useUIStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';

interface ErrorResponse {
  message: string;
}

export const useLogin = () => {
  const { login: setAuthUser, setError, setLoading } = useAuthStore();
  const { redirectAfterLogin, closeAuthModals } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<AuthResponse, AxiosError<ErrorResponse>, LoginRequest>({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data: AuthResponse) => {
      console.log('✅ Login successful, data:', data);

      // Handle both _id and id fields
      const userId = data.user._id || data.user.id;

      if (!userId) {
        setError('Login failed: Invalid user data');
        setLoading(false);
        return;
      }

      // Map backend subscription to plan field, provide defaults
      const plan = data.user.plan || data.user.subscription || 'free';
      const name = data.user.name || data.user.email.split('@')[0];

      const user = {
        id: userId,
        email: data.user.email,
        name: name,
        plan: plan as 'free' | 'pro' | 'enterprise',
        createdAt: data.user.createdAt || new Date().toISOString(),
        updatedAt: data.user.updatedAt,
      };

      console.log('✅ Storing user and token in auth store');
      // Store both user and access token
      setAuthUser(user, data.accessToken);
      setLoading(false);
      queryClient.invalidateQueries();

      // Save redirect path BEFORE closing modals (closeAuthModals clears it)
      const destination = redirectAfterLogin || '/dashboard';

      // Close auth modals if open
      closeAuthModals();

      // Navigate to dashboard or redirect path
      navigate(destination);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      setLoading(false);
      const errorMessage =
        error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
    },
  });
};

export const useSignup = () => {
  const { login: setAuthUser, setError, setLoading } = useAuthStore();
  const { redirectAfterLogin, closeAuthModals } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<AuthResponse, AxiosError<ErrorResponse>, SignupRequest>({
    mutationFn: (data: SignupRequest) => authAPI.signup(data),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data: AuthResponse) => {
      console.log('✅ Signup successful, data:', data);

      // Handle both _id and id fields
      const userId = data.user._id || data.user.id;

      if (!userId) {
        setError('Signup failed: Invalid user data');
        setLoading(false);
        return;
      }

      // Map backend subscription to plan field, provide defaults
      const plan = data.user.plan || data.user.subscription || 'free';
      const name = data.user.name || data.user.email.split('@')[0];

      const user = {
        id: userId,
        email: data.user.email,
        name: name,
        plan: plan as 'free' | 'pro' | 'enterprise',
        createdAt: data.user.createdAt || new Date().toISOString(),
        updatedAt: data.user.updatedAt,
      };

      console.log('✅ Storing user and token in auth store');
      // Store both user and access token
      setAuthUser(user, data.accessToken);
      setLoading(false);
      queryClient.invalidateQueries();

      // Save redirect path BEFORE closing modals
      const destination = redirectAfterLogin || '/dashboard';

      // Close auth modals if open
      closeAuthModals();

      // Navigate to dashboard or redirect path
      navigate(destination);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      setLoading(false);
      const errorMessage =
        error.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const { logout: clearAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ErrorResponse>, void>({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      clearAuthUser();
      queryClient.clear();
      navigate('/');
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      // Clear auth even on error
      clearAuthUser();
      queryClient.clear();
      navigate('/');
    },
  });
};

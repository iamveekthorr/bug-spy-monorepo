import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI, LoginRequest, SignupRequest } from '@/lib/api/auth';
import { useAuthStore } from '@/store';
import { useNavigate } from 'react-router-dom';

export const useLogin = () => {
  const navigate = useNavigate();
  const { login: setAuthUser, setError, setLoading } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setAuthUser({
        id: data.user._id,
        email: data.user.email,
        createdAt: data.user.createdAt,
        updatedAt: data.user.updatedAt,
      });
      setLoading(false);
      queryClient.invalidateQueries();
      navigate('/dashboard');
    },
    onError: (error: any) => {
      setLoading(false);
      const errorMessage =
        error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
    },
  });
};

export const useSignup = () => {
  const navigate = useNavigate();
  const { setError, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: (data: SignupRequest) => authAPI.signup(data),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: () => {
      setLoading(false);
      // After signup, redirect to login
      navigate('/auth/login');
    },
    onError: (error: any) => {
      setLoading(false);
      const errorMessage =
        error.response?.data?.message ||
        'Signup failed. Please try again.';
      setError(errorMessage);
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const { logout: clearAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      clearAuthUser();
      queryClient.clear();
      navigate('/');
    },
    onError: (error: any) => {
      // Clear auth even on error
      clearAuthUser();
      queryClient.clear();
      navigate('/');
    },
  });
};

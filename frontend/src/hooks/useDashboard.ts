import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/lib/api/user';
import { useAuthStore } from '@/store';

export const useProfile = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userAPI.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!accessToken,
  });
};

export const useDashboardStats = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => userAPI.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    enabled: !!accessToken,
  });
};

export const useUserTests = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['user', 'tests'],
    queryFn: () => userAPI.getUserTests(),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!accessToken,
  });
};

export const useTestById = (testId: string) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['test', testId],
    queryFn: () => userAPI.getTestById(testId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!accessToken && !!testId,
  });
};

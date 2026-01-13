import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/lib/api/user';

export const useProfile = () => {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userAPI.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => userAPI.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useUserTests = () => {
  return useQuery({
    queryKey: ['user', 'tests'],
    queryFn: () => userAPI.getUserTests(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

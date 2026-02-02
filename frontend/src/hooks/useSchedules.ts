import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesAPI, type CreateScheduleRequest, type UpdateScheduleRequest } from '@/lib/api/schedules';
import { useToast } from '@/hooks/useToast';

export const useSchedules = () => {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesAPI.getSchedules(),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSchedule = (id: string) => {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => schedulesAPI.getSchedule(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateScheduleRequest) => schedulesAPI.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create schedule');
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleRequest }) =>
      schedulesAPI.updateSchedule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] });
      toast.success('Schedule updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update schedule');
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => schedulesAPI.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete schedule');
    },
  });
};

export const useToggleSchedule = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => schedulesAPI.toggleSchedule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', data._id] });
      toast.success(
        data.isActive ? 'Schedule activated' : 'Schedule paused'
      );
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to toggle schedule');
    },
  });
};

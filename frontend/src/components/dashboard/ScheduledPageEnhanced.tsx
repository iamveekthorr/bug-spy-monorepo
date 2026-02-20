import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from '@/hooks/useSchedules';
import type { Schedule } from '@/lib/api/schedules';

const scheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  url: z.string().url('Please enter a valid URL'),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  testType: z.enum(['performance', 'accessibility', 'seo', 'best-practices']),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const ScheduledPageEnhanced = () => {
  const { data: schedulesData, isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const toggleSchedule = useToggleSchedule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const schedules = schedulesData?.schedules || [];

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: '',
      url: '',
      frequency: 'daily',
      testType: 'performance',
      deviceType: 'desktop',
    },
  });

  useEffect(() => {
    if (editingSchedule) {
      form.reset({
        name: editingSchedule.name,
        url: editingSchedule.url,
        frequency: editingSchedule.frequency,
        testType: editingSchedule.testType,
        deviceType: editingSchedule.deviceType,
      });
    } else {
      form.reset({
        name: '',
        url: '',
        frequency: 'daily',
        testType: 'performance',
        deviceType: 'desktop',
      });
    }
  }, [editingSchedule, form]);

  const onSubmit: SubmitHandler<ScheduleFormData> = async (data) => {
    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({
          id: editingSchedule._id,
          data,
        });
      } else {
        await createSchedule.mutateAsync(data);
      }
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  };

  const handleToggle = (id: string) => {
    toggleSchedule.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      deleteSchedule.mutate(id);
    }
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      default:
        return Monitor;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFrequencyDisplay = (frequency: string) => {
    const frequencies = {
      hourly: 'Every hour',
      daily: 'Every day',
      weekly: 'Every week',
      monthly: 'Every month',
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Tests</h1>
          <p className="text-gray-600 mt-1">Automate your website testing with scheduled runs</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} className="mr-2" />
          New Schedule
        </Button>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {schedules.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {schedules.map((schedule) => {
              const DeviceIcon = getDeviceIcon(schedule.deviceType);

              return (
                <div key={schedule._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4">
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full',
                            schedule.isActive ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        ></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                schedule.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {schedule.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-blue-600 hover:text-blue-800">
                              <Globe size={14} className="inline mr-1" />
                              {schedule.url}
                            </span>
                            <span className="text-sm text-gray-500 capitalize">
                              <DeviceIcon size={14} className="inline mr-1" />
                              {schedule.testType} • {schedule.deviceType}
                            </span>
                          </div>
                          <div className="flex items-center space-x-6 mt-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock size={14} className="mr-1" />
                              {getFrequencyDisplay(schedule.frequency)}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar size={14} className="mr-1" />
                              Next: {formatDate(schedule.nextRun)}
                            </div>
                            {schedule.lastRun && (
                              <div className="text-sm text-gray-500">Last: {formatDate(schedule.lastRun)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(schedule._id)}
                        disabled={toggleSchedule.isPending}
                      >
                        {schedule.isActive ? (
                          <Pause size={16} className="text-orange-500" />
                        ) : (
                          <Play size={16} className="text-green-500" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(schedule)}>
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(schedule._id)}
                        disabled={deleteSchedule.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled tests</h3>
            <p className="text-gray-500 mb-4">
              Create your first scheduled test to automate website monitoring
            </p>
            <Button onClick={openCreateModal}>
              <Plus size={16} className="mr-2" />
              Create Schedule
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingSchedule(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Name
              </label>
              <Input
                {...form.register('name')}
                type="text"
                id="name"
                placeholder="e.g., Daily Production Monitor"
                className={cn(form.formState.errors.name && 'border-red-300')}
              />
              {form.formState.errors.name && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </Field>

            <Field>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <Input
                {...form.register('url')}
                type="url"
                id="url"
                placeholder="https://example.com"
                className={cn(form.formState.errors.url && 'border-red-300')}
              />
              {form.formState.errors.url && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.url.message}</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                <Select
                  onValueChange={(value) => form.setValue('testType', value as any)}
                  value={form.watch('testType')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="best-practices">Best Practices</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <label className="block text-sm font-medium text-gray-700 mb-2">Device</label>
                <Select
                  onValueChange={(value) => form.setValue('deviceType', value as any)}
                  value={form.watch('deviceType')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
              <Select
                onValueChange={(value) => form.setValue('frequency', value as any)}
                value={form.watch('frequency')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every hour</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSchedule(null);
                  form.reset();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingSchedule ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingSchedule ? (
                  'Update Schedule'
                ) : (
                  'Create Schedule'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledPageEnhanced;

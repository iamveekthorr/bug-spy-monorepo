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
  MoreHorizontal,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import type { TestSchedule } from '@/types';

const scheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  url: z.string().url('Please enter a valid URL'),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  testType: z.string().min(1, 'Test type is required'),
  deviceType: z.string().min(1, 'Device type is required'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

// Mock scheduled tests data
const mockSchedules: TestSchedule[] = [
  {
    id: '1',
    name: 'Production Site Monitor',
    url: 'https://myapp.com',
    frequency: 'hourly',
    testType: 'performance',
    deviceType: 'desktop',
    isActive: true,
    nextRun: '2024-01-07T12:00:00Z',
    lastRun: '2024-01-07T11:00:00Z',
  },
  {
    id: '2',
    name: 'Mobile Experience Check',
    url: 'https://myapp.com',
    frequency: 'daily',
    testType: 'ui',
    deviceType: 'mobile',
    isActive: true,
    nextRun: '2024-01-08T09:00:00Z',
    lastRun: '2024-01-07T09:00:00Z',
  },
  {
    id: '3',
    name: 'Weekly Full Audit',
    url: 'https://demo.site.com',
    frequency: 'weekly',
    testType: 'full',
    deviceType: 'desktop',
    isActive: false,
    nextRun: '2024-01-14T10:00:00Z',
    lastRun: '2024-01-01T10:00:00Z',
  },
];

const ScheduledPage = () => {
  const [schedules, setSchedules] = useState<TestSchedule[]>(mockSchedules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TestSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (editingSchedule) {
        // Update existing schedule
        setSchedules(prev =>
          prev.map(schedule =>
            schedule.id === editingSchedule.id
              ? { ...schedule, ...data }
              : schedule
          )
        );
      } else {
        // Create new schedule
        const newSchedule: TestSchedule = {
          id: Date.now().toString(),
          ...data,
          isActive: true,
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        setSchedules(prev => [newSchedule, ...prev]);
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
    } catch (error) {
      console.error('Failed to save schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSchedule = (id: string) => {
    setSchedules(prev =>
      prev.map(schedule =>
        schedule.id === id
          ? { ...schedule, isActive: !schedule.isActive }
          : schedule
      )
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== id));
  };

  const openEditModal = (schedule: TestSchedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const formatDate = (dateString: string) => {
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
                <div key={schedule.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          schedule.isActive ? 'bg-green-500' : 'bg-gray-300'
                        )}></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">
                              {schedule.name}
                            </h3>
                            <span className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              schedule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            )}>
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
                              <div className="text-sm text-gray-500">
                                Last: {formatDate(schedule.lastRun)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSchedule(schedule.id)}
                      >
                        {schedule.isActive ? (
                          <Pause size={16} className="text-orange-500" />
                        ) : (
                          <Play size={16} className="text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(schedule)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal size={16} />
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
      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setEditingSchedule(null);
      }}>
        <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
          </h2>

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
                className={cn(
                  form.formState.errors.name && 'border-red-300'
                )}
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
                className={cn(
                  form.formState.errors.url && 'border-red-300'
                )}
              />
              {form.formState.errors.url && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.url.message}</p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type
                </label>
                <Select
                  onValueChange={(value) => form.setValue('testType', value)}
                  defaultValue={form.getValues('testType')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="ui">UI</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="full">Full Test</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device
                </label>
                <Select
                  onValueChange={(value) => form.setValue('deviceType', value)}
                  defaultValue={form.getValues('deviceType')}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <Select
                onValueChange={(value) => form.setValue('frequency', value as any)}
                defaultValue={form.getValues('frequency')}
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
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingSchedule ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingSchedule ? 'Update Schedule' : 'Create Schedule'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduledPage;
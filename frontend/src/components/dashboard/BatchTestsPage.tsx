import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Globe,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBatchTests, useDeleteBatchTest, useRetryBatchTest } from '@/hooks/useBatchTests';
import { batchAPI, type CreateBatchTestRequest } from '@/lib/api/batch';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const batchSchema = z.object({
  urls: z.string().min(1, 'URLs are required'),
  labels: z.string().optional(),
  testType: z.enum(['performance', 'accessibility', 'seo', 'best-practices']).optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  batchName: z.string().optional(),
  sequential: z.boolean().optional(),
  includeScreenshots: z.boolean().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    COMPLETE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Complete' },
    RUNNING: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Running' },
    FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Failed' },
    PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color)}>
      <Icon size={12} className="mr-1" />
      {config.text}
    </span>
  );
};

const BatchTestsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Backend endpoints /user/batch-tests/* are not yet implemented
  // Gracefully handle the missing endpoints
  const { data: batchData, isLoading, error } = useBatchTests(currentPage, 10);
  const deleteBatch = useDeleteBatchTest();
  const retryBatch = useRetryBatchTest();

  // Check if the endpoint is not available (404 error)
  const isEndpointNotAvailable = error && (error as any)?.response?.status === 404;

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      urls: '',
      labels: '',
      testType: 'performance',
      deviceType: 'desktop',
      batchName: '',
      sequential: false,
      includeScreenshots: true,
    },
  });

  const onSubmit: SubmitHandler<BatchFormData> = async (data) => {
    setIsRunning(true);

    const eventSource = batchAPI.startBatchTest(data as CreateBatchTestRequest);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log('Batch test progress:', parsed);

        if (parsed.status === 'COMPLETE' || parsed.status === 'FAILED') {
          eventSource.close();
          setIsRunning(false);
          setIsModalOpen(false);
          form.reset();
        }
      } catch (error) {
        console.error('Failed to parse batch test event:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsRunning(false);
      console.error('Batch test connection error');
    };
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this batch test?')) {
      deleteBatch.mutate(id);
    }
  };

  const handleRetry = (id: string) => {
    retryBatch.mutate(id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  // Show "Coming Soon" message if endpoints are not available
  if (isEndpointNotAvailable) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Tests</h1>
          <p className="text-gray-600 mt-1">Run tests on multiple URLs simultaneously</p>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <FileText size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Batch Tests Coming Soon</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              The batch testing feature is currently under development. This powerful feature will allow you to test
              multiple URLs simultaneously and track their results in one place.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>What to expect:</strong>
                <ul className="mt-2 text-left space-y-1">
                  <li>• Test multiple URLs at once</li>
                  <li>• Track batch test progress in real-time</li>
                  <li>• Download comprehensive reports</li>
                  <li>• Retry failed tests easily</li>
                </ul>
              </p>
            </div>
            <div className="mt-6">
              <Link to="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Tests</h1>
          <p className="text-gray-600 mt-1">Run tests on multiple URLs simultaneously</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          New Batch Test
        </Button>
      </div>

      {/* Batch Tests List */}
      <div className="space-y-4">
        {batchData?.batches && batchData.batches.length > 0 ? (
          batchData.batches.map((batch) => (
            <div key={batch._id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {batch.batchName || `Batch ${batch.batchId}`}
                    </h3>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                    <span className="flex items-center">
                      <Globe size={14} className="mr-1" />
                      {batch.urls.length} URLs
                    </span>
                    <span className="capitalize">
                      {batch.testType} • {batch.deviceType}
                    </span>
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(batch.createdAt)}
                    </span>
                  </div>

                  {/* Results Summary */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Total</p>
                      <p className="text-xl font-bold text-gray-900">{batch.results.length}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Complete</p>
                      <p className="text-xl font-bold text-green-600">
                        {batch.results.filter((r) => r.status === 'COMPLETE').length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Running</p>
                      <p className="text-xl font-bold text-blue-600">
                        {batch.results.filter((r) => r.status === 'RUNNING').length}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Failed</p>
                      <p className="text-xl font-bold text-red-600">
                        {batch.results.filter((r) => r.status === 'FAILED').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/dashboard/batch-tests/${batch._id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye size={16} />
                    </Button>
                  </Link>
                  {batch.results.some((r) => r.status === 'FAILED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetry(batch._id)}
                      disabled={retryBatch.isPending}
                    >
                      <RefreshCw size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(batch._id)}
                    disabled={deleteBatch.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No batch tests yet</h3>
            <p className="text-gray-500 mb-4">Create your first batch test to run multiple URLs at once</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Batch Test
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {batchData && batchData.total > 10 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, batchData.total)} of{' '}
            {batchData.total} batch tests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage * 10 >= batchData.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Batch Test Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Create Batch Test</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 mb-2">
                Batch Name (Optional)
              </label>
              <Input
                {...form.register('batchName')}
                type="text"
                id="batchName"
                placeholder="e.g., Production Sites Audit"
              />
            </Field>

            <Field>
              <label htmlFor="urls" className="block text-sm font-medium text-gray-700 mb-2">
                URLs (one per line)
              </label>
              <textarea
                {...form.register('urls')}
                id="urls"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
              />
              {form.formState.errors.urls && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.urls.message}</p>
              )}
            </Field>

            <Field>
              <label htmlFor="labels" className="block text-sm font-medium text-gray-700 mb-2">
                Labels (Optional, one per line)
              </label>
              <textarea
                {...form.register('labels')}
                id="labels"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Homepage&#10;About Page&#10;Contact Page"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                <Select
                  onValueChange={(value) => form.setValue('testType', value as any)}
                  defaultValue={form.getValues('testType')}
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

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register('sequential')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Run tests sequentially</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register('includeScreenshots')}
                  className="rounded border-gray-300"
                  defaultChecked
                />
                <span className="text-sm text-gray-700">Include screenshots</span>
              </label>
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle size={20} className="text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800">
                Batch tests may take several minutes to complete depending on the number of URLs.
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  form.reset();
                }}
                disabled={isRunning}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Clock size={16} className="mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Start Batch Test'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchTestsPage;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUserTests } from '@/hooks/useDashboard';
import type { TestResult } from '@/types';

const TestStatusBadge = ({ status }: { status: string }) => {
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

const TestHistoryPage = () => {
  const { data: userTests = [], isLoading } = useUserTests();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter tests
  const filteredTests = userTests.filter((test: TestResult) => {
    const matchesSearch = !searchQuery || test.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    const matchesTestType = testTypeFilter === 'all' || test.testType === testTypeFilter;
    const matchesDevice = deviceFilter === 'all' || test.deviceType === deviceFilter;

    return matchesSearch && matchesStatus && matchesTestType && matchesDevice;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (createdAt: string, completedAt?: string) => {
    if (!completedAt) return 'In progress';
    const start = new Date(createdAt);
    const end = new Date(completedAt);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTestTypeFilter('all');
    setDeviceFilter('all');
    setCurrentPage(1);
  };

  const exportData = () => {
    const csvContent = [
      ['URL', 'Status', 'Test Type', 'Device', 'Created At', 'Duration', 'Performance Score'].join(','),
      ...filteredTests.map((test: TestResult) =>
        [
          test.url,
          test.status,
          test.testType,
          test.deviceType,
          formatDate(test.createdAt),
          formatDuration(test.createdAt, test.completedAt),
          test.results?.performanceMetrics?.performanceScore || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-history-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded mb-4"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Test History</h1>
          <p className="text-gray-600 mt-1">
            Browse and analyze your complete testing history
          </p>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download size={16} className="mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={testTypeFilter} onValueChange={setTestTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Test Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="best-practices">Best Practices</SelectItem>
                <SelectItem value="full">Full Test</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter size={16} className="mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {paginatedTests.length} of {filteredTests.length} results
          {filteredTests.length !== userTests.length && ` (filtered from ${userTests.length} total)`}
        </div>
      </div>

      {/* Test History List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {paginatedTests.length > 0 ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTests.map((test: TestResult) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`/dashboard/tests/${test.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block max-w-md"
                            title={test.url}
                          >
                            {test.url}
                          </Link>
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            {test.testType} • {test.deviceType}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TestStatusBadge status={test.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar size={14} className="mr-2 text-gray-400" />
                          {formatDate(test.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(test.createdAt, test.completedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {test.results?.performanceMetrics?.performanceScore ? (
                          <span
                            className={cn(
                              'text-sm font-medium',
                              getPerformanceColor(test.results.performanceMetrics.performanceScore)
                            )}
                          >
                            {test.results.performanceMetrics.performanceScore}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link to={`/dashboard/tests/${test.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye size={16} className="mr-2" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' || testTypeFilter !== 'all' || deviceFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by running your first website test'}
            </p>
            {(searchQuery || statusFilter !== 'all' || testTypeFilter !== 'all' || deviceFilter !== 'all') && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestHistoryPage;

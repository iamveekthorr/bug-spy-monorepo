import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { useTestsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/types';

// Mock test data
const mockTests: TestResult[] = [
  {
    id: '1',
    url: 'https://example.com',
    status: 'COMPLETE',
    createdAt: '2024-01-07T10:30:00Z',
    completedAt: '2024-01-07T10:32:15Z',
    testType: 'performance',
    deviceType: 'desktop',
    results: {
      performanceMetrics: {
        firstContentfulPaint: 1.2,
        largestContentfulPaint: 2.1,
        cumulativeLayoutShift: 0.05,
        totalBlockingTime: 150,
        speedIndex: 1.8,
        performanceScore: 85,
        opportunities: [],
      },
      errors: [
        { id: '1', type: 'console', severity: 'medium', message: 'Warning: Deprecated API usage', timestamp: Date.now() },
      ],
      screenshots: [],
      networkRequests: [],
      consoleMessages: [],
      accessibilityIssues: [],
    },
  },
  {
    id: '2',
    url: 'https://mysite.com',
    status: 'COMPLETE',
    createdAt: '2024-01-07T09:15:00Z',
    completedAt: '2024-01-07T09:17:32Z',
    testType: 'full',
    deviceType: 'mobile',
    results: {
      performanceMetrics: {
        firstContentfulPaint: 2.1,
        largestContentfulPaint: 3.8,
        cumulativeLayoutShift: 0.15,
        totalBlockingTime: 320,
        speedIndex: 3.2,
        performanceScore: 72,
        opportunities: [],
      },
      errors: [
        { id: '2', type: 'network', severity: 'high', message: 'Failed to load resource: 404', timestamp: Date.now() },
        { id: '3', type: 'javascript', severity: 'medium', message: 'Uncaught TypeError', timestamp: Date.now() },
      ],
      screenshots: [],
      networkRequests: [],
      consoleMessages: [],
      accessibilityIssues: [],
    },
  },
  {
    id: '3',
    url: 'https://webapp.io',
    status: 'FAILED',
    createdAt: '2024-01-07T08:45:00Z',
    testType: 'ui',
    deviceType: 'tablet',
  },
  {
    id: '4',
    url: 'https://testsite.net',
    status: 'RUNNING',
    createdAt: '2024-01-07T11:00:00Z',
    testType: 'performance',
    deviceType: 'desktop',
  },
  {
    id: '5',
    url: 'https://demo.app',
    status: 'PENDING',
    createdAt: '2024-01-07T11:15:00Z',
    testType: 'accessibility',
    deviceType: 'mobile',
  },
];

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

const TestsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tests, setTests, filters, setFilters } = useTestsStore();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  useEffect(() => {
    setTests(mockTests);
  }, [setTests]);

  // Filter tests based on current filters and search
  const filteredTests = tests.filter((test) => {
    // Search filter
    if (searchQuery && !test.url.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(test.status)) {
      return false;
    }

    // Test type filter
    if (filters.testType.length > 0 && !filters.testType.includes(test.testType)) {
      return false;
    }

    // Device type filter
    if (filters.deviceType.length > 0 && !filters.deviceType.includes(test.deviceType)) {
      return false;
    }

    return true;
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  const handleFilterChange = (filterType: 'status' | 'testType' | 'deviceType', value: string) => {
    const currentFilter = filters[filterType];
    const newFilter = currentFilter.includes(value)
      ? currentFilter.filter(item => item !== value)
      : [...currentFilter, value];
    
    setFilters({ [filterType]: newFilter });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
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

  const getErrorCount = (test: TestResult) => {
    return test.results?.errors?.length || 0;
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const toggleAllTests = () => {
    setSelectedTests(prev => 
      prev.length === filteredTests.length 
        ? [] 
        : filteredTests.map(test => test.id)
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tests</h1>
        <p className="text-gray-600 mt-1">View and manage your website test results</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by URL..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilterChange('testType', value)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Test Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="ui">UI</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="full">Full Test</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilterChange('deviceType', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter size={16} className="mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {(filters.status.length > 0 || filters.testType.length > 0 || filters.deviceType.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.status.map(status => (
              <span key={status} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {status}
                <button 
                  onClick={() => handleFilterChange('status', status)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
            {filters.testType.map(type => (
              <span key={type} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Type: {type}
                <button 
                  onClick={() => handleFilterChange('testType', type)}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
            {filters.deviceType.map(device => (
              <span key={device} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Device: {device}
                <button 
                  onClick={() => handleFilterChange('deviceType', device)}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedTests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedTests.length} test{selectedTests.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tests table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredTests.length > 0 ? (
          <>
            {/* Table header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedTests.length === filteredTests.length}
                    onChange={toggleAllTests}
                    className="rounded border-gray-300"
                  />
                </div>
                <div className="col-span-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </div>
                <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </div>
                <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Details
                </div>
                <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </div>
                <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </div>
                <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </div>
              </div>
            </div>

            {/* Table body */}
            <div className="divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <div key={test.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Checkbox */}
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTestSelection(test.id)}
                        className="rounded border-gray-300"
                      />
                    </div>

                    {/* URL */}
                    <div className="col-span-3">
                      <Link
                        to={`/dashboard/tests/${test.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                        title={test.url}
                      >
                        {test.url}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(test.createdAt)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <TestStatusBadge status={test.status} />
                    </div>

                    {/* Test Details */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-900 capitalize">
                        {test.testType} test
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {test.deviceType}
                      </p>
                    </div>

                    {/* Results */}
                    <div className="col-span-2">
                      {test.results ? (
                        <div className="space-y-1">
                          {test.results.performanceMetrics && (
                            <p className={cn(
                              'text-sm font-medium',
                              getPerformanceColor(test.results.performanceMetrics.performanceScore)
                            )}>
                              Score: {test.results.performanceMetrics.performanceScore}%
                            </p>
                          )}
                          {getErrorCount(test) > 0 && (
                            <p className="text-xs text-red-600">
                              {getErrorCount(test)} issue{getErrorCount(test) > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {test.status === 'RUNNING' ? 'In progress...' : 'No results'}
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="col-span-1">
                      <span className="text-sm text-gray-900">
                        {formatDuration(test.createdAt, test.completedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center space-x-2">
                        <Link to={`/dashboard/tests/${test.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye size={16} />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filters.status.length || filters.testType.length || filters.deviceType.length
                ? 'Try adjusting your search or filters'
                : 'Get started by running your first website test'
              }
            </p>
            <div className="flex justify-center gap-2">
              <Link to="/">
                <Button>Run New Test</Button>
              </Link>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilters({ status: [], testType: [], deviceType: [] });
                setSearchParams({});
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination would go here */}
      {filteredTests.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredTests.length} of {tests.length} tests
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestsPage;
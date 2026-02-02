import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  FileText,
  Network,
  Terminal,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestResult, ErrorReport } from '@/types';

// Mock detailed test data
const mockTestResult: TestResult = {
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
      opportunities: [
        {
          id: '1',
          title: 'Eliminate render-blocking resources',
          description: 'Remove render-blocking CSS and JavaScript',
          savings: 0.8,
          priority: 'high',
        },
        {
          id: '2',
          title: 'Enable text compression',
          description: 'Text-based resources should be served with compression',
          savings: 0.3,
          priority: 'medium',
        },
      ],
    },
    errors: [
      {
        id: '1',
        type: 'console',
        severity: 'medium',
        message: 'Warning: Deprecated API usage in main.js',
        timestamp: Date.now(),
        lineNumber: 42,
        columnNumber: 15,
        stackTrace: 'at main.js:42:15\nat app.js:18:3',
      },
      {
        id: '2',
        type: 'network',
        severity: 'high',
        message: 'Failed to load resource: 404 (Not Found)',
        url: 'https://example.com/missing-image.jpg',
        timestamp: Date.now(),
      },
    ],
    screenshots: [
      {
        id: '1',
        url: '/api/screenshots/1/full-page.png',
        type: 'full-page',
        timestamp: Date.now(),
        deviceType: 'desktop',
      },
      {
        id: '2',
        url: '/api/screenshots/1/viewport.png',
        type: 'viewport',
        timestamp: Date.now(),
        deviceType: 'desktop',
      },
    ],
    networkRequests: [
      {
        id: '1',
        url: 'https://example.com/',
        method: 'GET',
        status: 200,
        responseTime: 245,
        size: 15680,
        type: 'document',
        failed: false,
      },
      {
        id: '2',
        url: 'https://example.com/styles.css',
        method: 'GET',
        status: 200,
        responseTime: 87,
        size: 25430,
        type: 'stylesheet',
        failed: false,
      },
    ],
    consoleMessages: [
      {
        id: '1',
        level: 'warn',
        message: 'Deprecated API usage',
        timestamp: Date.now(),
        source: 'main.js:42',
      },
      {
        id: '2',
        level: 'error',
        message: 'Failed to load resource',
        timestamp: Date.now(),
        source: 'network',
      },
    ],
    accessibilityIssues: [
      {
        id: '1',
        type: 'color-contrast',
        severity: 'serious',
        element: '<button>Submit</button>',
        description: 'Elements must have sufficient color contrast',
        help: 'Ensure all text elements have sufficient color contrast',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/color-contrast',
      },
    ],
  },
};

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
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', config.color)}>
      <Icon size={16} className="mr-2" />
      {config.text}
    </span>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  unit, 
  description, 
  status 
}: { 
  title: string; 
  value: number; 
  unit: string; 
  description: string; 
  status: 'good' | 'needs-improvement' | 'poor'; 
}) => {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    'needs-improvement': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className={cn('p-4 rounded-lg border', statusColors[status])}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className={cn('text-lg font-bold', statusColors[status].split(' ')[0])}>
          {value}{unit}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  );
};

const ErrorItem = ({ error }: { error: ErrorReport }) => {
  const severityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', severityColors[error.severity])}>
              {error.severity}
            </span>
            <span className="text-xs text-gray-500 capitalize">{error.type}</span>
          </div>
          <p className="text-sm font-medium text-gray-900">{error.message}</p>
          {error.url && (
            <p className="text-xs text-gray-500 mt-1">URL: {error.url}</p>
          )}
          {error.lineNumber && (
            <p className="text-xs text-gray-500">
              Line {error.lineNumber}, Column {error.columnNumber}
            </p>
          )}
          {error.stackTrace && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Stack trace
              </summary>
              <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                {error.stackTrace}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

interface Screenshot {
  id: string;
  url: string;
  type: string;
  timestamp: number;
  deviceType: string;
}

const ScreenshotFilmstrip = ({ screenshots }: { screenshots: Screenshot[] }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  const openLightbox = () => {
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8">
        <Eye size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">No screenshots available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Image Display */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="aspect-video flex items-center justify-center p-4">
          <div className="relative max-h-[500px] w-full flex items-center justify-center">
            {/* Placeholder - replace with actual image when available */}
            <div className="bg-gray-800 rounded-lg w-full h-96 flex flex-col items-center justify-center">
              <Eye size={64} className="text-gray-600 mb-4" />
              <p className="text-gray-400 text-sm capitalize">
                {screenshots[selectedIndex].type.replace('-', ' ')}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {screenshots[selectedIndex].deviceType}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {screenshots.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
              aria-label="Previous screenshot"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
              aria-label="Next screenshot"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Zoom Button */}
        <button
          onClick={openLightbox}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors"
          aria-label="View full size"
        >
          <ZoomIn size={20} />
        </button>

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {selectedIndex + 1} / {screenshots.length}
        </div>
      </div>

      {/* Filmstrip Thumbnails */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <div className="flex gap-3 pb-2">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  'flex-shrink-0 w-32 h-20 rounded-lg border-2 transition-all overflow-hidden',
                  selectedIndex === index
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                {/* Placeholder thumbnail - replace with actual image when available */}
                <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center">
                  <Eye size={20} className="text-gray-500" />
                  <p className="text-xs text-gray-600 mt-1 capitalize">
                    {screenshot.type.split('-')[0]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screenshot Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 capitalize">
              {screenshots[selectedIndex].type.replace('-', ' ')}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Device: {screenshots[selectedIndex].deviceType} •
              Captured at {new Date(screenshots[selectedIndex].timestamp).toLocaleTimeString()}
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close lightbox"
          >
            <X size={32} />
          </button>

          {/* Navigation in Lightbox */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors"
                aria-label="Previous screenshot"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors"
                aria-label="Next screenshot"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Full Size Image */}
          <div className="max-w-7xl max-h-[90vh] w-full px-4">
            <div className="bg-gray-800 rounded-lg w-full h-[80vh] flex flex-col items-center justify-center">
              <Eye size={96} className="text-gray-600 mb-6" />
              <p className="text-gray-400 text-lg capitalize">
                {screenshots[selectedIndex].type.replace('-', ' ')}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {screenshots[selectedIndex].deviceType}
              </p>
            </div>
          </div>

          {/* Counter */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full">
            {selectedIndex + 1} / {screenshots.length}
          </div>
        </div>
      )}
    </div>
  );
};

const TestResultPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [test, setTest] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTest(mockTestResult);
      setIsLoading(false);
    }, 500);
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Test not found</h2>
          <p className="text-gray-500 mb-4">The test you're looking for doesn't exist.</p>
          <Link to="/dashboard/tests">
            <Button variant="outline">Back to Tests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const DeviceIcon = getDeviceIcon(test.deviceType);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
    return `${duration} seconds`;
  };

  const getPerformanceStatus = (score: number) => {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: FileText },
    { id: 'performance', name: 'Performance', icon: Clock },
    { id: 'errors', name: 'Issues', icon: AlertTriangle, count: test.results?.errors?.length },
    { id: 'screenshots', name: 'Screenshots', icon: Eye },
    { id: 'network', name: 'Network', icon: Network },
    { id: 'console', name: 'Console', icon: Terminal },
    { id: 'accessibility', name: 'Accessibility', icon: UserCheck },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <TestStatusBadge status={test.status} />
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Globe size={24} className="mr-3" />
              {test.url}
            </h1>
            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <DeviceIcon size={16} className="mr-1" />
                {test.deviceType} • {test.testType} test
              </span>
              <span>{formatDate(test.createdAt)}</span>
              <span>Duration: {formatDuration(test.createdAt, test.completedAt)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <RefreshCw size={16} className="mr-2" />
              Rerun Test
            </Button>
            <Button variant="outline" size="sm">
              <Share2 size={16} className="mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Score (if available) */}
      {test.results?.performanceMetrics && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-center">
            <div className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold',
              test.results.performanceMetrics.performanceScore >= 90 ? 'bg-green-100 text-green-600' :
              test.results.performanceMetrics.performanceScore >= 50 ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-red-600'
            )}>
              {test.results.performanceMetrics.performanceScore}
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center mt-4">Performance Score</h2>
          <p className="text-gray-600 text-center mt-2">
            {test.results.performanceMetrics.performanceScore >= 90 ? 'Excellent performance!' :
             test.results.performanceMetrics.performanceScore >= 50 ? 'Room for improvement' :
             'Needs optimization'}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.name}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 text-xs rounded-full px-2 py-0.5">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {test.results?.performanceMetrics && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                      title="First Contentful Paint"
                      value={test.results.performanceMetrics.firstContentfulPaint}
                      unit="s"
                      description="Time until the first element is painted"
                      status={getPerformanceStatus(test.results.performanceMetrics.performanceScore)}
                    />
                    <MetricCard
                      title="Largest Contentful Paint"
                      value={test.results.performanceMetrics.largestContentfulPaint}
                      unit="s"
                      description="Time until the largest element is painted"
                      status={getPerformanceStatus(test.results.performanceMetrics.performanceScore)}
                    />
                    <MetricCard
                      title="Cumulative Layout Shift"
                      value={test.results.performanceMetrics.cumulativeLayoutShift}
                      unit=""
                      description="Measure of visual stability"
                      status={getPerformanceStatus(test.results.performanceMetrics.performanceScore)}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Issues Found</h4>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      {test.results?.errors?.length || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Network Requests</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {test.results?.networkRequests?.length || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Screenshots</h4>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {test.results?.screenshots?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && test.results?.performanceMetrics && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title="Speed Index"
                    value={test.results.performanceMetrics.speedIndex}
                    unit="s"
                    description="How quickly content is visually displayed"
                    status={getPerformanceStatus(test.results.performanceMetrics.performanceScore)}
                  />
                  <MetricCard
                    title="Total Blocking Time"
                    value={test.results.performanceMetrics.totalBlockingTime}
                    unit="ms"
                    description="Time that the main thread was blocked"
                    status={getPerformanceStatus(test.results.performanceMetrics.performanceScore)}
                  />
                </div>
              </div>

              {test.results.performanceMetrics.opportunities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Optimization Opportunities</h3>
                  <div className="space-y-3">
                    {test.results.performanceMetrics.opportunities.map((opportunity) => (
                      <div key={opportunity.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                            <span className={cn(
                              'inline-block mt-2 px-2 py-1 rounded text-xs font-medium',
                              opportunity.priority === 'high' ? 'bg-red-100 text-red-800' :
                              opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            )}>
                              {opportunity.priority} priority
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-green-600">
                              -{opportunity.savings}s
                            </span>
                            <p className="text-xs text-gray-500">potential savings</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'errors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Issues Detected</h3>
                {test.results?.errors && test.results.errors.length > 0 ? (
                  <div className="space-y-4">
                    {test.results.errors.map((error) => (
                      <ErrorItem key={error.id} error={error} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No issues found!</h4>
                    <p className="text-gray-500">Your website passed all checks without any issues.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Screenshots Tab */}
          {activeTab === 'screenshots' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Screenshots</h3>
              <ScreenshotFilmstrip screenshots={test.results?.screenshots || []} />
            </div>
          )}

          {/* Add other tab contents as needed */}
          {activeTab === 'network' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Network Requests</h3>
              <p className="text-gray-500">Network request details would be displayed here.</p>
            </div>
          )}

          {activeTab === 'console' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Console Messages</h3>
              <p className="text-gray-500">Console messages would be displayed here.</p>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Accessibility Issues</h3>
              <p className="text-gray-500">Accessibility analysis would be displayed here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultPage;
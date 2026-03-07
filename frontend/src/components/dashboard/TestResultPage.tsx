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
  Search,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestResult, ErrorReport } from '@/types';
import { useTestById } from '@/hooks/useDashboard';
import SeoResultsSection from './SeoResultsSection';
import { exportSeoReportToPdf, exportPerformanceReportToPdf } from '@/utils/pdfExport';
import { useToast } from '@/hooks/useToast';

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
  const toast = useToast();
  const [isRerunning, setIsRerunning] = useState(false);
  
  // Fetch real test data from backend
  const { data: rawTest, isLoading, isError, error } = useTestById(id || '');
  
  // Transform the backend data structure to match frontend expectations
  // Backend can return metrics in two formats:
  // 1. webMetrics.performanceMetrics (new format from web-metrics.service.ts)
  // 2. webMetrics.metrics (old format stored in database)
  // Get raw metrics data - handle multiple possible data structures
  const rawMetrics = rawTest?.results?.webMetrics || rawTest?.results?.performanceMetrics;
  
  const test = rawTest ? {
    ...rawTest,
    results: rawTest.results ? {
      ...rawTest.results,
      // Map webMetrics to performanceMetrics for component compatibility
      performanceMetrics: rawMetrics ? {
        firstContentfulPaint: (rawMetrics.firstContentfulPaint || rawMetrics.metrics?.firstContentfulPaint || 0) / 1000, // ms to seconds
        largestContentfulPaint: (rawMetrics.largestContentfulPaint || rawMetrics.metrics?.largestContentfulPaint || 0) / 1000,
        cumulativeLayoutShift: rawMetrics.cumulativeLayoutShift || rawMetrics.metrics?.cumulativeLayoutShift || 0,
        totalBlockingTime: rawMetrics.totalBlockingTime || rawMetrics.metrics?.totalBlockingTime || 0,
        speedIndex: (rawMetrics.speedIndex || rawMetrics.metrics?.speedIndex || 0) / 1000,
        performanceScore: rawMetrics.performanceScore || rawTest.performanceScore || 0,
        accessibilityScore: rawMetrics.accessibilityScore || 0,
        seoScore: rawMetrics.seoScore || rawMetrics.seoAnalysis?.score || 0,
        bestPracticesScore: rawMetrics.bestPracticesScore || 0,
        opportunities: [],
      } : undefined,
      // Map errors to expected format - check multiple sources
      errors: (() => {
        const consoleErrors = rawTest.results.consoleErrors?.errors?.javascript || [];
        const seoIssues = rawTest.results.webMetrics?.seoAnalysis?.issues || [];
        const allErrors = [...consoleErrors, ...seoIssues];
        return allErrors.map((err: any, index: number) => 
          typeof err === 'string' 
            ? { id: `error-${index}`, type: 'console', severity: 'medium' as const, message: err, timestamp: Date.now() }
            : { id: `error-${index}`, type: err.source || 'issue', severity: err.severity || 'medium', message: err.message || err.description, timestamp: Date.now() }
        );
      })(),
      // Map console errors specifically
      consoleErrors: rawTest.results.consoleErrors || null,
      // Map screenshots to expected format
      screenshots: rawTest.results.screenshots?.urls?.map((url: string, index: number) => ({
        id: `screenshot-${index}`,
        url,
        type: 'viewport',
        timestamp: Date.now(),
        deviceType: rawTest.results?.screenshots?.deviceType || rawTest.deviceType || 'desktop',
      })) || [],
      // Map network stats
      networkRequests: rawTest.results.webMetrics?.networkStats ? [{
        totalRequests: rawTest.results.webMetrics.networkStats.totalRequests || 0,
        totalSize: rawTest.results.webMetrics.networkStats.totalSize || 0,
        http1: rawTest.results.webMetrics.networkStats.http1 || 0,
        http2: rawTest.results.webMetrics.networkStats.http2 || 0,
        http3: rawTest.results.webMetrics.networkStats.http3 || 0,
      }] : [],
      networkStats: rawTest.results.webMetrics?.networkStats || null,
    } : undefined,
  } : null;

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

  if (isError || !test) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Test not found</h2>
          <p className="text-gray-500 mb-4">
            {isError ? 'Failed to load test data.' : "The test you're looking for doesn't exist."}
          </p>
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

  // Dynamic tabs - only show tabs with actual content
  const issues = test.results?.errors || test.results?.webMetrics?.seoAnalysis?.issues || [];
  const allTabs = [
    { id: 'overview', name: 'Overview', icon: FileText, alwaysShow: true },
    { id: 'performance', name: 'Performance', icon: Clock, alwaysShow: true },
    { id: 'seo', name: 'SEO', icon: Search, hasContent: test.testType === 'seo' || !!test.results?.webMetrics?.seoAnalysis },
    { id: 'errors', name: 'Issues', icon: AlertTriangle, count: issues.length, hasContent: issues.length > 0 },
    { id: 'screenshots', name: 'Screenshots', icon: Eye, hasContent: test.results?.screenshots && Object.keys(test.results.screenshots).length > 0 },
    { id: 'network', name: 'Network', icon: Network, hasContent: !!test.results?.webMetrics?.networkStats },
    { id: 'console', name: 'Console', icon: Terminal, hasContent: (test.results?.consoleErrors?.length || 0) > 0 },
    { id: 'accessibility', name: 'Accessibility', icon: UserCheck, hasContent: !!test.results?.webMetrics?.accessibilityScore },
  ];
  
  // Filter to only show tabs that have content (or are set to always show)
  const tabs = allTabs.filter(tab => tab.alwaysShow || tab.hasContent);

  const handleRerunTest = async () => {
    if (!test.url || !test.testType) {
      toast.error('Cannot rerun test: missing URL or test type');
      return;
    }

    setIsRerunning(true);
    toast.info('Starting test rerun...');
    
    // Navigate to home page with test parameters pre-filled
    navigate(`/?url=${encodeURIComponent(test.url)}&testType=${test.testType}&deviceType=${test.deviceType || 'desktop'}&autorun=true`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

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
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRerunTest}
              disabled={isRerunning}
              data-testid="rerun-test-btn"
            >
              <RefreshCw size={16} className={cn("mr-2", isRerunning && "animate-spin")} />
              {isRerunning ? 'Rerunning...' : 'Rerun Test'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              data-testid="share-test-btn"
            >
              <Share2 size={16} className="mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (rawTest) {
                  if (test.testType === 'seo' || rawTest.results?.webMetrics?.seoAnalysis) {
                    exportSeoReportToPdf(rawTest);
                  } else {
                    exportPerformanceReportToPdf(rawTest);
                  }
                }
              }}
              data-testid="export-pdf-btn"
            >
              <Download size={16} className="mr-2" />
              Export PDF
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
                {issues.length > 0 ? (
                  <div className="space-y-4">
                    {issues.map((issue: any, index: number) => (
                      <div key={index} className="p-4 bg-white border rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn(
                            "flex-shrink-0 mt-0.5",
                            issue.severity === 'critical' || issue.severity === 'error' ? 'text-red-500' :
                            issue.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                          )} size={20} />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {issue.title || issue.source || 'Issue'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {issue.description || issue.message}
                            </p>
                            {issue.impact && (
                              <span className={cn(
                                "inline-block mt-2 px-2 py-0.5 text-xs rounded-full",
                                issue.impact === 'high' ? 'bg-red-100 text-red-700' :
                                issue.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                              )}>
                                {issue.impact} impact
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">SEO Analysis</h3>
              {rawTest?.results?.webMetrics?.seoAnalysis ? (
                <SeoResultsSection seoAnalysis={rawTest.results.webMetrics.seoAnalysis} />
              ) : rawTest?.results?.webMetrics?.seoScore ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl flex items-center justify-center">
                    <div className={cn(
                      'w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold',
                      (rawTest.results.webMetrics.seoScore || 0) >= 90 ? 'bg-green-100 text-green-600' :
                      (rawTest.results.webMetrics.seoScore || 0) >= 70 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    )}>
                      {rawTest.results.webMetrics.seoScore || 0}
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-bold text-gray-900">SEO Score</h3>
                      <p className="text-gray-600 mt-1">
                        {(rawTest.results.webMetrics.seoScore || 0) >= 90 ? 'Excellent SEO!' :
                         (rawTest.results.webMetrics.seoScore || 0) >= 70 ? 'Good, but can be improved.' :
                         'Needs SEO optimization.'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-500 text-center">
                    Run an SEO-specific test for detailed analysis and recommendations.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No SEO Analysis Available</h4>
                  <p className="text-gray-500">Run an SEO test to get detailed SEO analysis and recommendations.</p>
                </div>
              )}
            </div>
          )}

          {/* Add other tab contents as needed */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Network Analysis</h3>
              {test.results?.networkStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Total Requests</h4>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {test.results.networkStats.totalRequests || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Total Size</h4>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {((test.results.networkStats.totalSize || 0) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">HTTP/2 Requests</h4>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {test.results.networkStats.http2 || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">HTTP/1.1 Requests</h4>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {test.results.networkStats.http1 || 0}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Network size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Network Data</h4>
                  <p className="text-gray-500">Network analysis data is not available for this test.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'console' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Console Messages</h3>
              {test.results?.consoleErrors ? (
                <div className="space-y-4">
                  {/* JavaScript Errors */}
                  {test.results.consoleErrors.errors?.javascript?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 mb-2">JavaScript Errors ({test.results.consoleErrors.errors.javascript.length})</h4>
                      <div className="space-y-2">
                        {test.results.consoleErrors.errors.javascript.slice(0, 10).map((err: any, i: number) => (
                          <div key={i} className="bg-red-50 border border-red-100 rounded p-3 text-sm">
                            <p className="text-red-800 font-mono">{err.text || err}</p>
                            {err.url && <p className="text-red-600 text-xs mt-1">Source: {err.url}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Network Errors */}
                  {test.results.consoleErrors.errors?.network?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-orange-600 mb-2">Network Errors ({test.results.consoleErrors.errors.network.length})</h4>
                      <div className="space-y-2">
                        {test.results.consoleErrors.errors.network.slice(0, 10).map((err: any, i: number) => (
                          <div key={i} className="bg-orange-50 border border-orange-100 rounded p-3 text-sm">
                            <p className="text-orange-800 font-mono">{err.text || err}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-red-600">{test.results.consoleErrors.errors?.javascript?.length || 0}</p>
                        <p className="text-xs text-gray-500">JS Errors</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{test.results.consoleErrors.errors?.network?.length || 0}</p>
                        <p className="text-xs text-gray-500">Network Errors</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-600">{test.results.consoleErrors.errors?.other?.length || 0}</p>
                        <p className="text-xs text-gray-500">Other</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Console Errors</h4>
                  <p className="text-gray-500">No console errors were detected during the test.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Accessibility Analysis</h3>
              {test.results?.performanceMetrics?.accessibilityScore ? (
                <div className="space-y-6">
                  {/* Score Display */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl flex items-center">
                    <div className={cn(
                      'w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold',
                      test.results.performanceMetrics.accessibilityScore >= 90 ? 'bg-green-100 text-green-600' :
                      test.results.performanceMetrics.accessibilityScore >= 70 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    )}>
                      {test.results.performanceMetrics.accessibilityScore}
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-bold text-gray-900">Accessibility Score</h3>
                      <p className="text-gray-600 mt-1">
                        {test.results.performanceMetrics.accessibilityScore >= 90 ? 'Excellent accessibility!' :
                         test.results.performanceMetrics.accessibilityScore >= 70 ? 'Good, but can be improved.' :
                         'Needs accessibility improvements.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Best Practices Score if available */}
                  {test.results.performanceMetrics.bestPracticesScore > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Best Practices Score</h4>
                      <p className="text-2xl font-bold text-blue-600">{test.results.performanceMetrics.bestPracticesScore}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCheck size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Accessibility Data</h4>
                  <p className="text-gray-500">Run a performance test to get accessibility analysis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultPage;
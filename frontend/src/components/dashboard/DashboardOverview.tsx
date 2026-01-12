import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  TestTube,
  Calendar,
  ArrowRight,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useDashboardStore, useTestsStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/types';

// Mock data for recent tests
const mockRecentTests: TestResult[] = [
  {
    id: '1',
    url: 'https://example.com',
    status: 'COMPLETE',
    createdAt: '2024-01-07T10:30:00Z',
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
      errors: [],
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
        { id: '1', type: 'network', severity: 'high', message: 'Failed to load resource', timestamp: Date.now() },
        { id: '2', type: 'console', severity: 'medium', message: 'Warning message', timestamp: Date.now() },
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
];

const StatCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  href 
}: { 
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ComponentType<any>;
  href?: string;
}) => {
  const CardContent = (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {trend === 'up' && <TrendingUp size={16} className="text-green-600 mr-1" />}
              {trend === 'down' && <TrendingDown size={16} className="text-red-600 mr-1" />}
              <span className={cn(
                'text-sm font-medium',
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
              )}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <Icon size={24} className="text-blue-600" />
        </div>
      </div>
    </div>
  );

  return href ? <Link to={href}>{CardContent}</Link> : CardContent;
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
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color)}>
      <Icon size={12} className="mr-1" />
      {config.text}
    </span>
  );
};

const DashboardOverview = () => {
  const { stats, isLoading, refreshStats } = useDashboardStore();
  const { setTests } = useTestsStore();

  useEffect(() => {
    refreshStats();
    setTests(mockRecentTests);
  }, [refreshStats, setTests]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100">
          Here's what's happening with your website testing today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tests"
          value={stats?.totalTests || 0}
          change="+12 this week"
          trend="up"
          icon={TestTube}
          href="/dashboard/tests"
        />
        <StatCard
          title="This Month"
          value={stats?.testsThisMonth || 0}
          change="+8.2% vs last month"
          trend="up"
          icon={Calendar}
          href="/dashboard/tests"
        />
        <StatCard
          title="Avg Performance"
          value={`${stats?.averageScore || 0}%`}
          change="+2.1% improvement"
          trend="up"
          icon={BarChart3}
        />
        <StatCard
          title="Critical Issues"
          value={stats?.criticalIssues || 0}
          change="-3 resolved"
          trend="down"
          icon={AlertTriangle}
          href="/dashboard/reports"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tests */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Tests</h2>
                <Link to="/dashboard/tests">
                  <Button variant="outline" size="sm">
                    View all
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-0">
              {mockRecentTests.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {mockRecentTests.map((test) => (
                    <div key={test.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <Link
                              to={`/dashboard/tests/${test.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
                            >
                              {test.url}
                            </Link>
                            <TestStatusBadge status={test.status} />
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(test.createdAt)}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {test.testType} • {test.deviceType}
                            </span>
                            {test.results?.performanceMetrics.performanceScore && (
                              <span className={cn(
                                'text-xs font-medium',
                                getPerformanceColor(test.results.performanceMetrics.performanceScore)
                              )}>
                                Score: {test.results.performanceMetrics.performanceScore}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {test.results?.errors && test.results.errors.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                              {test.results.errors.length} issues
                            </span>
                          )}
                          <Link to={`/dashboard/tests/${test.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <TestTube size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tests yet</h3>
                  <p className="text-gray-500 mb-4">Get started by running your first website test.</p>
                  <Link to="/">
                    <Button>Start Test</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions & Performance chart */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <TestTube size={16} className="mr-2" />
                  Run New Test
                </Button>
              </Link>
              <Link to="/dashboard/scheduled" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar size={16} className="mr-2" />
                  Schedule Test
                </Button>
              </Link>
              <Link to="/dashboard/reports" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 size={16} className="mr-2" />
                  View Reports
                </Button>
              </Link>
            </div>
          </div>

          {/* Performance trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This week</span>
                <span className="font-medium text-green-600">+2.4%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This month</span>
                <span className="font-medium text-green-600">+5.8%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last 3 months</span>
                <span className="font-medium text-green-600">+12.1%</span>
              </div>
              
              {/* Simple chart placeholder */}
              <div className="mt-6 h-32 bg-gray-50 rounded-md flex items-center justify-center">
                <Activity size={32} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
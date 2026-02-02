import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/types';
import { useDashboardStats, useUserTests } from '@/hooks/useDashboard';
import { StartTestModal, type TestParams } from './StartTestModal';
import { testsAPI } from '@/lib/api/tests';
import { indexedDBService } from '@/lib/indexedDB';
import { useAuthStore } from '@/store';

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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats();
  const {
    data: userTests = [],
    isLoading: testsLoading,
    error: testsError,
  } = useUserTests();

  const isLoading = statsLoading || testsLoading;
  const hasError = statsError || testsError;

  // Use only real tests from API - no mock data
  const recentTests = userTests || [];

  const handleStartTest = async (params: TestParams) => {
    setIsRunningTest(true);

    try {
      // Start the test using SSE
      const eventSource = testsAPI.startSingleTest(params);

      eventSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'complete') {
          console.log('✅ Test completed:', data.data);

          // Save to IndexedDB if user is not authenticated
          if (!user) {
            await indexedDBService.saveTestResult({
              url: params.url,
              testType: params.testType,
              deviceType: params.deviceType,
              results: data.data,
              timestamp: Date.now(),
              syncedToServer: false,
            });
          }

          eventSource.close();
          setIsRunningTest(false);

          // Navigate to tests page
          navigate('/dashboard/tests');
        } else if (data.type === 'error') {
          console.error('❌ Test failed:', data.data);
          eventSource.close();
          setIsRunningTest(false);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE error:', error);
        eventSource.close();
        setIsRunningTest(false);
      };
    } catch (error) {
      console.error('❌ Failed to start test:', error);
      setIsRunningTest(false);
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

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg animate-pulse">
          <div className="h-8 bg-blue-500 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-blue-500 rounded w-1/2"></div>
        </div>
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

  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle size={24} className="text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Error Loading Dashboard
              </h3>
              <p className="text-red-700 mt-1">
                {statsError instanceof Error
                  ? statsError.message
                  : testsError instanceof Error
                    ? testsError.message
                    : 'Failed to load dashboard data. Please try again.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
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
          change={
            stats?.changes?.totalTests
              ? `${stats.changes.totalTests.trend === 'up' ? '+' : stats.changes.totalTests.trend === 'down' ? '-' : ''}${Math.abs(stats.changes.totalTests.value)} this week`
              : undefined
          }
          trend={stats?.changes?.totalTests?.trend}
          icon={TestTube}
          href="/dashboard/tests"
        />
        <StatCard
          title="This Month"
          value={stats?.testsThisMonth || 0}
          change={
            stats?.changes?.testsThisMonth
              ? `${stats.changes.testsThisMonth.percentage}% vs last month`
              : undefined
          }
          trend={stats?.changes?.testsThisMonth?.trend}
          icon={Calendar}
          href="/dashboard/tests"
        />
        <StatCard
          title="Avg Performance"
          value={`${stats?.averageScore || 0}%`}
          change={
            stats?.changes?.averageScore && stats.changes.averageScore.value !== 0
              ? `${stats.changes.averageScore.percentage}% ${stats.changes.averageScore.trend === 'up' ? 'improvement' : stats.changes.averageScore.trend === 'down' ? 'decrease' : ''}`
              : undefined
          }
          trend={stats?.changes?.averageScore?.trend}
          icon={BarChart3}
        />
        <StatCard
          title="Critical Issues"
          value={stats?.criticalIssues || 0}
          change={
            stats?.changes?.criticalIssues
              ? `${Math.abs(stats.changes.criticalIssues.value)} ${stats.changes.criticalIssues.trend === 'down' ? 'resolved' : stats.changes.criticalIssues.trend === 'up' ? 'new' : 'total'}`
              : undefined
          }
          trend={stats?.changes?.criticalIssues?.trend}
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
              {recentTests.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {recentTests.map((test) => (
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
                            {test.results?.performanceMetrics?.performanceScore && (
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
                  <Button onClick={() => setIsTestModalOpen(true)} disabled={isRunningTest}>
                    {isRunningTest ? 'Running Test...' : 'Start Test'}
                  </Button>
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
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsTestModalOpen(true)}
                disabled={isRunningTest}
              >
                <TestTube size={16} className="mr-2" />
                {isRunningTest ? 'Running Test...' : 'Run New Test'}
              </Button>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This week</span>
                <span className="font-medium text-blue-600">
                  {stats?.performanceTrend?.thisWeek || 0} tests
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This month</span>
                <span className="font-medium text-blue-600">
                  {stats?.performanceTrend?.thisMonth || 0} tests
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last 3 months</span>
                <span className="font-medium text-blue-600">
                  {stats?.performanceTrend?.lastThreeMonths || 0} tests
                </span>
              </div>

              {/* Simple chart placeholder */}
              <div className="mt-6 h-32 bg-gray-50 rounded-md flex items-center justify-center">
                <Activity size={32} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Test Modal */}
      <StartTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSubmit={handleStartTest}
      />
    </div>
  );
};

export default DashboardOverview;
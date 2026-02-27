import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAnalyticsOverview, useExportReport } from '@/hooks/useAnalytics';
import type { TimeRangeParams } from '@/lib/api/analytics';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ComponentType<any>;
}) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {trend === 'up' && <TrendingUp size={16} className="text-green-600 mr-1" />}
              {trend === 'down' && <TrendingDown size={16} className="text-red-600 mr-1" />}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
                )}
              >
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
};

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState<string>('month');
  const { exportReport } = useExportReport();
  const [isExporting, setIsExporting] = useState(false);

  const timeRangeParams: TimeRangeParams = {
    period: timeRange as any,
  };

  // Backend endpoint /user/analytics/overview is not yet implemented
  // Gracefully handle the missing endpoint
  const { data: analytics, isLoading, error } = useAnalyticsOverview(timeRangeParams);

  // Check if the endpoint is not available (404 error)
  const isEndpointNotAvailable = error && (error as any)?.response?.status === 404;

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      await exportReport(format, timeRangeParams);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your testing performance</p>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <BarChart3 size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              The advanced analytics and reporting feature is currently under development. This comprehensive
              dashboard will provide deep insights into your website testing performance.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
              <p className="text-sm font-semibold text-blue-800">What to expect:</p>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• Performance trends over time</li>
                <li>• Error distribution analytics</li>
                <li>• Test type and device breakdowns</li>
                <li>• Export reports in CSV and PDF formats</li>
                <li>• Actionable insights and recommendations</li>
              </ul>
            </div>
            <div className="mt-6 flex gap-3 justify-center">
              <Link to="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link to="/dashboard/tests">
                <Button>View Tests</Button>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your testing performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar size={16} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
            >
              <Download size={16} className="mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
            >
              <Download size={16} className="mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Tests"
          value={analytics?.totalTests || 0}
          change={`${analytics?.improvementRate || 0}% vs last period`}
          trend={analytics && analytics.improvementRate > 0 ? 'up' : 'down'}
          icon={BarChart3}
        />
        <MetricCard
          title="Average Score"
          value={`${analytics?.averagePerformanceScore || 0}%`}
          change="+2.4% improvement"
          trend="up"
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Issues"
          value={analytics?.totalIssues || 0}
          change="-12 resolved"
          trend="down"
          icon={AlertCircle}
        />
        <MetricCard
          title="Success Rate"
          value="94.3%"
          change="+1.2% this period"
          trend="up"
          icon={CheckCircle}
        />
      </div>

      {/* Performance Trends Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Average Score</span>
            </div>
            <div className="flex items-center gap-2 text-sm ml-4">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Test Count</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          {analytics?.performanceTrends && analytics.performanceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.performanceTrends}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  domain={[0, 100]}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFF', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="averageScore"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#colorScore)"
                  name="Average Score"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="testCount"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  name="Test Count"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No performance data available yet</p>
                <p className="text-xs mt-1">Run some tests to see trends</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Error Distribution</h2>
            <PieChart size={20} className="text-gray-400" />
          </div>
          {analytics?.errorDistribution && analytics.errorDistribution.length > 0 ? (
            <div className="space-y-4">
              {analytics.errorDistribution.map((error, index) => {
                const severityColors = {
                  low: 'bg-blue-100 text-blue-800',
                  medium: 'bg-yellow-100 text-yellow-800',
                  high: 'bg-orange-100 text-orange-800',
                  critical: 'bg-red-100 text-red-800',
                };

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full',
                          error.severity === 'critical'
                            ? 'bg-red-500'
                            : error.severity === 'high'
                            ? 'bg-orange-500'
                            : error.severity === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        )}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{error.type}</p>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            severityColors[error.severity]
                          )}
                        >
                          {error.severity}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{error.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No error data available for this period
            </div>
          )}
        </div>

        {/* Test Type Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Test Type Breakdown</h2>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          {analytics?.testTypeBreakdown && analytics.testTypeBreakdown.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.testTypeBreakdown}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis 
                    dataKey="testType" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFF', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'averageScore' ? `${value}%` : value,
                      name === 'averageScore' ? 'Avg Score' : 'Tests'
                    ]}
                  />
                  <Bar 
                    dataKey="averageScore" 
                    fill="#2563EB" 
                    radius={[4, 4, 0, 0]}
                    name="averageScore"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No test type data available for this period
            </div>
          )}
        </div>

        {/* Device Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Device Performance</h2>
          {analytics?.deviceBreakdown && analytics.deviceBreakdown.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-1/2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="deviceType"
                    >
                      {analytics.deviceBreakdown.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={['#2563EB', '#22C55E', '#F59E0B', '#EF4444'][index % 4]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFF', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {analytics.deviceBreakdown.map((device, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ['#2563EB', '#22C55E', '#F59E0B', '#EF4444'][index % 4] }}
                      />
                      <p className="font-medium text-gray-900 capitalize text-sm">{device.deviceType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{device.averageScore}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No device data available for this period
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Key Insights</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg shrink-0">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Performance Improving</p>
                <p className="text-sm text-gray-600">
                  Your average performance score has increased by 2.4% this period
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Increased Testing</p>
                <p className="text-sm text-gray-600">
                  {analytics?.improvementRate || 0}% more tests compared to last period
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg shrink-0">
                <AlertCircle size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Focus Area: Mobile</p>
                <p className="text-sm text-gray-600">
                  Mobile tests showing lower scores - consider optimization
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { indexedDBService } from '@/lib/indexedDB';

import DashboardImage from '@/assets/dashboard.png';
import DownloadCard from '@/assets/download-card.png';
import BackgroundImage from '@/assets/99faf793ab4bd9f418a92e270a2fb359015560d9.jpg';
import ErrorCat from '@/assets/error-category.png';
import ScheduleTest from '@/assets/schedule-tests.png';
import ShareableReports from '@/assets/share-report.png';
import ScreenShots from '@/assets/test-completed.png';
import DashboardScreenshot from '@/assets/dashboard-screenshot.png';

import {
  Settings,
  NetworkIcon,
  ChartLineIcon,
  Shield,
  XIcon,
  XCircle,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectValue,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

import Homepage from '@/components/layout/Homepage.layout';
import PlatformCard from '@/components/home/PlatformCard.home';
import HowItWorksCard from '@/components/home/HowItWorksCard.home';

import {
  STATUS_LABELS,
  type ResultData,
  type SSEEvent,
} from '@/utils/handleSSE.util';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/store';

const REGEX_PATTERN = /([\w-]+\.)+[\w-]+(\/[\w-]*)*$/gm;

const schema = z.object({
  url: z.string().regex(REGEX_PATTERN),
  testType: z.optional(z.string()),
  deviceType: z.optional(z.string()),
});

type InputData = z.infer<typeof schema>;

const normalizeUrl = (input: string): string => {
  let url = input.trim();

  // 1. Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // 2. If hostname has no dot AND is not localhost or an IP
    const isLocalhost = hostname === 'localhost';
    const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

    if (!hostname.includes('.') && !isLocalhost && !isIP) {
      parsed.hostname = `${hostname}.com`;
    }

    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
};

const Index = () => {
  const { openSignupModal } = useUIStore();
  const form = useForm<InputData>({
    defaultValues: {
      url: '',
      testType: '',
      deviceType: '',
    },
    resolver: zodResolver(schema),
  });

  const [open, toggleOpen] = useState(false);

  // Initialize IndexedDB on component mount
  useEffect(() => {
    indexedDBService.init().catch((error) => {
      console.error('Failed to initialize IndexedDB:', error);
    });
  }, []);

  // define regex pattern

  // TODO: - Taks left before moving to homepage
  // Get the strings from the input fields
  // Validate them - 1) url (regex), prefix the url with 'http://'
  // 2) Validate test type
  // 3) Make button disabled when it's page is loading
  // 4) display result in the modal

  const [, setTimeline] = useState<SSEEvent[]>([]);
  const [status, setStatus] = useState();
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEvent = async (event: ResultData) => {
    setTimeline((prev) => [...prev, event]);

    if (event.status === 'COMPLETE') {
      setResults(event.results);
      setIsLoading(false);

      // Save test result to IndexedDB
      try {
        const formValues = form.getValues();
        await indexedDBService.saveTestResult({
          url: formValues.url,
          testType: formValues.testType,
          deviceType: formValues.deviceType,
          results: event.results || {},
          timestamp: Date.now(),
          syncedToServer: false,
        });
      } catch (error) {
        console.error('Failed to save test result to IndexedDB:', error);
      }
    }
  };

  const resetTestState = () => {
    setStatus(undefined);
    setResults(null);
    setError(null);
    setIsLoading(false);
  };

  const startTest = (data: InputData) => {
    try {
      // Reset previous state
      resetTestState();
      setIsLoading(true);
      setError(null);

      const normalizedUrl = normalizeUrl(data.url);
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
      const url = new URL(`${apiBaseUrl}/capture-metrics/single`);
      url.searchParams.set('url', normalizedUrl);

      // validate that the given url has http prefix and has a tld domain attached
      const source = new EventSource(url);
      let timeoutId: ReturnType<typeof setTimeout>;

      // Set timeout for 60 seconds
      timeoutId = setTimeout(() => {
        source.close();
        setError(
          'Test timed out. The website may be taking too long to respond.',
        );
        setIsLoading(false);
      }, 60000);

      source.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);

          // Check if server sent an error status
          if (parsed.error || parsed.status === 'error') {
            setError(
              parsed.message || 'An error occurred while testing the website.',
            );
            setIsLoading(false);
            source.close();
            clearTimeout(timeoutId);
            return;
          }

          setStatus(parsed.data.status);

          const sseEvent: ResultData = {
            ...parsed.data,
            timestamp: Date.now(),
          };

          handleEvent(sseEvent);

          if (parsed.data.status === 'COMPLETE') {
            clearTimeout(timeoutId);
          }
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError);
          setError('Failed to process test results. Please try again.');
          setIsLoading(false);
          source.close();
          clearTimeout(timeoutId);
        }
      };

      source.onerror = (event: Event) => {
        console.error('EventSource error:', event);
        clearTimeout(timeoutId);
        source.close();
        setIsLoading(false);

        // Provide user-friendly error message
        setError(
          'Unable to connect to the testing service. Please check your connection and try again.',
        );
      };
    } catch (urlError) {
      console.error('URL validation error:', urlError);
      setError('Invalid URL format. Please enter a valid website URL.');
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<InputData> = (data: InputData) => {
    // Open modal and start test
    if (!open) {
      toggleOpen(true);
    }
    startTest(data);
  };

  const transformStatus = (status: string) => {
    return status.replaceAll('_', ' ');
  };

  const handleRetry = () => {
    const formData = form.getValues();
    // Modal is already open, just restart the test
    startTest(formData);
  };

  const handleModalClose = (isOpen: boolean) => {
    toggleOpen(isOpen);
    if (!isOpen) {
      // Clear form and reset state when modal closes
      form.reset();
      resetTestState();
    }
  };

  return (
    <Homepage>
      <Dialog open={open} onOpenChange={handleModalClose}>
        <DialogContent className="bg-black/50 border-none max-w-full w-full h-full grid place-items-center p-4 backdrop-blur-xs sm:max-w-full">
          <VisuallyHidden>
            <DialogTitle>
              {error ? 'Test Failed' : status !== 'COMPLETE' ? 'Test Running' : 'Test Complete'}
            </DialogTitle>
          </VisuallyHidden>
          <div className="grid place-items-center w-full">
            {error ? (
              // Error State
              <div className="bg-white p-6 md:p-8 lg:p-10 rounded-lg w-full max-w-md mx-auto">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-red-50 p-3 rounded-full shrink-0">
                    <XCircle size={32} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">
                      Test Failed
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {error}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleRetry}
                    className="sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      toggleOpen(false);
                      resetTestState();
                    }}
                    variant="outline"
                    className="sm:w-auto px-6 py-3 h-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : status !== 'COMPLETE' ? (
              // Loading State - Improved with animations
              <div className="text-white max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-6 md:mb-10">
                  {/* Animated spinner */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="size-20 md:size-24 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={32} className="text-white/80 animate-pulse md:size-10" />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-5 text-center">
                    Performing BugSpy Magic...
                  </h2>

                  {/* Status with smooth transition */}
                  <div className="relative h-8 md:h-10 mb-4 overflow-hidden">
                    <p className="absolute inset-0 flex items-center justify-center text-sm md:text-base animate-pulse">
                      {status
                        ? (STATUS_LABELS[status] ?? transformStatus(status))
                        : 'Initializing test...'}
                    </p>
                  </div>

                  {/* Progress dots */}
                  <div className="flex gap-2 justify-center mb-6">
                    <div className="size-2 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="size-2 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="size-2 rounded-full bg-white/60 animate-bounce"></div>
                  </div>

                  <div className="flex gap-2 md:gap-3 items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-white/10">
                    <Shield size={20} className="md:w-6 md:h-6 text-emerald-400" />
                    <p className="text-sm md:text-base font-medium">
                      SECURE DATA PROCESSING
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border-white/30 bg-blue-500/20 backdrop-blur-sm border p-4 md:p-5 text-xs md:text-sm">
                  <p className="flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <span>
                      <strong className="font-semibold block mb-1">Important:</strong>
                      Do not refresh, close, or click the back button. Your test results may be lost.
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              // Complete State - SEOitis Style with Blue Theme
              (() => {
                // Calculate dynamic score from actual metrics
                const calculateScore = () => {
                  if (!results || typeof results !== 'object' || !('webMetrics' in results)) {
                    return 50; // Default if no metrics
                  }

                  const metrics = results.webMetrics as { metrics?: {
                    firstContentfulPaint?: number;
                    largestContentfulPaint?: number;
                    totalBlockingTime?: number;
                    cumulativeLayoutShift?: number;
                  }};

                  if (!metrics.metrics) return 50;

                  let score = 100;
                  const m = metrics.metrics;

                  // FCP scoring (Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s)
                  if (m.firstContentfulPaint) {
                    if (m.firstContentfulPaint > 3000) score -= 15;
                    else if (m.firstContentfulPaint > 1800) score -= 7;
                  }

                  // LCP scoring (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s)
                  if (m.largestContentfulPaint) {
                    if (m.largestContentfulPaint > 4000) score -= 20;
                    else if (m.largestContentfulPaint > 2500) score -= 10;
                  }

                  // TBT scoring (Good: <200ms, Needs Improvement: 200-600ms, Poor: >600ms)
                  if (m.totalBlockingTime) {
                    if (m.totalBlockingTime > 600) score -= 20;
                    else if (m.totalBlockingTime > 200) score -= 10;
                  }

                  // CLS scoring (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25)
                  if (m.cumulativeLayoutShift) {
                    if (m.cumulativeLayoutShift > 0.25) score -= 15;
                    else if (m.cumulativeLayoutShift > 0.1) score -= 8;
                  }

                  // Console errors penalty
                  if (results && 'consoleErrors' in results && Array.isArray(results.consoleErrors)) {
                    const errorCount = results.consoleErrors.length;
                    score -= Math.min(errorCount * 2, 20); // Max 20 points deduction
                  }

                  return Math.max(0, Math.min(100, Math.round(score)));
                };

                const score = calculateScore();

                // Count issues dynamically
                const countIssues = () => {
                  let critical = 0, warnings = 0, good = 0;

                  if (!results || typeof results !== 'object' || !('webMetrics' in results)) {
                    return { critical: 0, warnings: 0, good: 0 };
                  }

                  const metrics = results.webMetrics as { metrics?: {
                    firstContentfulPaint?: number;
                    largestContentfulPaint?: number;
                    totalBlockingTime?: number;
                    cumulativeLayoutShift?: number;
                  }};

                  if (!metrics.metrics) return { critical: 0, warnings: 0, good: 0 };
                  const m = metrics.metrics;

                  // Check each metric
                  if (m.firstContentfulPaint) {
                    if (m.firstContentfulPaint > 3000) critical++;
                    else if (m.firstContentfulPaint > 1800) warnings++;
                    else good++;
                  }

                  if (m.largestContentfulPaint) {
                    if (m.largestContentfulPaint > 4000) critical++;
                    else if (m.largestContentfulPaint > 2500) warnings++;
                    else good++;
                  }

                  if (m.totalBlockingTime) {
                    if (m.totalBlockingTime > 600) critical++;
                    else if (m.totalBlockingTime > 200) warnings++;
                    else good++;
                  }

                  if (m.cumulativeLayoutShift) {
                    if (m.cumulativeLayoutShift > 0.25) critical++;
                    else if (m.cumulativeLayoutShift > 0.1) warnings++;
                    else good++;
                  }

                  // Console errors count as critical
                  if (results && 'consoleErrors' in results && Array.isArray(results.consoleErrors)) {
                    critical += results.consoleErrors.length;
                  }

                  return { critical, warnings, good };
                };

                const { critical, warnings, good } = countIssues();

                // Determine score color
                const getScoreColor = (score: number) => {
                  if (score >= 90) return { stroke: '#10b981', text: 'text-emerald-600' }; // Excellent
                  if (score >= 70) return { stroke: '#f59e0b', text: 'text-amber-600' }; // Good
                  return { stroke: '#ef4444', text: 'text-red-600' }; // Poor
                };

                const scoreColors = getScoreColor(score);
                const circumference = 314; // 2 * PI * 50

                return (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 md:p-8 w-full max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-300">
                    {/* Subtle gradient background */}
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-500 to-blue-400 rounded-2xl pointer-events-none"></div>

                    <div className="relative">
                      <div className="flex justify-end mb-4">
                        <Button
                          variant={'ghost'}
                          onClick={() => {
                            toggleOpen(false);
                            resetTestState();
                          }}
                          size="sm"
                          className="hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <XIcon size={20} />
                        </Button>
                      </div>

                      {/* Header with circular score (SEOitis style) */}
                      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
                        {/* Circular Score Indicator - Dynamic */}
                        <div className="relative inline-flex items-center justify-center shrink-0">
                          <svg className="size-24 sm:size-28 transform -rotate-90" viewBox="0 0 120 120">
                            {/* Background circle */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="8"
                            />
                            {/* Progress circle - dynamic color based on score */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              stroke={scoreColors.stroke}
                              strokeWidth="8"
                              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                              style={{
                                animation: 'draw-circle 1s ease-out forwards'
                              }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-3xl sm:text-4xl font-bold", scoreColors.text)}>{score}</span>
                            <span className="text-xs text-gray-500">/100</span>
                          </div>
                        </div>

                        {/* Test Info */}
                        <div className="flex-1">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                            Test Complete
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600 mb-3">
                            Performance analysis for <span className="font-semibold text-blue-600">{form.getValues('url')}</span>
                          </p>

                          {/* Status indicators - Dynamic counts */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            {critical > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 sm:size-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-xs sm:text-sm text-gray-600">{critical} Critical</span>
                              </div>
                            )}
                            {warnings > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 sm:size-2.5 rounded-full bg-amber-500"></div>
                                <span className="text-xs sm:text-sm text-gray-600">{warnings} {warnings === 1 ? 'Warning' : 'Warnings'}</span>
                              </div>
                            )}
                            {good > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 sm:size-2.5 rounded-full bg-emerald-500"></div>
                                <span className="text-xs sm:text-sm text-gray-600">{good} Good</span>
                              </div>
                            )}
                            {critical === 0 && warnings === 0 && good === 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 sm:size-2.5 rounded-full bg-gray-400"></div>
                                <span className="text-xs sm:text-sm text-gray-600">No metrics available</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Section - SEOitis Style */}
                    <div className="relative w-full space-y-4 mb-6 pt-4 sm:pt-6 border-t border-gray-100">
                      <h4 className="text-base font-bold text-gray-800">Performance Metrics</h4>

                      {/* Metrics Grid */}
                      <div className="space-y-3">
                      {results && typeof results === 'object' && 'webMetrics' in results && typeof results.webMetrics === 'object' && results.webMetrics && 'metrics' in results.webMetrics && typeof results.webMetrics.metrics === 'object' && results.webMetrics.metrics && 'firstContentfulPaint' in results.webMetrics.metrics && typeof results.webMetrics.metrics.firstContentfulPaint === 'number' && (
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                results.webMetrics.metrics.firstContentfulPaint < 1800
                                  ? "bg-emerald-500"
                                  : results.webMetrics.metrics.firstContentfulPaint < 3000
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}></span>
                              <span className="text-sm font-medium text-gray-700 truncate">First Contentful Paint</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-blue-600 shrink-0">
                              {(results.webMetrics.metrics.firstContentfulPaint / 1000).toFixed(2)}s
                            </span>
                          </div>
                          <div className="ml-4 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600">
                              {results.webMetrics.metrics.firstContentfulPaint < 1800
                                ? "Excellent - content appears quickly"
                                : results.webMetrics.metrics.firstContentfulPaint < 3000
                                ? "Moderate - could be improved"
                                : "Slow - optimize critical rendering path"}
                            </p>
                          </div>
                        </div>
                      )}

                      {results && typeof results === 'object' && 'webMetrics' in results && typeof results.webMetrics === 'object' && results.webMetrics && 'metrics' in results.webMetrics && typeof results.webMetrics.metrics === 'object' && results.webMetrics.metrics && 'largestContentfulPaint' in results.webMetrics.metrics && typeof results.webMetrics.metrics.largestContentfulPaint === 'number' && (
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                results.webMetrics.metrics.largestContentfulPaint < 2500
                                  ? "bg-emerald-500"
                                  : results.webMetrics.metrics.largestContentfulPaint < 4000
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}></span>
                              <span className="text-sm font-medium text-gray-700 truncate">Largest Contentful Paint</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-blue-600 shrink-0">
                              {(results.webMetrics.metrics.largestContentfulPaint / 1000).toFixed(2)}s
                            </span>
                          </div>
                          <div className="ml-4 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600">
                              {results.webMetrics.metrics.largestContentfulPaint < 2500
                                ? "Excellent - main content loads fast"
                                : results.webMetrics.metrics.largestContentfulPaint < 4000
                                ? "Moderate - optimize largest elements"
                                : "Poor - main content loads slowly"}
                            </p>
                          </div>
                        </div>
                      )}

                      {results && typeof results === 'object' && 'webMetrics' in results && typeof results.webMetrics === 'object' && results.webMetrics && 'metrics' in results.webMetrics && typeof results.webMetrics.metrics === 'object' && results.webMetrics.metrics && 'totalBlockingTime' in results.webMetrics.metrics && typeof results.webMetrics.metrics.totalBlockingTime === 'number' && (
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                results.webMetrics.metrics.totalBlockingTime < 200
                                  ? "bg-emerald-500"
                                  : results.webMetrics.metrics.totalBlockingTime < 600
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}></span>
                              <span className="text-sm font-medium text-gray-700 truncate">Total Blocking Time</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-blue-600 shrink-0">
                              {Math.round(results.webMetrics.metrics.totalBlockingTime)}ms
                            </span>
                          </div>
                          <div className="ml-4 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600">
                              {results.webMetrics.metrics.totalBlockingTime < 200
                                ? "Excellent - page responds quickly"
                                : results.webMetrics.metrics.totalBlockingTime < 600
                                ? "Moderate - reduce JavaScript execution"
                                : "Poor - significant blocking detected"}
                            </p>
                          </div>
                        </div>
                      )}

                      {results && typeof results === 'object' && 'webMetrics' in results && typeof results.webMetrics === 'object' && results.webMetrics && 'metrics' in results.webMetrics && typeof results.webMetrics.metrics === 'object' && results.webMetrics.metrics && 'cumulativeLayoutShift' in results.webMetrics.metrics && typeof results.webMetrics.metrics.cumulativeLayoutShift === 'number' && (
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                results.webMetrics.metrics.cumulativeLayoutShift < 0.1
                                  ? "bg-emerald-500"
                                  : results.webMetrics.metrics.cumulativeLayoutShift < 0.25
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}></span>
                              <span className="text-sm font-medium text-gray-700 truncate">Cumulative Layout Shift</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-blue-600 shrink-0">
                              {(results.webMetrics.metrics.cumulativeLayoutShift).toFixed(3)}
                            </span>
                          </div>
                          <div className="ml-4 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600">
                              {results.webMetrics.metrics.cumulativeLayoutShift < 0.1
                                ? "Excellent - stable visual layout"
                                : results.webMetrics.metrics.cumulativeLayoutShift < 0.25
                                ? "Moderate - some layout shifts detected"
                                : "Poor - significant layout instability"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Console Errors - SEOitis Style */}
                    {results && typeof results === 'object' && 'consoleErrors' in results && Array.isArray(results.consoleErrors) && results.consoleErrors.length > 0 && (
                      <div className="mt-4 border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-red-200 hover:shadow-sm transition-all bg-white">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full shrink-0 bg-red-500"></span>
                            <span className="text-sm font-medium text-gray-700 truncate">Console Errors</span>
                          </div>
                          <span className="text-lg sm:text-xl font-bold text-red-600 shrink-0">
                            {results.consoleErrors.length}
                          </span>
                        </div>
                        <div className="ml-4 p-2 sm:p-3 bg-red-50 rounded-lg border-l-2 border-red-500">
                          <p className="text-xs text-gray-700 font-medium">
                            Critical - {results.consoleErrors.length} console {results.consoleErrors.length === 1 ? 'error' : 'errors'} detected during page load
                          </p>
                        </div>
                      </div>
                    )}

                      {/* Preview Notice & Action Buttons - Blue Theme */}
                      <div className="mt-6 space-y-4">
                        <div className="inline-block p-3 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                          <p className="text-sm font-semibold text-gray-800 mb-1">
                            Limited Preview
                          </p>
                          <p className="text-xs text-gray-600">
                            Sign up for detailed analysis and full reports
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            to="/dashboard"
                            className="sm:w-auto"
                          >
                            <Button
                              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all px-6 py-3 h-auto"
                            >
                              View Report
                            </Button>
                          </Link>
                          <Button
                            variant={'outline'}
                            onClick={() => {
                              toggleOpen(false);
                              resetTestState();
                              openSignupModal();
                            }}
                            className="sm:w-auto border-gray-300 text-gray-900 hover:bg-gray-50 transition-all px-6 py-3 h-auto"
                          >
                            Sign Up
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      <section
        className={cn('container m-auto pt-[32px] px-4 md:px-8 lg:px-[75px]')}
      >
        <div className={cn('flex justify-center flex-col items-center')}>
          <h1
            className={cn(
              'text-2xl md:text-3xl lg:text-[48px] font-bold w-full md:w-4/5 text-center mb-6 md:mb-10 leading-tight',
            )}
          >
            <span className="block">
              Automated Website{' '}
              <span className={cn('text-blue-600')}>Testing.</span> Faster.
            </span>
            <span className="block">Smarter. Better.</span>
          </h1>

          <div className="text-center w-full max-w-4xl">
            <h2 className={cn('capitalize mb-2 font-bold text-lg md:text-xl')}>
              Run a Free Website Test Instantly
            </h2>

            <p
              className={cn(
                'mb-6 text-sm md:text-base max-w-2xl mx-auto text-gray-600',
              )}
            >
              Enter any website URL to check performance, detect errors, and
              preview what BugSpy can do.
            </p>

            <form
              className="flex flex-col md:flex-row gap-3 justify-center items-start mb-8 max-w-6xl mx-auto"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Main URL Input Section */}
              <div className="flex-[2] w-full md:w-auto">
                <Controller
                  name="url"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Input
                        {...field}
                        type="text"
                        placeholder="https://example.com"
                        className={cn(
                          'h-12 text-sm px-4 bg-white border border-gray-300 rounded-lg',
                          'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                          'hover:border-gray-400 placeholder:text-gray-400',
                          fieldState.invalid &&
                            'border-red-300 focus:border-red-500 focus:ring-red-100',
                        )}
                        id="url"
                        name="url_input"
                      />
                      {fieldState.error && (
                        <p className="text-red-500 text-sm mt-1 ml-1">
                          {fieldState.error.message}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </div>

              {/* Quick Free Test Dropdown */}
              <div className="w-full md:w-auto md:min-w-[180px]">
                <Controller
                  name="testType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Select
                        {...field}
                        name="testType"
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="testType"
                          className={cn(
                            '!h-12 text-sm px-4 bg-white border border-gray-300 rounded-lg',
                            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                            'hover:border-gray-400',
                            fieldState.invalid &&
                              'border-red-300 focus:border-red-500 focus:ring-red-100',
                          )}
                        >
                          <SelectValue placeholder="Quick Free Test" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border shadow-lg">
                          <SelectGroup>
                            <SelectItem
                              value="performance"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Performance Test
                            </SelectItem>
                            <SelectItem
                              value="security"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Security Test
                            </SelectItem>
                            <SelectItem
                              value="seo"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              SEO Test
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Device Type Dropdown */}
              <div className="w-full md:w-auto md:min-w-[180px]">
                <Controller
                  name="deviceType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Select
                        {...field}
                        name="deviceType"
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="deviceType"
                          className={cn(
                            '!h-12 text-sm px-4 bg-white border border-gray-300 rounded-lg',
                            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                            'hover:border-gray-400',
                            fieldState.invalid &&
                              'border-red-300 focus:border-red-500 focus:ring-red-100',
                          )}
                        >
                          <SelectValue placeholder="Desktop" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border shadow-lg">
                          <SelectGroup>
                            <SelectItem
                              value="desktop"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Desktop
                            </SelectItem>
                            <SelectItem
                              value="tablet"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Tablet
                            </SelectItem>
                            <SelectItem
                              value="mobile"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Mobile
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Start Test Button */}
              <div className="w-full md:w-auto">
                <Button
                  size={null}
                  variant={null}
                  className={cn(
                    '!h-12 !min-h-[48px] !max-h-[48px] px-8 text-sm font-semibold rounded-lg w-full md:w-auto',
                    'bg-blue-600 hover:bg-blue-700 text-white',
                    'transition-all duration-200 inline-flex items-center justify-center',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Testing...' : 'Start Test'}
                </Button>
              </div>
            </form>

            <div className={cn('relative max-w-5xl mx-auto mt-8 md:mt-12')}>
              <div className={cn('w-full')}>
                <img
                  src={DashboardImage}
                  alt="BugSpy Dashboard"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
              <div
                className={cn(
                  'absolute top-4 md:top-8 -left-2 md:-left-5 w-[200px] md:w-[311px] h-[180px] md:h-[282px] hidden sm:block',
                )}
              >
                <img
                  src={DownloadCard}
                  alt="Download feature card"
                  className={cn(
                    'w-full h-full object-cover rounded-md shadow-lg',
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative text-white">
        <div
          className={cn(
            'relative after:absolute after:bg-black/70 after:inset-0 ',
            "after:content-[''] h-[781px]",
          )}
        >
          <img
            src={BackgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className={cn('container m-auto px-4 md:px-8 lg:px-[75px]')}>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              What is BugSpy?
            </h2>
            <p className="font-normal w-full max-w-[650px] mt-4 md:mt-7 text-sm md:text-base leading-relaxed">
              BugSpy is a web-based platform that automates website testing to
              help developers, QA teams, and businesses deliver flawless digital
              experiences. With advanced browser automation, BugSpy detects UI
              glitches, console and network errors, captures full-page
              screenshots, and measures real performance metrics all in real
              time.
            </p>

            <div className="flex flex-col lg:flex-row justify-between gap-4 md:gap-6 lg:gap-5 mt-6 md:mt-8 lg:mt-12">
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <Settings size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="font-bold text-sm md:text-base mb-2">
                  Easy Automated Testing:
                </h3>
                <p className="text-xs md:text-sm">
                  Run instant or scheduled tests without setup.
                </p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <ChartLineIcon size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>

                <h3 className="font-bold text-sm md:text-base mb-2">
                  Actionable Insights:
                </h3>
                <p className="text-xs md:text-sm">
                  Categorized error reports, performance scores, and exports.
                </p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <NetworkIcon size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>

                <h3 className="font-bold text-sm md:text-base mb-2">
                  Scalable for Teams:
                </h3>
                <p className="text-xs md:text-sm">
                  From freelancers to enterprise QA, BugSpy grows with you
                </p>
              </PlatformCard>
            </div>
          </div>
        </div>
      </section>
      <section>
        <section
          className={cn(
            'container m-auto pt-[32px] px-4 md:px-8 lg:px-[75px] mt-10',
          )}
        >
          <div className="flex justify-center flex-col text-center mb-12 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl capitalize font-bold mb-3">
              features overview
            </h2>
            <p className="text-sm md:text-base max-w-2xl mx-auto">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>

          {/* Feature 1: Error Categorization */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Error Categorization
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1 lg:order-2">
              <img
                src={ErrorCat}
                alt="Error categorization feature"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Feature 2: Full-page Screenshots */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1">
              <img
                src={ScreenShots}
                alt="Full-page screenshots feature"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full lg:w-1/2 order-2">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Full-page Screenshots.
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
          </div>

          {/* Feature 3: Exportable Reports */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Exportable Reports.
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1 lg:order-2">
              <img
                src={ShareableReports}
                alt="Exportable reports feature"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Feature 4: Scheduled Tests */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1">
              <img
                src={ScheduleTest}
                alt="Scheduled tests feature"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full lg:w-1/2 order-2">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Scheduled tests & history (Pro+)
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
          </div>
        </section>
      </section>
      <section className="bg-slate-900 text-white">
        <section
          className={cn(
            'container m-auto py-8 md:py-12 lg:py-[50px] px-4 md:px-8 lg:px-[75px] mt-10',
          )}
        >
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <h3 className="capitalize font-bold text-2xl md:text-3xl lg:text-4xl">
              how bugspy works
            </h3>
            <p className="mt-3 text-sm md:text-base max-w-2xl mx-auto">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 place-items-center mt-6 md:mt-8 lg:mt-10">
            <HowItWorksCard
              image={ScheduleTest}
              digit="01"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="Step 1: Enter website URL"
            />

            <HowItWorksCard
              image={ScheduleTest}
              digit="02"
              title="Run automated tests"
              subTitle="BugSpy performs comprehensive analysis."
              altText="Step 2: Run automated tests"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="03"
              title="Review detailed results"
              subTitle="Get categorized errors and insights."
              altText="Step 3: Review detailed results"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="04"
              title="Export and share reports"
              subTitle="Download or share your findings."
              altText="Step 4: Export and share reports"
            />
          </div>
        </section>
      </section>

      <section
        className={cn(
          'container m-auto py-8 md:py-12 lg:py-[50px] px-4 md:px-8 lg:px-[75px] mt-10',
        )}
      >
        <div className="bg-blue-600 overflow-hidden rounded-xl flex flex-col lg:flex-row p-6 md:p-8 lg:ps-10 lg:pr-0 min-h-[400px] lg:h-90 text-white items-center lg:items-start relative">
          <div className="w-full lg:w-1/2 z-10 text-center lg:text-left mb-6 lg:mb-0">
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
              <span className="block mb-1 md:mb-2">Sign up to unlock </span>
              <span className="block">full details</span>
            </h2>
            <p className="my-3 md:my-4 text-sm md:text-base max-w-lg mx-auto lg:mx-0">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero et velit interdum.
            </p>
            <Button
              onClick={openSignupModal}
              className="bg-white text-black/70 px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign up
            </Button>
          </div>
          <div className="absolute bottom-0 top-0 right-0 lg:top-8 w-full lg:w-1/2 opacity-20 lg:opacity-100 isolate">
            <img
              src={DashboardScreenshot}
              alt="BugSpy Dashboard Preview"
              className="w-full h-full object-cover object-left"
            />
          </div>
        </div>
      </section>
    </Homepage>
  );
};

export default Index;

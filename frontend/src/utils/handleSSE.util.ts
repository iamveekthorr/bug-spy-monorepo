export type TestStatus =
  | 'OBSERVABLE_CREATED'
  | 'STARTING'
  | 'PAGE_ACQUIRED'
  | 'DEVICE_CONFIGURED'
  | 'NAVIGATION_COMPLETE'
  | 'METRICS_START'
  | 'PERFORMANCE_METRICS'
  | 'NETWORK_METRICS'
  | 'VITALS_METRICS'
  | 'METRICS_COMPLETE'
  | 'SCREENSHOT_COMPLETE'
  | 'CONSOLE_ERRORS_COMPLETE'
  | 'COMPLETE';

export interface SSEEvent {
  status: TestStatus;
  message?: string;
  progress?: number;
  data?: any;
  timestamp: number;
}

export const STATUS_LABELS: Record<TestStatus, string> = {
  OBSERVABLE_CREATED: 'Initializing test',
  STARTING: 'Starting test run',
  PAGE_ACQUIRED: 'Browser page acquired',
  DEVICE_CONFIGURED: 'Device configured',
  NAVIGATION_COMPLETE: 'Page loaded',
  METRICS_START: 'Collecting metrics',
  PERFORMANCE_METRICS: 'Performance metrics collected',
  NETWORK_METRICS: 'Network analysis completed',
  VITALS_METRICS: 'Web vitals captured',
  METRICS_COMPLETE: 'Metrics finalized',
  SCREENSHOT_COMPLETE: 'Screenshots captured',
  CONSOLE_ERRORS_COMPLETE: 'Console errors analyzed',
  COMPLETE: 'Test completed',
};

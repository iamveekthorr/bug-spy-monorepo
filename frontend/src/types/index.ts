// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string; // Required field - used in DashboardLayout
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise'; // Required field - used in DashboardLayout
  createdAt: string;
  updatedAt?: string;
  emailVerified?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Test and Report Types
export interface TestResult {
  id: string;
  url: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  testType: 'performance' | 'ui' | 'accessibility' | 'seo' | 'full';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  results?: TestResultData;
}

export interface TestResultData {
  performanceMetrics: PerformanceMetrics;
  errors: ErrorReport[];
  screenshots: Screenshot[];
  networkRequests: NetworkRequest[];
  consoleMessages: ConsoleMessage[];
  accessibilityIssues: AccessibilityIssue[];
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
  performanceScore: number;
  opportunities: Opportunity[];
}

export interface ErrorReport {
  id: string;
  type: 'console' | 'network' | 'javascript' | 'ui';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace?: string;
  timestamp: number;
}

export interface Screenshot {
  id: string;
  url: string;
  type: 'full-page' | 'viewport' | 'element';
  timestamp: number;
  deviceType: string;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  responseTime: number;
  size: number;
  type: string;
  failed: boolean;
}

export interface ConsoleMessage {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  source?: string;
}

export interface AccessibilityIssue {
  id: string;
  type: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  element: string;
  description: string;
  help: string;
  helpUrl: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  savings: number;
  priority: 'low' | 'medium' | 'high';
}

// Dashboard and Analytics Types
export interface DashboardStats {
  totalTests: number;
  testsThisMonth: number;
  averageScore: number;
  criticalIssues: number;
  performanceTrend: {
    thisWeek: number;
    thisMonth: number;
    lastThreeMonths: number;
  };
  testsByStatus: {
    completed: number;
    failed: number;
    running: number;
  };
  testsByType: {
    performance: number;
    screenshot: number;
    cookie: number;
  };
}

export interface TestSchedule {
  id: string;
  name: string;
  url: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  testType: string;
  deviceType: string;
  isActive: boolean;
  nextRun: string;
  lastRun?: string;
}

// UI Component Types
export interface NavItem {
  name: string;
  href: string;
  icon: string;
  current?: boolean;
  children?: NavItem[];
}

export interface FilterOptions {
  status: string[];
  testType: string[];
  deviceType: string[];
  dateRange: {
    from: string;
    to: string;
  };
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

export interface TestConfigFormData {
  url: string;
  testType: string;
  deviceType: string;
  schedule?: {
    frequency: string;
    time: string;
  };
}

export interface UserSettingsFormData {
  name: string;
  email: string;
  notifications: {
    email: boolean;
    browser: boolean;
    testComplete: boolean;
    criticalIssues: boolean;
  };
  preferences: {
    defaultTestType: string;
    defaultDevice: string;
    autoScreenshots: boolean;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
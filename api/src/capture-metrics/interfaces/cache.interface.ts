import { CreateCaptureData } from '~/dto/create-capture-data';
import { ConsoleErrorsResult } from '../services/console-errors.service';

export interface CachedTestResult {
  captureData: CreateCaptureData;
  results: TestResults;
  timestamp: number;
}

export interface TestResults {
  url: string;
  deviceType: string;
  testType: string;
  testId?: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'running';
  cookieHandling: CookieHandlingResult | null;
  webMetrics: WebMetricsResult | null;
  screenshots: ScreenshotResult | null;
  consoleErrors: ConsoleErrorsResult | null;
}

export interface CookieHandlingResult {
  success: boolean;
  method: string;
  text: string | null;
  message: string | null;
}

export interface WebMetricsResult {
  performanceMetrics?: PerformanceMetrics;
  networkMetrics?: NetworkMetrics;
  vitalsMetrics?: VitalsMetrics;
  // Lighthouse scores
  performanceScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  seoScore?: number;
  lighthouseScores?: LighthouseScores;
  lighthouseAudits?: AuditDetail[];
  // SEO Analysis
  seoAnalysis?: SeoAnalysisResult;
}

export interface LighthouseScores {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  source: 'lighthouse' | 'fallback' | 'error';
}

export interface AuditDetail {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  scoreDisplayMode?: string;
}

export interface SeoAnalysisResult {
  score: number;
  metaTags: any;
  headings: any;
  content: any;
  technical: any;
  structuredData: any;
  links: any;
  mobile: any;
  recommendations: SeoRecommendation[];
  issues: SeoIssue[];
}

export interface SeoRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SeoIssue {
  source: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  domContentLoaded: number;
  loadComplete: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  totalTransferSize: number;
  resourceBreakdown: Record<string, any>;
}

export interface VitalsMetrics {
  CLS: number;
  FID: number;
  LCP: number;
}

export interface ScreenshotResult {
  frameCount: number;
  deviceType: string;
  screenshots: string[]; // Array of S3 URLs
  message: string;
}

export interface SaveTestRequest {
  testId: string;
}

export interface SaveTestResponse {
  message: string;
  savedTestId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

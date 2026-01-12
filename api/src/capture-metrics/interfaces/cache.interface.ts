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

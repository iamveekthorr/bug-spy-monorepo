// Use string type for DeviceType since Playwright's devices keyof resolves to string
// Validation will be handled at runtime by the custom validator
export declare global {
  export type DeviceType = string;

  export interface Window {
    metrics: {
      fcp: number | null;
      lcp: number | null;
      cls: number;
      fid: number | null;
      ttfb: number | null;
      loadEventStart: number | null;
      loadEventEnd: number | null;
    };
    metricsReady: boolean;
    loadEventFired: boolean;
  }
  export interface TestOptions {
    maxTimeout?: number;
    navigationTimeout?: number;
    retryAttempts?: number;
    blockedDomains?: string[];
    enableScreenshots?: boolean;
    enableCookies?: boolean;
    deviceType?: DeviceType;
    networkType?: 'fast-3g' | '3g' | '4g' | '5g' | 'wifi' | 'offline' | 'none';
    screenshotOptions?: ScreenshotOptions;
    cookieOptions?: CookieOptions;
    testType: string;
  }

  export interface CookieOptions {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    customSelectors?: string[];
  }

  export interface NavigationResult {
    status: string | number;
    url: string;
    attempt: number;
  }

  export interface RequestMetric {
    url: string;
    method: string;
    resourceType: string;
    startTime: number;
    status?: number;
    endTime?: number;
    duration?: number;
    size?: number; // Size in bytes
  }

  // Legacy PerformanceMetrics - keeping for backward compatibility
  export interface LegacyPerformanceMetrics {
    startTime: number;
    navigationStart: number | null;
    domContentLoaded: number | null;
    loadComplete: number | null;
    requests: RequestMetric[];
    errors: ErrorMetric[];
  }

  export interface WebVitals {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    fcp?: number; // First Contentful Paint
    ttfb?: number; // Time to First Byte
    error?: string;
  }

  export interface ResourceSummary {
    byType: Record<string, ResourceTypeStats>;
    byDomain: Record<string, DomainStats>;
    totalSize: number;
    totalDuration: number;
  }

  export interface ResourceTypeStats {
    count: number;
    totalSize: number;
    averageDuration: number;
    successRate: number;
  }

  export interface DomainStats {
    count: number;
    totalSize: number;
    averageDuration: number;
    successRate: number;
  }

  export interface TimingMetrics {
    totalDuration: number;
    startTime: number;
    endTime: number;
    navigationTiming?: PerformanceNavigationTiming;
    paintTiming?: Record<string, number>;
    resourceTiming?: PerformanceResourceTiming[];
  }

  export interface CollectedMetrics {
    navigation: NavigationResult;
    timing: TimingMetrics;
    requests: {
      total: number;
      successful: number;
      failed: number;
      details: RequestMetric[];
    };
    errors: ErrorMetric[];
    performance: PerformanceBrowserMetrics;
    webVitals: WebVitals;
    resourceSummary: ResourceSummary;
    pageInfo: PageInfo;
    testMetrics?: {
      network?: string;
      url?: string;
      testType?: string;
    };
  }

  export interface ErrorMetric {
    type: string;
    message: string;
    timestamp: number;
  }

  export interface PerformanceBrowserMetrics {
    navigation?: PerformanceNavigationTiming;
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    timeOrigin?: number;
    now?: number;
  }

  export interface PageInfo {
    title: string;
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
    cookies: Array<{ name: string; value: string; domain: string }>;
  }

  export interface ScreenshotResult {
    success: boolean;
    screenshots: string[];
    duration: number;
    totalFrames: number;
    error?: string;
    averageInterval?: number;
    adaptiveMode?: boolean;
    eventCapture?: boolean;
  }

  export interface CookieHandlingResult {
    success: boolean;
    method: 'click' | 'programmatic' | 'none';
    selector?: string;
    attemptsCount: number;
    message?: string;
    error?: string;
  }

  // Web Metrics Types
  export interface WebMetrics {
    performanceMetrics: PerformanceMetrics;
    networkMetrics: NetworkMetrics;
    vitalsMetrics: VitalsMetrics;
    testInfo: {
      testId: string;
      url: string;
      location: string;
      browser: string;
      device: string;
      connection: string;
      testTime: number;
    };
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
      savings: number;
    }>;
    diagnostics: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
    }>;
  }

  export interface PerformanceMetrics {
    // Core Web Vitals
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    interactionToNextPaint: number;

    // Loading Performance
    timeToFirstByte: number;
    firstPaint: number;
    domContentLoaded: number;
    loadComplete: number;
    timeToInteractive: number;
    totalBlockingTime: number;
    speedIndex: number;

    // Visual Progress
    visuallyComplete: number;
    lastVisualChange: number;
    renderStart: number;

    // Document Timing
    domInteractive: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;

    // Connection & Response
    connectStart: number;
    connectEnd: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;

    // Performance Scores (0-100)
    performanceScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    seoScore: number;
  }

  export interface ResourceDetail {
    url: string;
    type: string;
    size: number;
    transferSize: number;
    encodedSize: number;
    duration: number;
    status?: number;
    priority?: string;
    protocol?: string;
    mimeType?: string;
    fromCache: boolean;
    timing: {
      blocked: number;
      dns: number;
      connect: number;
      ssl: number;
      send: number;
      wait: number;
      receive: number;
    };
  }

  export interface NetworkMetrics {
    totalRequests: number;
    totalBytes: number;
    totalTime: number;
    resourceBreakdown: {
      documents: ResourceDetail[];
      stylesheets: ResourceDetail[];
      scripts: ResourceDetail[];
      images: ResourceDetail[];
      fonts: ResourceDetail[];
      other: ResourceDetail[];
    };
    summary: {
      documents: number;
      stylesheets: number;
      scripts: number;
      images: number;
      fonts: number;
      other: number;
    };
    // WebPageTest-style metrics
    bytesIn: number;
    bytesOut: number;
    connections: number;
    requests: {
      html: number;
      js: number;
      css: number;
      image: number;
      font: number;
      video: number;
      other: number;
    };
    compression: {
      gzip: number;
      brotli: number;
      none: number;
    };
    caching: {
      cached: number;
      notCached: number;
    };
    protocols: {
      http1: number;
      http2: number;
      http3: number;
    };
  }

  export interface VitalsMetrics {
    domContentLoaded: number;
    load: number;
    firstPaint: number;
    navigationStart: number;
  }

  // Type definitions for Layout Shift API
  export interface LayoutShiftEntry extends PerformanceEntry {
    value: number;
    hadRecentInput: boolean;
  }
}

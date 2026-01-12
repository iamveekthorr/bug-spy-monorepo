/**
 * WebPageTest-compatible metrics interface
 * Only includes metrics that WebPageTest.org actually collects
 */
export interface WebPageTestMetrics {
  // Core Web Vitals (Google's key metrics)
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  tbt: number; // Total Blocking Time

  // Load Timing Metrics
  startRender: number; // When first visual change happens
  speedIndex: number; // How quickly content appears
  loadTime: number; // Document complete (onLoad event)
  fullyLoaded: number; // All requests complete

  // Interactivity Metrics
  timeToInteractive: number; // When page becomes interactive
  maxFID: number; // Maximum First Input Delay

  // Performance Timing (Navigation API)
  dnsLookup: number; // DNS resolution time
  connectTime: number; // TCP connection time
  sslTime: number; // SSL handshake time
  requestTime: number; // Request duration
  responseTime: number; // Response duration

  // Page Info
  url: string;
  title: string;
  status: number;

  // Basic Request Stats
  requests: {
    total: number;
    html: number;
    js: number;
    css: number;
    images: number;
    fonts: number;
    other: number;
  };

  // Basic Size Stats
  bytesIn: {
    total: number;
    html: number;
    js: number;
    css: number;
    images: number;
    fonts: number;
    other: number;
  };

  // Test metadata
  testId: string;
  timestamp: string;
  location: string;
  device: string;
  network: string;
}

export interface WebPageTestResult {
  success: boolean;
  metrics?: WebPageTestMetrics;
  screenshots?: string[];
  error?: string;
  duration: number;
}

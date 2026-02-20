/**
 * Capture Configuration Constants
 *
 * Centralized configuration for all capture-related operations.
 * Extracted from scattered magic numbers throughout the codebase.
 */

/**
 * Browser Pool Configuration
 */
export const BROWSER_POOL_CONFIG = {
  MAX_CONCURRENT_PAGES: 5,
  IDLE_TIMEOUT_MS: 0, // Disabled for now
  IDLE_CHECK_INTERVAL_MS: 60000, // 1 minute
  PAGE_CLOSE_TIMEOUT_MS: 3000,
  BROWSER_LAUNCH_TIMEOUT_MS: 30000,
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  TTL_MS: 7200000, // 2 hours
  KEY_PREFIX: 'test-result:',
} as const;

/**
 * Request Timeout Configuration
 */
export const REQUEST_TIMEOUT_CONFIG = {
  PERFORMANCE_TEST_MS: 30000, // 30 seconds
  PERFORMANCE_TEST_EXTENDED_MS: 45000, // 45 seconds for slower operations
  SCREENSHOT_INTERVAL_MS: 300, // 300ms between progressive screenshots
  NETWORK_IDLE_TIME_MS: 500, // 500ms of network silence
  PAGE_CLOSE_FORCE_TIMEOUT_MS: 5000, // 5 seconds max for force close
  CANCELLATION_CLOSE_TIMEOUT_MS: 3000, // 3 seconds for client cancellation
} as const;

/**
 * Screenshot Configuration
 */
export const SCREENSHOT_CONFIG = {
  CAPTURE_INTERVAL_MS: 300, // Capture every 300ms during page load
  MAX_SCREENSHOTS: 20, // Maximum screenshots per capture
  QUALITY: 80, // JPEG quality (0-100)
  TYPE: 'jpeg' as const, // Image format
  FULL_PAGE: false, // Capture only viewport
} as const;

/**
 * Cookie Detection Configuration
 */
export const COOKIE_CONFIG = {
  DETECTION_TIMEOUT_MS: 6000, // 6 seconds to detect cookie banners
  WAIT_AFTER_CLICK_MS: 1000, // Wait 1 second after clicking cookie button
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  MAX_CONCURRENT_TESTS_PER_IP: 3,
  REQUEST_WINDOW_MS: 60000, // 1 minute window
  MAX_REQUESTS_PER_WINDOW: 30, // 30 requests per minute per IP
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  MAX_NAVIGATION_RETRIES: 2,
  MAX_SCREENSHOT_RETRIES: 3,
  BACKOFF_MULTIPLIER: 1.5,
  INITIAL_RETRY_DELAY_MS: 1000,
} as const;

/**
 * Performance Metrics Configuration
 */
export const METRICS_CONFIG = {
  COLLECT_RESOURCE_TIMING: true,
  COLLECT_NAVIGATION_TIMING: true,
  COLLECT_CORE_WEB_VITALS: true,
  COLLECT_PAINT_TIMING: true,
  MAX_RESOURCE_ENTRIES: 500, // Limit resource timing entries
} as const;

/**
 * Device Viewport Configurations
 */
export const DEVICE_VIEWPORTS = {
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
} as const;

/**
 * User Agent Strings
 */
export const USER_AGENTS = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  mobile:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  tablet:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
} as const;

/**
 * Environment-specific Configuration
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    verboseLogging: true,
    enableDebug: true,
    timeoutMultiplier: 0.8, // Faster timeouts in dev
  },
  staging: {
    verboseLogging: true,
    enableDebug: false,
    timeoutMultiplier: 1.0,
  },
  production: {
    verboseLogging: false,
    enableDebug: false,
    timeoutMultiplier: 1.3, // More conservative in production
  },
} as const;

/**
 * Helper to get environment-specific config
 */
export function getEnvironmentConfig() {
  const env = (process.env.NODE_ENV || 'development') as keyof typeof ENVIRONMENT_CONFIG;
  return ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
}

/**
 * Helper to check if running in cloud environment
 */
export function isCloudEnvironment(): boolean {
  return Boolean(process.env.RENDER || process.env.HEROKU || process.env.AWS_REGION);
}

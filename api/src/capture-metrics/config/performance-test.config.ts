export interface PerformanceTestConfig {
  screenshots: {
    enabled: boolean;
    interval: number;
    maxDuration: number;
    maxFrames: number;
    format: 'png' | 'jpeg';
    quality: number;
    outputDir: string;
  };
  timeouts: {
    navigation: number;
    pageLoad: number;
    maxTest: number;
  };
  browser: {
    headless: boolean;
    args: string[];
  };
  network: {
    throttling: {
      '3g': NetworkThrottling;
      '4g': NetworkThrottling;
      '5g': NetworkThrottling;
      wifi: NetworkThrottling;
      none: NetworkThrottling;
    };
  };
  validation: {
    maxUrlLength: number;
    allowedProtocols: string[];
    blockedDomains: string[];
  };
  rateLimiting: {
    maxConcurrentTests: number;
    maxRequestsPerMinute: number;
    cleanupInterval: number;
  };
}

interface NetworkThrottling {
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
  offline: boolean;
}

export const PERFORMANCE_TEST_CONFIG: PerformanceTestConfig = {
  screenshots: {
    enabled: true,
    interval: 500, // 500ms between screenshots
    maxDuration: 10000, // 10 seconds max
    maxFrames: 15, // Maximum 15 screenshots
    format: 'jpeg', // Smaller file size
    quality: 75, // Good quality/speed balance
    outputDir: './screenshots',
  },
  timeouts: {
    navigation: 10000, // 10s navigation timeout
    pageLoad: 5000, // 5s page load timeout
    maxTest: 15000, // 15s maximum test duration
  },
  browser: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-client-side-phishing-detection',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-plugins',
      '--no-first-run',
      '--no-default-browser-check',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
    ],
  },
  network: {
    throttling: {
      '3g': {
        downloadThroughput: (400 * 1024) / 8, // 400 Kbps
        uploadThroughput: (400 * 1024) / 8, // 400 Kbps
        latency: 200, // 200ms
        offline: false,
      },
      '4g': {
        downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
        uploadThroughput: (3 * 1024 * 1024) / 8, // 3 Mbps
        latency: 20, // 20ms
        offline: false,
      },
      '5g': {
        downloadThroughput: (20 * 1024 * 1024) / 8, // 20 Mbps
        uploadThroughput: (10 * 1024 * 1024) / 8, // 10 Mbps
        latency: 10, // 10ms
        offline: false,
      },
      wifi: {
        downloadThroughput: (30 * 1024 * 1024) / 8, // 30 Mbps
        uploadThroughput: (15 * 1024 * 1024) / 8, // 15 Mbps
        latency: 5, // 5ms
        offline: false,
      },
      none: {
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
        offline: false,
      },
    },
  },
  validation: {
    maxUrlLength: 2000,
    allowedProtocols: ['http:', 'https:'],
    blockedDomains: ['localhost', '127.0.0.1', '0.0.0.0'],
  },
  rateLimiting: {
    maxConcurrentTests: 5,
    maxRequestsPerMinute: 60,
    cleanupInterval: 300000, // 5 minutes
  },
};

// Global Jest setup for timer management and cleanup
// This helps prevent memory leaks and "worker process failed to exit gracefully" errors

// Mock fs for Puppeteer configuration loading
// This needs to be comprehensive to handle both CommonJS and ES module imports
const actualFs = jest.requireActual('fs');

// Create a mock statSync that works with cosmiconfig
const mockStatSync = jest.fn((path) => {
  try {
    // Try to use actual fs for real file operations when possible
    return actualFs.statSync(path);
  } catch (error) {
    // For non-existent files, return a mock stats object
    return {
      isDirectory: () => false,
      isFile: () => true,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false,
    };
  }
});

jest.mock('fs', () => {
  const mockFs = {
    ...actualFs,
    statSync: mockStatSync,
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn(),
      stat: jest.fn(),
    },
  };
  
  // Handle both CommonJS and ES module default exports
  mockFs.default = mockFs;
  
  return mockFs;
});

// Set timeout for all tests (10 seconds) - faster failure for hanging tests
jest.setTimeout(10000);

// Force exit after tests complete
process.env.FORCE_COLOR = '0'; // Disable colors for CI
process.env.CI = 'true'; // Force CI behavior

// Global cleanup after each test
afterEach(() => {
  // Clear all timers to prevent memory leaks
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global setup to handle uncaught exceptions
beforeAll(() => {
  // Suppress console warnings during tests for cleaner output
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Only show warnings that aren't related to Jest timers
    if (!args[0]?.includes?.('fake timers') && !args[0]?.includes?.('act()')) {
      originalWarn(...args);
    }
  };
});

// Ensure all async operations complete and force cleanup
afterAll(async () => {
  // Clear all active timers and handles
  jest.clearAllTimers();
  
  // Small delay to let any pending async operations complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear all active handles
  const activeHandles = process._getActiveHandles?.() || [];
  activeHandles.forEach((handle) => {
    if (handle && typeof handle.unref === 'function') {
      handle.unref();
    }
  });
  
  const activeRequests = process._getActiveRequests?.() || [];
  activeRequests.forEach((request) => {
    if (request && typeof request.destroy === 'function') {
      request.destroy();
    }
  });
});
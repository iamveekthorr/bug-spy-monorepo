import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { Browser } from 'puppeteer';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let mockBrowser: jest.Mocked<Browser>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlerService],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);

    // Mock browser
    mockBrowser = {
      close: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;
  });

  describe('handleError', () => {
    it('should categorize navigation errors correctly', () => {
      const navError = new Error('Navigation timeout');
      const result = service.handleError(navError, {
        url: 'https://example.com',
        testId: 'test-123',
        step: 'navigation',
      });

      expect(result.type).toBe('navigation');
      expect(result.code).toBe('NAVIGATION_ERROR');
      expect(result.message).toContain('Navigation failed');
      expect(result.url).toBe('https://example.com');
      expect(result.testId).toBe('test-123');
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Operation timeout occurred');
      const result = service.handleError(timeoutError, {
        url: 'https://example.com',
        testId: 'test-123',
      });

      expect(result.type).toBe('timeout');
      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.message).toContain('Operation timeout occurred');
    });

    it('should categorize browser errors correctly', () => {
      const browserError = new Error('chromium process crashed');
      const result = service.handleError(browserError, {
        testId: 'test-123',
      });

      expect(result.type).toBe('browser');
      expect(result.code).toBe('BROWSER_ERROR');
      expect(result.message).toContain('Browser error');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid URL format');
      const result = service.handleError(validationError, {
        testId: 'test-123',
      });

      expect(result.type).toBe('validation');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Validation error');
    });

    it('should default to system error for unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      const result = service.handleError(unknownError, {
        testId: 'test-123',
      });

      expect(result.type).toBe('system');
      expect(result.code).toBe('SYSTEM_ERROR');
      expect(result.message).toBe('Something went wrong');
    });

    it('should include timestamp in error result', () => {
      const error = new Error('Test error');
      const result = service.handleError(error, { testId: 'test-123' });

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeCloseTo(Date.now(), -3);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const result = service.validateUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid protocols', () => {
      const result = service.validateUrl('ftp://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });

    it('should reject blocked domains', () => {
      const blockedUrls = [
        'https://localhost:3000',
        'http://127.0.0.1',
        'https://0.0.0.0',
      ];

      blockedUrls.forEach((url) => {
        const result = service.validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Local/internal domains are not allowed');
      });
    });

    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const result = service.validateUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL is too long (max 2000 characters)');
    });

    it('should reject malformed URLs', () => {
      const result = service.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });

  describe('launchBrowserWithRetry', () => {
    it('should launch browser successfully on first try', async () => {
      const mockLaunchFn = jest.fn().mockResolvedValue(mockBrowser);

      const result = await service.launchBrowserWithRetry(mockLaunchFn, 3);

      expect(result).toBe(mockBrowser);
      expect(mockLaunchFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockLaunchFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockBrowser);

      const result = await service.launchBrowserWithRetry(mockLaunchFn, 3);

      expect(result).toBe(mockBrowser);
      expect(mockLaunchFn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const mockLaunchFn = jest
        .fn()
        .mockRejectedValue(new Error('Launch failed'));

      await expect(
        service.launchBrowserWithRetry(mockLaunchFn, 2),
      ).rejects.toThrow('Launch failed');

      expect(mockLaunchFn).toHaveBeenCalledTimes(2);
    });

    it('should wait between retries', async () => {
      const mockLaunchFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockBrowser);

      const startTime = Date.now();
      await service.launchBrowserWithRetry(mockLaunchFn, 3);
      const endTime = Date.now();

      // Should have waited at least 1 second between retries (allowing for minor timing variance)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('cleanupBrowserResources', () => {
    it('should cleanup browser resources successfully', async () => {
      const mockPage = {
        close: jest.fn(),
        isClosed: jest.fn().mockReturnValue(false),
      };
      const mockContext = { close: jest.fn() };

      await service.cleanupBrowserResources(
        mockBrowser,
        mockContext as any,
        mockPage as any,
        'test-123',
      );

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockPage = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
        isClosed: jest.fn().mockReturnValue(false),
      };
      const mockContext = { close: jest.fn() };

      // Should not throw despite page close failure
      await expect(
        service.cleanupBrowserResources(
          mockBrowser,
          mockContext as any,
          mockPage as any,
          'test-123',
        ),
      ).resolves.not.toThrow();
    });

    it('should handle null resources gracefully', async () => {
      await expect(
        service.cleanupBrowserResources(null, null, null, 'test-123'),
      ).resolves.not.toThrow();
    });

    it('should skip closing already closed pages', async () => {
      const mockPage = {
        close: jest.fn(),
        isClosed: jest.fn().mockReturnValue(true),
      };
      const mockContext = { close: jest.fn() };

      await service.cleanupBrowserResources(
        mockBrowser,
        mockContext as any,
        mockPage as any,
        'test-123',
      );

      expect(mockPage.close).not.toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup timeout', async () => {
      const mockPage = {
        close: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        isClosed: jest.fn().mockReturnValue(false),
      };
      const mockContext = { close: jest.fn() };

      // Should complete despite timeout
      await expect(
        service.cleanupBrowserResources(
          mockBrowser,
          mockContext as any,
          mockPage as any,
          'test-123',
        ),
      ).resolves.not.toThrow();
    }, 10000);
  });
});

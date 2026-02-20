import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from '../../services/rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('canStartTest', () => {
    it('should allow test when under concurrent limit', () => {
      const result = service.canStartTest('127.0.0.1');
      expect(result.allowed).toBe(true);
    });

    it('should block test when concurrent limit reached', () => {
      // Fill up the concurrent test slots
      for (let i = 0; i < 5; i++) {
        service.registerTest(
          `test-${i}`,
          `https://example${i}.com`,
          '127.0.0.1',
        );
      }

      const result = service.canStartTest('127.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum concurrent tests reached');
    });

    it('should allow test after concurrent test completes', () => {
      // Fill up the concurrent test slots
      for (let i = 0; i < 5; i++) {
        service.registerTest(
          `test-${i}`,
          `https://example${i}.com`,
          '127.0.0.1',
        );
      }

      // Should be blocked
      expect(service.canStartTest('127.0.0.1').allowed).toBe(false);

      // Complete one test
      service.unregisterTest('test-0');

      // Should now allow
      expect(service.canStartTest('127.0.0.1').allowed).toBe(true);
    });
  });

  describe('registerTest and unregisterTest', () => {
    it('should register and track test sessions', () => {
      service.registerTest('test-1', 'https://example.com', '127.0.0.1');

      const status = service.getStatus();
      expect(status.activeTests).toBe(1);

      const sessions = service.getActiveSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('test-1');
      expect(sessions[0].url).toBe('https://example.com');
    });

    it('should unregister test sessions', () => {
      service.registerTest('test-1', 'https://example.com', '127.0.0.1');
      expect(service.getStatus().activeTests).toBe(1);

      service.unregisterTest('test-1');
      expect(service.getStatus().activeTests).toBe(0);
      expect(service.getActiveSessions()).toHaveLength(0);
    });

    it('should handle unregistering non-existent test gracefully', () => {
      expect(() => service.unregisterTest('non-existent')).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return correct system status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('activeTests');
      expect(status).toHaveProperty('maxConcurrentTests');
      expect(status).toHaveProperty('systemLoad');
      expect(typeof status.activeTests).toBe('number');
      expect(typeof status.maxConcurrentTests).toBe('number');
      expect(typeof status.systemLoad).toBe('number');
    });

    it('should calculate system load correctly', () => {
      // Register 2 tests out of 5 max
      service.registerTest('test-1', 'https://example.com', '127.0.0.1');
      service.registerTest('test-2', 'https://example.com', '127.0.0.1');

      const status = service.getStatus();
      expect(status.activeTests).toBe(2);
      expect(status.systemLoad).toBe(0.4); // 2/5 = 0.4
    });
  });

  describe('rate limiting per IP', () => {
    it('should allow requests under rate limit', () => {
      const result = service.canStartTest('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block requests over rate limit', () => {
      const testIp = '192.168.1.2';

      // Register tests up to the limit (60)
      for (let i = 0; i < 60; i++) {
        service.registerTest(`test-${i}`, 'https://example.com', testIp);
        service.unregisterTest(`test-${i}`); // Unregister to avoid concurrent limit
      }

      const result = service.canStartTest(testIp);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });
  });

  describe('cleanup', () => {
    it('should clean up stale sessions', () => {
      // Register a test
      service.registerTest('test-1', 'https://example.com', '127.0.0.1');
      expect(service.getStatus().activeTests).toBe(1);

      // Mock old start time by accessing private property
      const sessions = service.getActiveSessions();
      if (sessions.length > 0) {
        // Simulate a stale session (older than 5 minutes)
        sessions[0].startTime = Date.now() - 400000; // 6+ minutes ago
      }

      // Manually trigger cleanup
      (service as any).cleanup();

      // The cleanup should have removed the stale session
      expect(service.getStatus().activeTests).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should clear all sessions and rate limits', async () => {
      service.registerTest('test-1', 'https://example.com', '127.0.0.1');
      service.registerTest('test-2', 'https://example.com', '127.0.0.1');

      expect(service.getStatus().activeTests).toBe(2);

      await service.shutdown();

      expect(service.getStatus().activeTests).toBe(0);
      expect(service.getActiveSessions()).toHaveLength(0);
    });
  });
});

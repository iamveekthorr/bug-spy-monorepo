import { Injectable, Logger } from '@nestjs/common';
import { PERFORMANCE_TEST_CONFIG } from '../config/performance-test.config';

interface TestSession {
  id: string;
  startTime: number;
  url: string;
  clientIp?: string;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly activeSessions = new Map<string, TestSession>();
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly config = PERFORMANCE_TEST_CONFIG.rateLimiting;

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  /**
   * Check if a new test can be started
   */
  canStartTest(clientIp?: string): { allowed: boolean; reason?: string } {
    // Check concurrent test limit
    if (this.activeSessions.size >= this.config.maxConcurrentTests) {
      return {
        allowed: false,
        reason: `Maximum concurrent tests reached (${this.config.maxConcurrentTests})`,
      };
    }

    // Check rate limit per IP
    if (clientIp && !this.checkRateLimit(clientIp)) {
      return {
        allowed: false,
        reason: `Rate limit exceeded for IP ${clientIp}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Register a new test session
   */
  registerTest(testId: string, url: string, clientIp?: string): void {
    this.activeSessions.set(testId, {
      id: testId,
      startTime: Date.now(),
      url,
      clientIp,
    });

    if (clientIp) {
      this.incrementRequestCount(clientIp);
    }

    this.logger.log(
      `Test registered: ${testId} (${this.activeSessions.size} active tests)`,
    );
  }

  /**
   * Unregister a completed test session
   */
  unregisterTest(testId: string): void {
    const session = this.activeSessions.get(testId);
    if (session) {
      this.activeSessions.delete(testId);
      const duration = Date.now() - session.startTime;
      this.logger.log(
        `Test completed: ${testId} (duration: ${duration}ms, ${this.activeSessions.size} active tests)`,
      );
    }
  }

  /**
   * Get current system status
   */
  getStatus(): {
    activeTests: number;
    maxConcurrentTests: number;
    systemLoad: number;
  } {
    return {
      activeTests: this.activeSessions.size,
      maxConcurrentTests: this.config.maxConcurrentTests,
      systemLoad: this.activeSessions.size / this.config.maxConcurrentTests,
    };
  }

  /**
   * Get active test sessions (for monitoring)
   */
  getActiveSessions(): TestSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Check rate limit for an IP address
   */
  private checkRateLimit(clientIp: string): boolean {
    const now = Date.now();
    const _windowStart = now - 60000; // 1 minute window

    const record = this.requestCounts.get(clientIp);

    if (!record) {
      return true; // First request
    }

    if (record.resetTime <= now) {
      // Reset window
      this.requestCounts.set(clientIp, {
        count: 0,
        resetTime: now + 60000,
      });
      return true;
    }

    return record.count < this.config.maxRequestsPerMinute;
  }

  /**
   * Increment request count for an IP
   */
  private incrementRequestCount(clientIp: string): void {
    const now = Date.now();
    const record = this.requestCounts.get(clientIp);

    if (!record || record.resetTime <= now) {
      this.requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + 60000,
      });
    } else {
      record.count++;
    }
  }

  /**
   * Cleanup expired sessions and rate limit records
   */
  private cleanup(): void {
    const now = Date.now();
    const maxSessionAge = 300000; // 5 minutes

    // Clean up stale sessions
    let cleanedSessions = 0;
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > maxSessionAge) {
        this.activeSessions.delete(sessionId);
        cleanedSessions++;
      }
    }

    // Clean up expired rate limit records
    let cleanedRateLimits = 0;
    for (const [ip, record] of this.requestCounts.entries()) {
      if (record.resetTime <= now) {
        this.requestCounts.delete(ip);
        cleanedRateLimits++;
      }
    }

    if (cleanedSessions > 0 || cleanedRateLimits > 0) {
      this.logger.debug(
        `Cleanup completed: ${cleanedSessions} sessions, ${cleanedRateLimits} rate limits`,
      );
    }
  }

  /**
   * Force cleanup all resources (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    this.logger.log('Rate limiter shutting down...');
    this.activeSessions.clear();
    this.requestCounts.clear();
  }
}

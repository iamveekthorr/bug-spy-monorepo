import { Test, TestingModule } from '@nestjs/testing';
import { LighthouseService, LighthouseResult } from '../../services/lighthouse.service';

describe('LighthouseService', () => {
  let service: LighthouseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LighthouseService],
    }).compile();

    service = module.get<LighthouseService>(LighthouseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runAudit', () => {
    it('should return fallback scores when page is provided without browser', async () => {
      // Create a mock page object
      const mockPage = {
        browser: () => null,
        evaluate: jest.fn().mockResolvedValue({
          performanceScore: 75,
          accessibilityScore: 80,
          bestPracticesScore: 85,
          seoScore: 70,
          metrics: {
            firstContentfulPaint: 1500,
            largestContentfulPaint: 0,
            totalBlockingTime: 0,
            cumulativeLayoutShift: 0,
            speedIndex: 0,
            timeToInteractive: 2000,
          },
        }),
      } as any;

      const result = await service.runAudit('https://example.com', mockPage);

      expect(result).toBeDefined();
      expect(result.source).toBe('fallback');
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should return valid score structure', async () => {
      const mockPage = {
        browser: () => null,
        evaluate: jest.fn().mockResolvedValue({
          performanceScore: 85,
          accessibilityScore: 90,
          bestPracticesScore: 85,
          seoScore: 90,
          metrics: {
            firstContentfulPaint: 1200,
            largestContentfulPaint: 2000,
            totalBlockingTime: 100,
            cumulativeLayoutShift: 0.05,
            speedIndex: 1500,
            timeToInteractive: 1800,
          },
        }),
      } as any;

      const result = await service.runAudit('https://example.com', mockPage);

      expect(result).toHaveProperty('performanceScore');
      expect(result).toHaveProperty('accessibilityScore');
      expect(result).toHaveProperty('bestPracticesScore');
      expect(result).toHaveProperty('seoScore');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('audits');
      expect(result).toHaveProperty('source');
    });

    it('should handle evaluation errors gracefully', async () => {
      const mockPage = {
        browser: () => null,
        evaluate: jest.fn().mockRejectedValue(new Error('Page evaluation failed')),
      } as any;

      const result = await service.runAudit('https://example.com', mockPage);

      expect(result).toBeDefined();
      expect(result.source).toBe('error');
      expect(result.performanceScore).toBe(50);
    });
  });

  describe('score calculation', () => {
    it('should calculate performance score based on Core Web Vitals', async () => {
      // Mock page with good metrics
      const goodMetricsPage = {
        browser: () => null,
        evaluate: jest.fn().mockResolvedValue({
          performanceScore: 95,
          accessibilityScore: 90,
          bestPracticesScore: 90,
          seoScore: 85,
          metrics: {
            firstContentfulPaint: 1000, // Good FCP
            largestContentfulPaint: 2000, // Good LCP
            totalBlockingTime: 100, // Good TBT
            cumulativeLayoutShift: 0.05, // Good CLS
            speedIndex: 1200,
            timeToInteractive: 1500,
          },
        }),
      } as any;

      const result = await service.runAudit('https://example.com', goodMetricsPage);
      expect(result.performanceScore).toBeGreaterThanOrEqual(80);
    });

    it('should penalize poor Core Web Vitals', async () => {
      // Mock page with poor metrics
      const poorMetricsPage = {
        browser: () => null,
        evaluate: jest.fn().mockResolvedValue({
          performanceScore: 45,
          accessibilityScore: 60,
          bestPracticesScore: 55,
          seoScore: 50,
          metrics: {
            firstContentfulPaint: 5000, // Poor FCP
            largestContentfulPaint: 6000, // Poor LCP
            totalBlockingTime: 800, // Poor TBT
            cumulativeLayoutShift: 0.4, // Poor CLS
            speedIndex: 5000,
            timeToInteractive: 6000,
          },
        }),
      } as any;

      const result = await service.runAudit('https://example.com', poorMetricsPage);
      expect(result.performanceScore).toBeLessThanOrEqual(60);
    });
  });
});

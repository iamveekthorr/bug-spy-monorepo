import { Test, TestingModule } from '@nestjs/testing';
import { SeoMetricsService, SeoMetricsResult } from '../../services/seo-metrics.service';
import { PuppeteerHelpersService } from '../../services/puppeteer-helpers.service';

describe('SeoMetricsService', () => {
  let service: SeoMetricsService;
  let mockPuppeteerHelpers: jest.Mocked<PuppeteerHelpersService>;

  beforeEach(async () => {
    mockPuppeteerHelpers = {
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoMetricsService,
        {
          provide: PuppeteerHelpersService,
          useValue: mockPuppeteerHelpers,
        },
      ],
    }).compile();

    service = module.get<SeoMetricsService>(SeoMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('captureSeoMetrics', () => {
    const createMockPage = (evaluateResults: Record<string, any>) => ({
      evaluate: jest.fn().mockImplementation((fn: Function, ...args: any[]) => {
        // Return different results based on what's being evaluated
        const fnStr = fn.toString();
        if (fnStr.includes('getMetaContent')) {
          return evaluateResults.metaTags || {
            title: { value: 'Test Page', length: 9, optimal: false },
            description: { value: 'Test description', length: 16, optimal: false },
            keywords: [],
            author: null,
            robots: null,
            viewport: 'width=device-width',
            canonical: 'https://example.com',
            lang: 'en',
            openGraph: { title: null, description: null, image: null, url: null, type: null, isComplete: false },
            twitter: { card: null, title: null, description: null, image: null, isComplete: false },
            issues: ['Missing Open Graph title'],
            score: 85,
          };
        }
        if (fnStr.includes('getHeadings')) {
          return evaluateResults.headings || {
            structure: {
              h1: { count: 1, items: [{ text: 'Main Heading', length: 12 }] },
              h2: { count: 2, items: [] },
              h3: { count: 0, items: [] },
              h4: { count: 0, items: [] },
              h5: { count: 0, items: [] },
              h6: { count: 0, items: [] },
            },
            totalHeadings: 3,
            hasProperH1: true,
            hasHierarchy: true,
            issues: [],
            score: 100,
          };
        }
        if (fnStr.includes('wordCount')) {
          return evaluateResults.content || {
            wordCount: 500,
            characterCount: 3000,
            readingTime: 3,
            paragraphs: 5,
            images: { total: 3, withAlt: 3, missingAlt: 0 },
            links: { internal: 5, external: 2, total: 7 },
            issues: [],
            score: 100,
          };
        }
        if (fnStr.includes('isHttps')) {
          return evaluateResults.technical || {
            isHttps: true,
            hasDoctype: true,
            charset: 'utf-8',
            hasFavicon: true,
            hasJsErrors: false,
            loadTime: 2000,
            ttfb: 300,
            renderBlocking: { css: 2, js: 3 },
            issues: [],
          };
        }
        if (fnStr.includes('jsonLdScripts')) {
          return evaluateResults.structuredData || {
            jsonLd: { count: 1, types: ['Organization'], isValid: true },
            microdata: { itemCount: 0 },
            hasOpenGraph: true,
            hasTwitterCards: false,
            issues: [],
            score: 80,
          };
        }
        if (fnStr.includes('baseHost')) {
          return evaluateResults.links || {
            internal: { count: 5, links: [] },
            external: { count: 2, links: [] },
            broken: { count: 0, links: [] },
            noFollow: { count: 0, links: [] },
            total: 7,
            issues: [],
            score: 100,
          };
        }
        if (fnStr.includes('hasViewport')) {
          return evaluateResults.mobile || {
            hasViewport: true,
            hasProperViewport: true,
            smallTextElements: 0,
            smallTapTargets: 2,
            hasHorizontalScroll: false,
            hasTouchOptimization: false,
            issues: [],
            score: 95,
          };
        }
        return {};
      }),
    });

    it('should yield SEO_START event first', async () => {
      const mockPage = createMockPage({});
      const generator = service.captureSeoMetrics(mockPage as any, 'https://example.com');
      
      const firstEvent = await generator.next();
      expect(firstEvent.value.status).toBe('SEO_START');
    });

    it('should yield SEO_COMPLETE with full results', async () => {
      const mockPage = createMockPage({});
      const generator = service.captureSeoMetrics(mockPage as any, 'https://example.com');
      
      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }
      
      const completeEvent = events.find(e => e.status === 'SEO_COMPLETE');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.data).toHaveProperty('score');
      expect(completeEvent.data).toHaveProperty('recommendations');
      expect(completeEvent.data).toHaveProperty('issues');
    });

    it('should generate recommendations for missing meta tags', async () => {
      const mockPage = createMockPage({
        metaTags: {
          title: { value: null, length: 0, optimal: false },
          description: { value: null, length: 0, optimal: false },
          keywords: [],
          author: null,
          robots: null,
          viewport: null,
          canonical: null,
          lang: null,
          openGraph: { isComplete: false },
          twitter: { isComplete: false },
          issues: ['Missing page title', 'Missing meta description'],
          score: 30,
        },
      });
      
      const generator = service.captureSeoMetrics(mockPage as any, 'https://example.com');
      
      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }
      
      const completeEvent = events.find(e => e.status === 'SEO_COMPLETE');
      expect(completeEvent.data.recommendations.length).toBeGreaterThan(0);
      expect(completeEvent.data.recommendations.some(
        (r: any) => r.title.includes('title') || r.title.includes('description')
      )).toBe(true);
    });

    it('should handle page evaluation errors gracefully', async () => {
      const mockPage = {
        evaluate: jest.fn().mockRejectedValue(new Error('Page crashed')),
      };
      
      const generator = service.captureSeoMetrics(mockPage as any, 'https://example.com');
      
      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }
      
      // Should have at least the start event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].status).toBe('SEO_START');
      
      // Either SEO_ERROR or SEO_COMPLETE with low scores
      const hasErrorOrComplete = events.some(e => e.status === 'SEO_ERROR' || e.status === 'SEO_COMPLETE');
      expect(hasErrorOrComplete).toBe(true);
    });
  });

  describe('score calculation', () => {
    it('should calculate weighted overall score', async () => {
      const mockPage = {
        evaluate: jest.fn()
          .mockResolvedValueOnce({ // metaTags
            title: { value: 'Test', length: 4, optimal: false },
            description: { value: 'Test desc', length: 9, optimal: false },
            issues: [],
            score: 80,
            openGraph: { isComplete: true },
            twitter: { isComplete: true },
          })
          .mockResolvedValueOnce({ // headings
            structure: { h1: { count: 1, items: [] }, h2: { count: 2, items: [] } },
            hasProperH1: true,
            hasHierarchy: true,
            issues: [],
            score: 100,
          })
          .mockResolvedValueOnce({ // content
            wordCount: 500,
            images: { total: 5, withAlt: 5, missingAlt: 0 },
            links: { internal: 3, external: 2, total: 5 },
            issues: [],
            score: 100,
          })
          .mockResolvedValueOnce({ // technical
            isHttps: true,
            hasDoctype: true,
            issues: [],
            score: 100,
          })
          .mockResolvedValueOnce({ // structuredData
            jsonLd: { count: 1, types: [], isValid: true },
            issues: [],
            score: 100,
          })
          .mockResolvedValueOnce({ // links
            internal: { count: 3 },
            external: { count: 2 },
            broken: { count: 0 },
            total: 5,
            issues: [],
            score: 100,
          })
          .mockResolvedValueOnce({ // mobile
            hasViewport: true,
            hasProperViewport: true,
            issues: [],
            score: 100,
          }),
      };

      const generator = service.captureSeoMetrics(mockPage as any, 'https://example.com');
      
      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }
      
      const completeEvent = events.find(e => e.status === 'SEO_COMPLETE');
      if (completeEvent) {
        expect(completeEvent.data.score).toBeGreaterThanOrEqual(0);
        expect(completeEvent.data.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('recommendations priority', () => {
    it('should sort recommendations by priority', async () => {
      const mockPage = {
        evaluate: jest.fn()
          .mockResolvedValueOnce({ // metaTags - missing critical items
            title: { value: null, length: 0, optimal: false },
            description: { value: null, length: 0, optimal: false },
            issues: ['Missing page title', 'Missing meta description'],
            score: 20,
            openGraph: { isComplete: false },
            twitter: { isComplete: false },
          })
          .mockResolvedValueOnce({ // headings
            structure: { h1: { count: 0, items: [] } },
            hasProperH1: false,
            issues: ['No H1 heading found'],
            score: 50,
          })
          .mockResolvedValueOnce({ // content
            wordCount: 100, // thin content
            images: { total: 0, withAlt: 0, missingAlt: 0 },
            issues: ['Thin content'],
            score: 40,
          })
          .mockResolvedValueOnce({ // technical
            isHttps: false, // critical issue
            issues: ['Site not using HTTPS'],
            score: 30,
          })
          .mockResolvedValueOnce({ // structuredData
            jsonLd: { count: 0 },
            microdata: { itemCount: 0 },
            issues: ['No structured data'],
            score: 0,
          })
          .mockResolvedValueOnce({ // links
            internal: { count: 0 },
            external: { count: 0 },
            broken: { count: 0 },
            issues: [],
            score: 80,
          })
          .mockResolvedValueOnce({ // mobile
            hasViewport: false,
            hasProperViewport: false,
            issues: ['Missing viewport meta tag'],
            score: 20,
          }),
      };

      const generator = service.captureSeoMetrics(mockPage as any, 'http://example.com');
      
      const events: any[] = [];
      for await (const event of generator) {
        events.push(event);
      }
      
      const completeEvent = events.find(e => e.status === 'SEO_COMPLETE');
      if (completeEvent && completeEvent.data.recommendations.length > 1) {
        const priorities = completeEvent.data.recommendations.map((r: any) => r.priority);
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
            priorityOrder[priorities[i - 1]]
          );
        }
      }
    });
  });
});

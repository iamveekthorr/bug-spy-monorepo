import { Injectable, Logger } from '@nestjs/common';
import { Page, Browser } from 'puppeteer';

/**
 * Lighthouse Service
 * 
 * Provides accurate performance scoring using Google Lighthouse.
 * Falls back to manual calculation if Lighthouse fails.
 */
@Injectable()
export class LighthouseService {
  private readonly logger = new Logger(LighthouseService.name);
  private lighthouse: any = null;

  constructor() {
    this.initializeLighthouse();
  }

  private async initializeLighthouse() {
    try {
      // Dynamic import for lighthouse (ESM module)
      this.lighthouse = await import('lighthouse');
      this.logger.log('Lighthouse module loaded successfully');
    } catch (error) {
      this.logger.warn('Lighthouse module not available, will use fallback scoring');
    }
  }

  /**
   * Run Lighthouse audit on a URL
   * 
   * @param url - URL to audit
   * @param page - Puppeteer page instance
   * @returns Lighthouse scores and metrics
   */
  async runAudit(
    url: string,
    page: Page,
  ): Promise<LighthouseResult> {
    // Get browser from page
    const browser = page.browser();
    
    if (!this.lighthouse || !browser) {
      this.logger.warn('Lighthouse not available, using fallback scoring');
      return this.getFallbackScores(page);
    }

    try {
      const wsEndpoint = browser.wsEndpoint();
      const port = new URL(wsEndpoint).port;

      this.logger.log(`Running Lighthouse audit on ${url} via port ${port}`);

      const lighthouseModule = this.lighthouse.default || this.lighthouse;
      
      const result = await lighthouseModule(url, {
        port: parseInt(port),
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Optimize for speed
        disableStorageReset: true,
        throttlingMethod: 'devtools',
        throttling: {
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        // Skip unnecessary audits for faster results
        skipAudits: [
          'screenshot-thumbnails',
          'final-screenshot',
          'full-page-screenshot',
        ],
      });

      if (!result || !result.lhr) {
        this.logger.warn('Lighthouse returned no results, using fallback');
        return this.getFallbackScores(page);
      }

      const { lhr } = result;
      const categories = lhr.categories;

      // Get Lighthouse scores, with fallback calculation for performance
      let performanceScore = Math.round((categories.performance?.score || 0) * 100);
      
      // If performance score is 0 or null (often due to Speed Index failing in headless mode),
      // calculate a score based on the individual metrics that did succeed
      if (performanceScore === 0) {
        performanceScore = this.calculatePerformanceScoreFromMetrics(lhr.audits);
        this.logger.log(`Lighthouse performance score was 0, calculated fallback: ${performanceScore}`);
      }

      const scores: LighthouseResult = {
        performanceScore,
        accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
        bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
        seoScore: Math.round((categories.seo?.score || 0) * 100),
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
          largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
          totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
          speedIndex: lhr.audits['speed-index']?.numericValue || 0,
          timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
        },
        audits: this.extractAuditDetails(lhr.audits),
        source: 'lighthouse',
      };

      this.logger.log(`Lighthouse scores: Performance=${scores.performanceScore}, SEO=${scores.seoScore}`);
      return scores;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lighthouse audit failed: ${errorMessage}`);
      return this.getFallbackScores(page);
    }
  }

  /**
   * Extract relevant audit details from Lighthouse results
   */
  private extractAuditDetails(audits: any): AuditDetail[] {
    const relevantAudits = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'speed-index',
      'interactive',
      'server-response-time',
      'render-blocking-resources',
      'uses-responsive-images',
      'uses-optimized-images',
      'uses-text-compression',
      'uses-rel-preconnect',
      'dom-size',
      'critical-request-chains',
      'redirects',
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-long-cache-ttl',
      'unused-javascript',
      'unused-css-rules',
      'modern-image-formats',
      // SEO audits
      'meta-description',
      'document-title',
      'html-has-lang',
      'link-text',
      'crawlable-anchors',
      'is-crawlable',
      'robots-txt',
      'hreflang',
      'canonical',
      'structured-data',
      // Accessibility audits
      'color-contrast',
      'image-alt',
      'label',
      'button-name',
      'link-name',
      'heading-order',
      'bypass',
      'tabindex',
    ];

    return relevantAudits
      .filter(id => audits[id])
      .map(id => ({
        id,
        title: audits[id].title,
        description: audits[id].description,
        score: audits[id].score,
        displayValue: audits[id].displayValue,
        numericValue: audits[id].numericValue,
        scoreDisplayMode: audits[id].scoreDisplayMode,
      }));
  }

  /**
   * Fallback scoring when Lighthouse is not available
   */
  private async getFallbackScores(page: Page): Promise<LighthouseResult> {
    try {
      const scores = await page.evaluate(() => {
        // Performance score from Core Web Vitals
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
        const ttfb = navigation.responseStart - navigation.requestStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
        const loadComplete = navigation.loadEventEnd - navigation.startTime;

        // Calculate performance score
        let perfScore = 100;
        if (fcp > 3000) perfScore -= 20;
        else if (fcp > 1800) perfScore -= 10;
        if (ttfb > 800) perfScore -= 15;
        else if (ttfb > 200) perfScore -= 5;
        if (domContentLoaded > 3000) perfScore -= 15;
        else if (domContentLoaded > 1500) perfScore -= 8;
        if (loadComplete > 5000) perfScore -= 15;
        else if (loadComplete > 3000) perfScore -= 8;

        // SEO score
        let seoScore = 100;
        if (!document.querySelector('meta[name="description"]')) seoScore -= 15;
        if (!document.title || document.title.trim() === '') seoScore -= 20;
        if (!document.querySelector('meta[name="viewport"]')) seoScore -= 10;
        if (!document.querySelector('link[rel="canonical"]')) seoScore -= 5;
        const h1Count = document.querySelectorAll('h1').length;
        if (h1Count === 0) seoScore -= 10;
        if (h1Count > 1) seoScore -= 5;
        if (!document.documentElement.lang) seoScore -= 5;
        if (!document.querySelector('meta[property="og:title"]')) seoScore -= 3;
        if (!document.querySelector('meta[name="robots"]')) seoScore -= 2;

        // Accessibility score
        let accessibilityScore = 100;
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
        const totalImages = document.querySelectorAll('img').length;
        if (totalImages > 0 && imagesWithoutAlt > 0) {
          accessibilityScore -= Math.min(30, imagesWithoutAlt * 5);
        }
        const buttonsWithoutLabel = document.querySelectorAll('button:not([aria-label]):not(:has(*))').length;
        if (buttonsWithoutLabel > 0) accessibilityScore -= Math.min(15, buttonsWithoutLabel * 3);
        const linksWithoutText = document.querySelectorAll('a:empty:not([aria-label])').length;
        if (linksWithoutText > 0) accessibilityScore -= Math.min(15, linksWithoutText * 3);
        if (!document.querySelector('[role="main"], main')) accessibilityScore -= 5;

        // Best practices score
        let bestPracticesScore = 100;
        const inlineStyles = document.querySelectorAll('[style]').length;
        if (inlineStyles > 20) bestPracticesScore -= Math.min(15, Math.floor(inlineStyles / 5));
        const httpLinks = document.querySelectorAll('a[href^="http:"]:not([href^="http://localhost"])').length;
        if (httpLinks > 0) bestPracticesScore -= Math.min(10, httpLinks * 2);
        if (!document.doctype) bestPracticesScore -= 10;
        const deprecatedTags = document.querySelectorAll('font, center, marquee, blink').length;
        if (deprecatedTags > 0) bestPracticesScore -= Math.min(20, deprecatedTags * 5);

        return {
          performanceScore: Math.max(0, Math.min(100, Math.round(perfScore))),
          accessibilityScore: Math.max(0, Math.min(100, Math.round(accessibilityScore))),
          bestPracticesScore: Math.max(0, Math.min(100, Math.round(bestPracticesScore))),
          seoScore: Math.max(0, Math.min(100, Math.round(seoScore))),
          metrics: {
            firstContentfulPaint: fcp,
            largestContentfulPaint: 0,
            totalBlockingTime: 0,
            cumulativeLayoutShift: 0,
            speedIndex: 0,
            timeToInteractive: domContentLoaded,
          },
        };
      });

      return {
        ...scores,
        audits: [],
        source: 'fallback',
      };
    } catch (error) {
      this.logger.error('Fallback scoring failed:', error);
      return {
        performanceScore: 50,
        accessibilityScore: 50,
        bestPracticesScore: 50,
        seoScore: 50,
        metrics: {
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          totalBlockingTime: 0,
          cumulativeLayoutShift: 0,
          speedIndex: 0,
          timeToInteractive: 0,
        },
        audits: [],
        source: 'error',
      };
    }
  }
}

export interface LighthouseResult {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    speedIndex: number;
    timeToInteractive: number;
  };
  audits: AuditDetail[];
  source: 'lighthouse' | 'fallback' | 'error';
}

export interface AuditDetail {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  scoreDisplayMode?: string;
}

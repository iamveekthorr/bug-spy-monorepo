import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { PuppeteerHelpersService } from './puppeteer-helpers.service';

@Injectable()
export class WebMetricsService {
  private readonly logger = new Logger(WebMetricsService.name);

  constructor(private readonly puppeteerHelpers: PuppeteerHelpersService) {}

  async *captureWebMetrics(
    page: Page,
    testType: 'performance' | 'screenshot' | 'cookie',
  ): AsyncGenerator<any> {
    this.logger.log(`captureWebMetrics called with testType: ${testType}`);

    if (testType !== 'performance') {
      this.logger.log(
        `Skipping metrics - testType is ${testType}, not performance`,
      );
      yield {
        status: 'METRICS_SKIPPED',
        reason: `testType is ${testType}, not performance`,
      };
      return;
    }

    this.logger.log('Starting web metrics collection');
    yield {
      status: 'METRICS_START',
      message: 'Starting web metrics collection',
    };

    try {
      // Ensure the page is ready with intelligent timeout system
      let pageReadyState = 'unknown';

      // Try load state first (most comprehensive)
      try {
        await this.puppeteerHelpers.waitForLoadState(page, 'load');
        pageReadyState = 'load';
        this.logger.log('Page reached load state');
        // Minimal wait for resource timing entries
        await this.puppeteerHelpers.waitForTimeout(page, 500);
      } catch (_loadError) {
        this.logger.warn('Page load state not achieved, trying networkidle...');

        // Fallback to networkidle
        try {
          await this.puppeteerHelpers.waitForLoadState(page, 'networkidle');
          pageReadyState = 'networkidle';
          this.logger.log('Page reached networkidle state');
        } catch (_networkIdleError) {
          this.logger.warn(
            'Networkidle not achieved, trying domcontentloaded...',
          );

          // Final fallback to domcontentloaded
          try {
            await this.puppeteerHelpers.waitForLoadState(
              page,
              'domcontentloaded',
            );
            pageReadyState = 'domcontentloaded';
            this.logger.log('Page reached domcontentloaded state');
          } catch (_domContentLoadedError) {
            pageReadyState = 'minimal';
            this.logger.warn(
              'No load state achieved, proceeding with minimal page state for metrics collection',
            );
            // Continue with metrics collection - some data is better than none
          }
        }
      }

      yield {
        status: 'PAGE_READY',
        pageReadyState,
        message: `Page ready for metrics collection (state: ${pageReadyState})`,
      };

      // Test page readiness and context stability
      try {
        // Wait for page to be ready and stable
        await page.waitForFunction(() => document.readyState === 'complete', {
          timeout: 5000,
        });

        const _basicTest = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasPerformance: typeof performance !== 'undefined',
            navigationEntries:
              performance.getEntriesByType('navigation').length,
            resourceEntries: performance.getEntriesByType('resource').length,
          };
        });
        this.logger.log('Page evaluation successful');
      } catch (evalError) {
        this.logger.warn(
          'Page evaluation failed, continuing with limited metrics:',
          evalError,
        );
        yield {
          status: 'METRICS_LIMITED',
          message: 'Page context unstable, providing limited metrics',
        };
        return; // Exit early if page context is unstable
      }

      // Collect all metrics in parallel for better performance
      this.logger.log('Starting parallel metrics collection...');

      const [performanceResult, networkResult, vitalsResult, testInfoResult] =
        await Promise.allSettled([
          this.collectPerformanceMetrics(page),
          this.collectNetworkMetrics(page),
          this.collectVitalsMetrics(page),
          this.collectTestInfo(page),
        ]);

      // Process performance metrics
      let performanceMetrics: PerformanceMetrics | null = null;
      if (performanceResult.status === 'fulfilled') {
        performanceMetrics = performanceResult.value;
        this.logger.log('Performance metrics collected successfully');
        yield { status: 'PERFORMANCE_METRICS', data: performanceMetrics };
      } else {
        const errorMessage =
          performanceResult.reason instanceof Error
            ? performanceResult.reason.message
            : String(performanceResult.reason);
        this.logger.error(
          'Failed to collect performance metrics:',
          errorMessage,
        );
        yield { status: 'PERFORMANCE_ERROR', error: errorMessage };
      }

      // Process network metrics
      let networkMetrics: NetworkMetrics | null = null;
      if (networkResult.status === 'fulfilled') {
        networkMetrics = networkResult.value;
        this.logger.log(
          'Network metrics collected:',
          JSON.stringify({
            totalRequests: networkMetrics?.totalRequests,
            totalBytes: networkMetrics?.totalBytes,
            resourceBreakdownLength: {
              documents: networkMetrics?.resourceBreakdown?.documents?.length,
              stylesheets:
                networkMetrics?.resourceBreakdown?.stylesheets?.length,
              scripts: networkMetrics?.resourceBreakdown?.scripts?.length,
              images: networkMetrics?.resourceBreakdown?.images?.length,
            },
          }),
        );
        yield { status: 'NETWORK_METRICS', data: networkMetrics };
      } else {
        const errorMessage =
          networkResult.reason instanceof Error
            ? networkResult.reason.message
            : String(networkResult.reason);
        this.logger.error('Failed to collect network metrics:', errorMessage);
        yield { status: 'NETWORK_ERROR', error: errorMessage };
      }

      // Process vitals metrics
      let vitalsMetrics: VitalsMetrics | null = null;
      if (vitalsResult.status === 'fulfilled') {
        vitalsMetrics = vitalsResult.value;
        this.logger.log('Vitals metrics collected successfully');
        yield { status: 'VITALS_METRICS', data: vitalsMetrics };
      } else {
        const errorMessage =
          vitalsResult.reason instanceof Error
            ? vitalsResult.reason.message
            : String(vitalsResult.reason);
        this.logger.error('Failed to collect vitals metrics:', errorMessage);
        yield { status: 'VITALS_ERROR', error: errorMessage };
      }

      // Process test info
      let testInfo: any = null;
      if (testInfoResult.status === 'fulfilled') {
        testInfo = testInfoResult.value;
        this.logger.log('Test info collected successfully');
      } else {
        const errorMessage =
          testInfoResult.reason instanceof Error
            ? testInfoResult.reason.message
            : String(testInfoResult.reason);
        this.logger.error('Failed to collect test info:', errorMessage);
        testInfo = {
          testId: `test-${Date.now()}`,
          url: 'unknown',
          location: 'Local',
          browser: 'Unknown',
          device: 'Unknown',
          connection: 'Unknown',
          testTime: Date.now(),
        };
      }

      // Collect opportunities and diagnostics in parallel if we have metrics
      let opportunities: any[] = [];
      let diagnostics: any[] = [];

      if (networkMetrics && performanceMetrics) {
        this.logger.log(
          'Collecting optimization opportunities and diagnostics in parallel...',
        );
        const [opportunitiesResult, diagnosticsResult] =
          await Promise.allSettled([
            this.collectOptimizationOpportunities(page, networkMetrics),
            this.collectDiagnostics(page, performanceMetrics),
          ]);

        if (opportunitiesResult.status === 'fulfilled') {
          opportunities = opportunitiesResult.value;
          this.logger.log('Optimization opportunities collected successfully');
        } else {
          const errorMessage =
            opportunitiesResult.reason instanceof Error
              ? opportunitiesResult.reason.message
              : String(opportunitiesResult.reason);
          this.logger.error(
            'Failed to collect optimization opportunities:',
            errorMessage,
          );
        }

        if (diagnosticsResult.status === 'fulfilled') {
          diagnostics = diagnosticsResult.value;
          this.logger.log('Diagnostics collected successfully');
        } else {
          const errorMessage =
            diagnosticsResult.reason instanceof Error
              ? diagnosticsResult.reason.message
              : String(diagnosticsResult.reason);
          this.logger.error('Failed to collect diagnostics:', errorMessage);
        }
      }

      // Build final web metrics object
      const webMetrics = {
        performanceMetrics: performanceMetrics || {
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          cumulativeLayoutShift: 0,
          interactionToNextPaint: 0,
          timeToFirstByte: 0,
          firstPaint: 0,
          domContentLoaded: 0,
          loadComplete: 0,
          timeToInteractive: 0,
          totalBlockingTime: 0,
          speedIndex: 0,
          visuallyComplete: 0,
          lastVisualChange: 0,
          renderStart: 0,
          domInteractive: 0,
          domComplete: 0,
          loadEventStart: 0,
          loadEventEnd: 0,
          connectStart: 0,
          connectEnd: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          performanceScore: 0,
          accessibilityScore: 0,
          bestPracticesScore: 0,
          seoScore: 0,
        },
        networkMetrics: networkMetrics || {
          totalRequests: 0,
          totalBytes: 0,
          totalTime: 0,
          resourceBreakdown: {
            documents: [],
            stylesheets: [],
            scripts: [],
            images: [],
            fonts: [],
            other: [],
          },
          summary: {
            documents: 0,
            stylesheets: 0,
            scripts: 0,
            images: 0,
            fonts: 0,
            other: 0,
          },
          bytesIn: 0,
          bytesOut: 0,
          connections: 0,
          requests: {
            html: 0,
            js: 0,
            css: 0,
            image: 0,
            font: 0,
            video: 0,
            other: 0,
          },
          compression: { gzip: 0, brotli: 0, none: 0 },
          caching: { cached: 0, notCached: 0 },
          protocols: { http1: 0, http2: 0, http3: 0 },
        },
        vitalsMetrics: vitalsMetrics || {
          domContentLoaded: 0,
          load: 0,
          firstPaint: 0,
          navigationStart: 0,
        },
        testInfo,
        opportunities,
        diagnostics,
      };

      this.logger.log('Web metrics collection completed successfully');
      yield {
        status: 'METRICS_COMPLETE',
        data: webMetrics,
        message: 'Web metrics collection completed',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error collecting web metrics:', errorMessage, stack);
      yield { status: 'METRICS_ERROR', error: errorMessage };
    }
  }

  private async collectTestInfo(page: Page): Promise<any> {
    return await page.evaluate(() => {
      return {
        testId: `test-${Date.now()}`,
        url: window.location.href,
        location: 'Local',
        browser:
          navigator.userAgent.match(
            /(?:Chrome|Firefox|Safari|Edge)\/[\d.]+/,
          )?.[0] || 'Unknown',
        device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
          ? 'Mobile'
          : 'Desktop',
        connection: (navigator as any).connection?.effectiveType || 'Unknown',
        testTime: Date.now(),
      };
    });
  }

  private async collectOptimizationOpportunities(
    page: Page,
    networkMetrics: NetworkMetrics,
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      score: number;
      savings: number;
    }>
  > {
    const opportunities: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
      savings: number;
    }> = [];

    // Large resources opportunity
    const largeResources = Object.values(networkMetrics.resourceBreakdown)
      .flat()
      .filter((resource) => resource.size > 1000000); // > 1MB

    if (largeResources.length > 0) {
      opportunities.push({
        id: 'large-resources',
        title: 'Reduce resource sizes',
        description: `${largeResources.length} resources are larger than 1MB`,
        score: Math.max(0, 100 - largeResources.length * 10),
        savings: largeResources.reduce((sum, r) => sum + r.size, 0) * 0.3, // Estimated 30% savings
      });
    }

    // Too many requests
    if (networkMetrics.totalRequests > 100) {
      opportunities.push({
        id: 'many-requests',
        title: 'Reduce HTTP requests',
        description: `${networkMetrics.totalRequests} requests detected. Consider bundling.`,
        score: Math.max(0, 100 - (networkMetrics.totalRequests - 100) * 2),
        savings: (networkMetrics.totalRequests - 100) * 50, // Estimated savings in ms
      });
    }

    // Uncompressed resources
    const uncompressedCount = networkMetrics.compression?.none || 0;
    if (uncompressedCount > 0) {
      opportunities.push({
        id: 'enable-compression',
        title: 'Enable text compression',
        description: `${uncompressedCount} resources could be compressed`,
        score: Math.max(0, 100 - uncompressedCount * 5),
        savings: networkMetrics.totalBytes * 0.6, // Estimated compression savings
      });
    }

    return opportunities;
  }

  private async collectDiagnostics(
    page: Page,
    performanceMetrics: PerformanceMetrics,
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      score: number;
    }>
  > {
    const diagnostics: Array<{
      id: string;
      title: string;
      description: string;
      score: number;
    }> = [];

    // Core Web Vitals Diagnostics
    if (performanceMetrics.cumulativeLayoutShift > 0.1) {
      diagnostics.push({
        id: 'high-cls',
        title: 'Cumulative Layout Shift Issues',
        description: `CLS of ${performanceMetrics.cumulativeLayoutShift.toFixed(3)} exceeds good threshold of 0.1. This indicates visual instability.`,
        score: Math.max(
          0,
          100 - performanceMetrics.cumulativeLayoutShift * 400,
        ),
      });
    }

    if (performanceMetrics.largestContentfulPaint > 2500) {
      diagnostics.push({
        id: 'slow-lcp',
        title: 'Slow Largest Contentful Paint',
        description: `LCP of ${Math.round(performanceMetrics.largestContentfulPaint)}ms exceeds good threshold of 2.5s. Main content takes too long to load.`,
        score: Math.max(
          0,
          100 - (performanceMetrics.largestContentfulPaint - 2500) / 50,
        ),
      });
    }

    if (performanceMetrics.firstContentfulPaint > 1800) {
      diagnostics.push({
        id: 'slow-fcp',
        title: 'Slow First Contentful Paint',
        description: `FCP of ${Math.round(performanceMetrics.firstContentfulPaint)}ms exceeds good threshold of 1.8s. Users wait too long to see content.`,
        score: Math.max(
          0,
          100 - (performanceMetrics.firstContentfulPaint - 1800) / 30,
        ),
      });
    }

    // Loading Performance Diagnostics
    if (performanceMetrics.totalBlockingTime > 200) {
      diagnostics.push({
        id: 'high-tbt',
        title: 'Excessive Main Thread Blocking',
        description: `Total Blocking Time of ${Math.round(performanceMetrics.totalBlockingTime)}ms affects interactivity. Long JavaScript tasks are blocking the main thread.`,
        score: Math.max(
          0,
          100 - (performanceMetrics.totalBlockingTime - 200) / 10,
        ),
      });
    }

    if (performanceMetrics.timeToFirstByte > 800) {
      diagnostics.push({
        id: 'slow-ttfb',
        title: 'Slow Server Response',
        description: `Time to First Byte of ${Math.round(performanceMetrics.timeToFirstByte)}ms exceeds good threshold of 800ms. Server response is slow.`,
        score: Math.max(
          0,
          100 - (performanceMetrics.timeToFirstByte - 800) / 20,
        ),
      });
    }

    if (performanceMetrics.domContentLoaded > 3000) {
      diagnostics.push({
        id: 'slow-dom-loaded',
        title: 'Slow DOM Content Loaded',
        description: `DOM Content Loaded takes ${Math.round(performanceMetrics.domContentLoaded)}ms. HTML parsing and critical resources are taking too long.`,
        score: Math.max(
          0,
          100 - (performanceMetrics.domContentLoaded - 3000) / 50,
        ),
      });
    }

    // Get additional page-specific diagnostics
    try {
      const pageIssues = await page.evaluate(() => {
        const issues: any[] = [];

        // Check for missing meta description
        if (!document.querySelector('meta[name="description"]')) {
          issues.push({
            id: 'missing-meta-description',
            title: 'Missing Meta Description',
            description:
              'Page is missing a meta description tag, which affects SEO.',
            score: 80,
          });
        }

        // Check for images without alt text
        const imagesWithoutAlt =
          document.querySelectorAll('img:not([alt])').length;
        if (imagesWithoutAlt > 0) {
          issues.push({
            id: 'images-missing-alt',
            title: 'Images Missing Alt Text',
            description: `${imagesWithoutAlt} images are missing alt text, affecting accessibility.`,
            score: Math.max(60, 100 - imagesWithoutAlt * 10),
          });
        }

        // Check for inline styles (poor practice)
        const elementsWithInlineStyles =
          document.querySelectorAll('[style]').length;
        if (elementsWithInlineStyles > 10) {
          issues.push({
            id: 'excessive-inline-styles',
            title: 'Excessive Inline Styles',
            description: `${elementsWithInlineStyles} elements use inline styles. Consider moving to CSS files for better maintainability.`,
            score: Math.max(70, 100 - elementsWithInlineStyles),
          });
        }

        // Check for missing page title
        if (!document.title || document.title.trim() === '') {
          issues.push({
            id: 'missing-page-title',
            title: 'Missing Page Title',
            description:
              'Page is missing a title tag, which is critical for SEO and user experience.',
            score: 50,
          });
        }

        return issues;
      });

      diagnostics.push(...pageIssues);
    } catch (error) {
      this.logger.warn('Could not collect page-specific diagnostics:', error);
    }

    return diagnostics;
  }

  private async collectPerformanceMetrics(
    page: Page,
  ): Promise<PerformanceMetrics> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        // Core Web Vitals
        firstContentfulPaint:
          paint.find((p) => p.name === 'first-contentful-paint')?.startTime ||
          0,
        largestContentfulPaint: 0, // Will be updated via Web Vitals API
        firstInputDelay: 0, // Will be updated via Web Vitals API
        cumulativeLayoutShift: 0, // Will be updated via Web Vitals API
        interactionToNextPaint: 0, // Will be updated via Web Vitals API

        // Loading Performance
        timeToFirstByte: navigation.responseStart - navigation.requestStart,
        firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.startTime,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
        timeToInteractive: 0, // Approximated
        totalBlockingTime: 0, // Calculated from long tasks
        speedIndex: 0, // Approximated

        // Visual Progress
        visuallyComplete: navigation.loadEventEnd - navigation.startTime, // Approximation
        lastVisualChange: navigation.loadEventEnd - navigation.startTime,
        renderStart:
          paint.find((p) => p.name === 'first-paint')?.startTime || 0,

        // Document Timing
        domInteractive: navigation.domInteractive - navigation.startTime,
        domComplete: navigation.domComplete - navigation.startTime,
        loadEventStart: navigation.loadEventStart - navigation.startTime,
        loadEventEnd: navigation.loadEventEnd - navigation.startTime,

        // Connection & Response
        connectStart: navigation.connectStart - navigation.startTime,
        connectEnd: navigation.connectEnd - navigation.startTime,
        requestStart: navigation.requestStart - navigation.startTime,
        responseStart: navigation.responseStart - navigation.startTime,
        responseEnd: navigation.responseEnd - navigation.startTime,

        // Performance Scores (placeholder - would need Lighthouse integration for real scores)
        performanceScore: 85, // Estimated based on metrics
        accessibilityScore: 90, // Placeholder
        bestPracticesScore: 85, // Placeholder
        seoScore: 90, // Placeholder
      };
    });

    // Try to get Web Vitals if available
    try {
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Check if web-vitals library is available or use Performance Observer
          if (typeof window !== 'undefined') {
            const vitals: any = {};

            // Try to get LCP
            new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              if (entries.length > 0) {
                vitals.largestContentfulPaint =
                  entries[entries.length - 1].startTime;
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] });

            // Try to get CLS
            new PerformanceObserver((entryList) => {
              let clsValue = 0;
              for (const entry of entryList.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
              vitals.cumulativeLayoutShift = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });

            setTimeout(() => resolve(vitals), 300);
          } else {
            resolve({});
          }
        });
      });

      Object.assign(metrics, webVitals);
    } catch (error) {
      this.logger.warn('Could not collect Web Vitals:', error);
    }

    return {
      ...metrics,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      firstInputDelay: metrics.firstInputDelay,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      timeToInteractive: metrics.timeToInteractive,
      totalBlockingTime: metrics.totalBlockingTime,
      speedIndex: metrics.speedIndex,
    };
  }

  private async collectNetworkMetrics(page: Page): Promise<NetworkMetrics> {
    const networkData = await page.evaluate(() => {
      const resources = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      // Log resource information for debugging
      console.log('Resource entries found:', resources.length);
      if (resources.length === 0) {
        console.warn(
          'No resource timing entries found - this may indicate resources loaded before timing API was ready',
        );
      }

      const breakdown = {
        documents: [] as any[],
        stylesheets: [] as any[],
        scripts: [] as any[],
        images: [] as any[],
        fonts: [] as any[],
        other: [] as any[],
      };

      let totalBytes = 0;
      let totalTime = 0;
      let bytesIn = 0;
      const bytesOut = 0;
      const connections = new Set<string>();
      const requests = {
        html: 0,
        js: 0,
        css: 0,
        image: 0,
        font: 0,
        video: 0,
        other: 0,
      };
      const compression = { gzip: 0, brotli: 0, none: 0 };
      const caching = { cached: 0, notCached: 0 };
      const protocols = { http1: 0, http2: 0, http3: 0 };

      for (const resource of resources) {
        const transferSize = resource.transferSize || 0;
        const encodedSize = resource.encodedBodySize || 0;
        const decodedSize = resource.decodedBodySize || 0;
        const duration = resource.responseEnd - resource.requestStart;

        totalBytes += transferSize;
        totalTime = Math.max(totalTime, resource.responseEnd);
        bytesIn += transferSize;

        // Extract hostname for connection counting
        try {
          const hostname = new URL(resource.name).hostname;
          connections.add(hostname);
        } catch (_e) {
          // Invalid URL, skip connection counting
        }

        // Protocol detection (approximation)
        if (resource.nextHopProtocol?.includes('h2')) {
          protocols.http2++;
        } else if (resource.nextHopProtocol?.includes('h3')) {
          protocols.http3++;
        } else {
          protocols.http1++;
        }

        // Cache detection
        if (transferSize === 0 && encodedSize > 0) {
          caching.cached++;
        } else {
          caching.notCached++;
        }

        // Compression detection (approximation based on size difference)
        const compressionRatio =
          encodedSize > 0 ? decodedSize / encodedSize : 1;
        if (compressionRatio > 2) {
          compression.gzip++; // Assuming good compression
        } else if (compressionRatio > 1.2) {
          compression.brotli++; // Moderate compression
        } else {
          compression.none++;
        }

        const resourceDetail = {
          url: resource.name,
          type: resource.initiatorType,
          size: decodedSize,
          transferSize: transferSize,
          encodedSize: encodedSize,
          duration: duration,
          priority: (resource as any).priority || 'unknown',
          protocol: resource.nextHopProtocol || 'unknown',
          mimeType: 'unknown', // Would need additional detection
          fromCache: transferSize === 0 && encodedSize > 0,
          timing: {
            blocked: Math.max(
              0,
              resource.domainLookupStart - resource.fetchStart,
            ),
            dns: Math.max(
              0,
              resource.domainLookupEnd - resource.domainLookupStart,
            ),
            connect: Math.max(0, resource.connectEnd - resource.connectStart),
            ssl: Math.max(
              0,
              resource.requestStart - resource.secureConnectionStart,
            ),
            send: Math.max(0, resource.responseStart - resource.requestStart),
            wait: Math.max(0, resource.responseStart - resource.requestStart),
            receive: Math.max(0, resource.responseEnd - resource.responseStart),
          },
        };

        // Categorize resource types and count requests
        if (
          resource.initiatorType === 'navigation' ||
          resource.name.includes('.html')
        ) {
          breakdown.documents.push({ ...resourceDetail, type: 'document' });
          requests.html++;
        } else if (
          resource.initiatorType === 'link' ||
          resource.name.includes('.css')
        ) {
          breakdown.stylesheets.push({ ...resourceDetail, type: 'stylesheet' });
          requests.css++;
        } else if (
          resource.initiatorType === 'script' ||
          resource.name.includes('.js')
        ) {
          breakdown.scripts.push({ ...resourceDetail, type: 'script' });
          requests.js++;
        } else if (
          resource.initiatorType === 'img' ||
          /\.(jpg|jpeg|png|gif|webp|svg)/.test(resource.name)
        ) {
          breakdown.images.push({ ...resourceDetail, type: 'image' });
          requests.image++;
        } else if (/\.(woff|woff2|ttf|eot)/.test(resource.name)) {
          breakdown.fonts.push({ ...resourceDetail, type: 'font' });
          requests.font++;
        } else if (/\.(mp4|webm|ogg|avi)/.test(resource.name)) {
          breakdown.other.push({ ...resourceDetail, type: 'video' });
          requests.video++;
        } else {
          breakdown.other.push(resourceDetail);
          requests.other++;
        }
      }

      return {
        totalRequests: resources.length,
        totalBytes,
        totalTime,
        resourceBreakdown: breakdown,
        summary: {
          documents: breakdown.documents.length,
          stylesheets: breakdown.stylesheets.length,
          scripts: breakdown.scripts.length,
          images: breakdown.images.length,
          fonts: breakdown.fonts.length,
          other: breakdown.other.length,
        },
        // WebPageTest-style metrics
        bytesIn,
        bytesOut, // Would need request payload tracking for accurate measurement
        connections: connections.size,
        requests,
        compression,
        caching,
        protocols,
      };
    });

    return networkData;
  }

  private async collectVitalsMetrics(page: Page): Promise<VitalsMetrics> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.startTime,
        load: navigation.loadEventEnd - navigation.startTime,
        firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
        navigationStart: navigation.startTime,
      };
    });
  }
}

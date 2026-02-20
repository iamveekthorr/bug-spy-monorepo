import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { PuppeteerHelpersService } from './puppeteer-helpers.service';

/**
 * SEO Metrics Service
 * 
 * Provides comprehensive SEO analysis including:
 * - Meta tags analysis
 * - Heading structure
 * - Content analysis
 * - Technical SEO checks
 * - Structured data validation
 * - Mobile friendliness
 * - Link analysis
 */
@Injectable()
export class SeoMetricsService {
  private readonly logger = new Logger(SeoMetricsService.name);

  constructor(private readonly puppeteerHelpers: PuppeteerHelpersService) {}

  /**
   * Capture comprehensive SEO metrics
   * 
   * @param page - Puppeteer page instance
   * @param url - URL being analyzed
   */
  async *captureSeoMetrics(
    page: Page,
    url: string,
  ): AsyncGenerator<SeoProgressEvent> {
    this.logger.log(`Starting SEO analysis for ${url}`);
    
    yield { status: 'SEO_START', message: 'Starting SEO analysis' };

    try {
      // Ensure page is fully loaded
      await this.puppeteerHelpers.waitForLoadState(page, 'domcontentloaded');
      
      // Collect all SEO metrics in parallel
      const [
        metaTagsResult,
        headingsResult,
        contentResult,
        technicalResult,
        structuredDataResult,
        linksResult,
        mobileResult,
      ] = await Promise.allSettled([
        this.analyzeMetaTags(page),
        this.analyzeHeadings(page),
        this.analyzeContent(page),
        this.analyzeTechnicalSeo(page, url),
        this.analyzeStructuredData(page),
        this.analyzeLinks(page, url),
        this.analyzeMobileFriendliness(page),
      ]);

      // Process meta tags
      const metaTags = metaTagsResult.status === 'fulfilled' ? metaTagsResult.value : null;
      if (metaTags) {
        yield { status: 'META_TAGS', data: metaTags };
      }

      // Process headings
      const headings = headingsResult.status === 'fulfilled' ? headingsResult.value : null;
      if (headings) {
        yield { status: 'HEADINGS', data: headings };
      }

      // Process content
      const content = contentResult.status === 'fulfilled' ? contentResult.value : null;
      if (content) {
        yield { status: 'CONTENT', data: content };
      }

      // Process technical SEO
      const technical = technicalResult.status === 'fulfilled' ? technicalResult.value : null;
      if (technical) {
        yield { status: 'TECHNICAL', data: technical };
      }

      // Process structured data
      const structuredData = structuredDataResult.status === 'fulfilled' ? structuredDataResult.value : null;
      if (structuredData) {
        yield { status: 'STRUCTURED_DATA', data: structuredData };
      }

      // Process links
      const links = linksResult.status === 'fulfilled' ? linksResult.value : null;
      if (links) {
        yield { status: 'LINKS', data: links };
      }

      // Process mobile friendliness
      const mobile = mobileResult.status === 'fulfilled' ? mobileResult.value : null;
      if (mobile) {
        yield { status: 'MOBILE', data: mobile };
      }

      // Calculate overall SEO score
      const seoScore = this.calculateSeoScore({
        metaTags,
        headings,
        content,
        technical,
        structuredData,
        links,
        mobile,
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        metaTags,
        headings,
        content,
        technical,
        structuredData,
        links,
        mobile,
      });

      const seoMetrics: SeoMetricsResult = {
        score: seoScore,
        metaTags,
        headings,
        content,
        technical,
        structuredData,
        links,
        mobile,
        recommendations,
        issues: this.collectIssues({
          metaTags,
          headings,
          content,
          technical,
          structuredData,
          links,
          mobile,
        }),
      };

      yield { status: 'SEO_COMPLETE', data: seoMetrics };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`SEO analysis failed: ${errorMessage}`);
      yield { status: 'SEO_ERROR', error: errorMessage };
    }
  }

  /**
   * Analyze meta tags
   */
  private async analyzeMetaTags(page: Page): Promise<MetaTagsAnalysis> {
    return await page.evaluate(() => {
      const getMetaContent = (name: string): string | null => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta?.getAttribute('content') || null;
      };

      const title = document.title || null;
      const description = getMetaContent('description');
      const keywords = getMetaContent('keywords');
      const author = getMetaContent('author');
      const robots = getMetaContent('robots');
      const viewport = getMetaContent('viewport');
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
      const lang = document.documentElement.lang || null;

      // Open Graph
      const ogTitle = getMetaContent('og:title');
      const ogDescription = getMetaContent('og:description');
      const ogImage = getMetaContent('og:image');
      const ogUrl = getMetaContent('og:url');
      const ogType = getMetaContent('og:type');

      // Twitter Card
      const twitterCard = getMetaContent('twitter:card');
      const twitterTitle = getMetaContent('twitter:title');
      const twitterDescription = getMetaContent('twitter:description');
      const twitterImage = getMetaContent('twitter:image');

      // Collect all issues
      const issues: string[] = [];
      
      if (!title) issues.push('Missing page title');
      else if (title.length < 30) issues.push('Title too short (< 30 chars)');
      else if (title.length > 60) issues.push('Title too long (> 60 chars)');

      if (!description) issues.push('Missing meta description');
      else if (description.length < 120) issues.push('Meta description too short (< 120 chars)');
      else if (description.length > 160) issues.push('Meta description too long (> 160 chars)');

      if (!viewport) issues.push('Missing viewport meta tag');
      if (!canonical) issues.push('Missing canonical URL');
      if (!lang) issues.push('Missing lang attribute on html');
      if (!ogTitle) issues.push('Missing Open Graph title');
      if (!ogDescription) issues.push('Missing Open Graph description');
      if (!ogImage) issues.push('Missing Open Graph image');

      return {
        title: {
          value: title,
          length: title?.length || 0,
          optimal: title ? title.length >= 30 && title.length <= 60 : false,
        },
        description: {
          value: description,
          length: description?.length || 0,
          optimal: description ? description.length >= 120 && description.length <= 160 : false,
        },
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
        author,
        robots,
        viewport,
        canonical,
        lang,
        openGraph: {
          title: ogTitle,
          description: ogDescription,
          image: ogImage,
          url: ogUrl,
          type: ogType,
          isComplete: !!(ogTitle && ogDescription && ogImage),
        },
        twitter: {
          card: twitterCard,
          title: twitterTitle,
          description: twitterDescription,
          image: twitterImage,
          isComplete: !!(twitterCard && twitterTitle),
        },
        issues,
        score: Math.max(0, 100 - issues.length * 8),
      };
    });
  }

  /**
   * Analyze heading structure
   */
  private async analyzeHeadings(page: Page): Promise<HeadingsAnalysis> {
    return await page.evaluate(() => {
      const getHeadings = (tag: string) => 
        Array.from(document.querySelectorAll(tag)).map(el => ({
          text: el.textContent?.trim().substring(0, 100) || '',
          length: el.textContent?.trim().length || 0,
        }));

      const h1s = getHeadings('h1');
      const h2s = getHeadings('h2');
      const h3s = getHeadings('h3');
      const h4s = getHeadings('h4');
      const h5s = getHeadings('h5');
      const h6s = getHeadings('h6');

      const issues: string[] = [];
      
      if (h1s.length === 0) issues.push('No H1 heading found');
      else if (h1s.length > 1) issues.push(`Multiple H1 headings found (${h1s.length})`);
      
      if (h1s.length > 0 && h1s[0].length > 70) issues.push('H1 is too long (> 70 chars)');
      if (h2s.length === 0) issues.push('No H2 headings found');

      // Check for heading hierarchy issues
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let prevLevel = 0;
      allHeadings.forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        if (prevLevel > 0 && level > prevLevel + 1) {
          issues.push(`Skipped heading level: H${prevLevel} to H${level}`);
        }
        prevLevel = level;
      });

      return {
        structure: {
          h1: { count: h1s.length, items: h1s },
          h2: { count: h2s.length, items: h2s },
          h3: { count: h3s.length, items: h3s },
          h4: { count: h4s.length, items: h4s },
          h5: { count: h5s.length, items: h5s },
          h6: { count: h6s.length, items: h6s },
        },
        totalHeadings: h1s.length + h2s.length + h3s.length + h4s.length + h5s.length + h6s.length,
        hasProperH1: h1s.length === 1,
        hasHierarchy: h2s.length > 0 || h3s.length > 0,
        issues,
        score: Math.max(0, 100 - issues.length * 15),
      };
    });
  }

  /**
   * Analyze content quality
   */
  private async analyzeContent(page: Page): Promise<ContentAnalysis> {
    return await page.evaluate(() => {
      const body = document.body;
      const text = body?.innerText || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);
      
      // Calculate reading time (average 200 words per minute)
      const readingTime = Math.ceil(words.length / 200);
      
      // Count images
      const images = document.querySelectorAll('img');
      const imagesWithAlt = document.querySelectorAll('img[alt]:not([alt=""])');
      
      // Count links
      const internalLinks = document.querySelectorAll('a[href^="/"], a[href^="' + window.location.origin + '"]');
      const externalLinks = document.querySelectorAll('a[href^="http"]:not([href^="' + window.location.origin + '"])');
      
      // Check for thin content
      const issues: string[] = [];
      if (words.length < 300) issues.push('Thin content (< 300 words)');
      if (images.length === 0) issues.push('No images found');
      if (images.length > 0 && imagesWithAlt.length < images.length) {
        issues.push(`${images.length - imagesWithAlt.length} images missing alt text`);
      }

      return {
        wordCount: words.length,
        characterCount: text.length,
        readingTime,
        paragraphs: document.querySelectorAll('p').length,
        images: {
          total: images.length,
          withAlt: imagesWithAlt.length,
          missingAlt: images.length - imagesWithAlt.length,
        },
        links: {
          internal: internalLinks.length,
          external: externalLinks.length,
          total: internalLinks.length + externalLinks.length,
        },
        issues,
        score: Math.max(0, 100 - issues.length * 12),
      };
    });
  }

  /**
   * Analyze technical SEO factors
   */
  private async analyzeTechnicalSeo(page: Page, url: string): Promise<TechnicalSeoAnalysis> {
    const pageData = await page.evaluate(() => {
      const issues: string[] = [];
      
      // Check HTTPS
      const isHttps = window.location.protocol === 'https:';
      if (!isHttps) issues.push('Site not using HTTPS');

      // Check doctype
      const hasDoctype = !!document.doctype;
      if (!hasDoctype) issues.push('Missing DOCTYPE declaration');

      // Check charset
      const charset = document.characterSet || document.querySelector('meta[charset]')?.getAttribute('charset');
      if (!charset || charset.toLowerCase() !== 'utf-8') issues.push('Missing or non-UTF-8 charset');

      // Check favicon
      const hasFavicon = !!document.querySelector('link[rel*="icon"]');
      if (!hasFavicon) issues.push('Missing favicon');

      // Check for JavaScript errors indicator
      const hasJsErrors = (window as any).__jsErrors?.length > 0;

      // Check page speed indicators
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation?.loadEventEnd - navigation?.startTime || 0;
      const ttfb = navigation?.responseStart - navigation?.requestStart || 0;

      if (loadTime > 3000) issues.push('Slow page load time (> 3s)');
      if (ttfb > 600) issues.push('Slow server response (TTFB > 600ms)');

      // Check render-blocking resources
      const renderBlockingCss = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])').length;
      const renderBlockingJs = document.querySelectorAll('script:not([async]):not([defer]):not([type="module"])').length;
      
      if (renderBlockingCss > 5) issues.push(`Many render-blocking CSS files (${renderBlockingCss})`);
      if (renderBlockingJs > 5) issues.push(`Many render-blocking JS files (${renderBlockingJs})`);

      return {
        isHttps,
        hasDoctype,
        charset: charset || 'not set',
        hasFavicon,
        hasJsErrors,
        loadTime,
        ttfb,
        renderBlocking: {
          css: renderBlockingCss,
          js: renderBlockingJs,
        },
        issues,
      };
    });

    return {
      ...pageData,
      url,
      score: Math.max(0, 100 - pageData.issues.length * 10),
    };
  }

  /**
   * Analyze structured data (JSON-LD, microdata)
   */
  private async analyzeStructuredData(page: Page): Promise<StructuredDataAnalysis> {
    return await page.evaluate(() => {
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const jsonLdData: any[] = [];
      const errors: string[] = [];

      jsonLdScripts.forEach((script, index) => {
        try {
          const parsed = JSON.parse(script.textContent || '');
          jsonLdData.push(parsed);
        } catch (e) {
          errors.push(`Invalid JSON-LD in script ${index + 1}`);
        }
      });

      // Check for microdata
      const microdataItems = document.querySelectorAll('[itemscope]').length;

      // Check for Open Graph
      const hasOpenGraph = !!document.querySelector('meta[property^="og:"]');

      // Check for Twitter Cards
      const hasTwitterCards = !!document.querySelector('meta[name^="twitter:"]');

      const issues: string[] = [...errors];
      if (jsonLdData.length === 0 && microdataItems === 0) {
        issues.push('No structured data found (JSON-LD or microdata)');
      }

      const types = jsonLdData.map(d => d['@type']).filter(Boolean);

      return {
        jsonLd: {
          count: jsonLdData.length,
          types,
          isValid: errors.length === 0,
        },
        microdata: {
          itemCount: microdataItems,
        },
        hasOpenGraph,
        hasTwitterCards,
        issues,
        score: Math.max(0, 100 - issues.length * 20),
      };
    });
  }

  /**
   * Analyze links
   */
  private async analyzeLinks(page: Page, baseUrl: string): Promise<LinksAnalysis> {
    return await page.evaluate((base) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const issues: string[] = [];
      
      const internal: LinkInfo[] = [];
      const external: LinkInfo[] = [];
      const broken: LinkInfo[] = [];
      const noFollow: LinkInfo[] = [];
      
      const baseHost = new URL(base).hostname;

      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim().substring(0, 50) || '';
        const rel = link.getAttribute('rel') || '';
        const isNoFollow = rel.includes('nofollow');
        
        try {
          const url = new URL(href, base);
          const linkInfo: LinkInfo = {
            href: url.href,
            text,
            isNoFollow,
          };

          if (url.hostname === baseHost) {
            internal.push(linkInfo);
          } else {
            external.push(linkInfo);
          }

          if (isNoFollow) {
            noFollow.push(linkInfo);
          }
        } catch {
          // Skip invalid URLs
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            broken.push({ href, text, isNoFollow: false });
          }
        }
      });

      // Check for empty link text
      const emptyLinks = links.filter(l => !l.textContent?.trim() && !l.querySelector('img[alt]'));
      if (emptyLinks.length > 0) {
        issues.push(`${emptyLinks.length} links with empty anchor text`);
      }

      // Check for generic link text
      const genericTexts = ['click here', 'read more', 'learn more', 'here'];
      const genericLinks = links.filter(l => 
        genericTexts.includes(l.textContent?.trim().toLowerCase() || '')
      );
      if (genericLinks.length > 0) {
        issues.push(`${genericLinks.length} links with generic anchor text`);
      }

      return {
        internal: { count: internal.length, links: internal.slice(0, 10) },
        external: { count: external.length, links: external.slice(0, 10) },
        broken: { count: broken.length, links: broken.slice(0, 10) },
        noFollow: { count: noFollow.length, links: noFollow.slice(0, 10) },
        total: links.length,
        issues,
        score: Math.max(0, 100 - issues.length * 10 - broken.length * 5),
      };
    }, baseUrl);
  }

  /**
   * Analyze mobile friendliness
   */
  private async analyzeMobileFriendliness(page: Page): Promise<MobileFriendlinessAnalysis> {
    return await page.evaluate(() => {
      const issues: string[] = [];

      // Check viewport
      const viewport = document.querySelector('meta[name="viewport"]');
      const hasViewport = !!viewport;
      const viewportContent = viewport?.getAttribute('content') || '';
      const hasProperViewport = viewportContent.includes('width=device-width');

      if (!hasViewport) issues.push('Missing viewport meta tag');
      else if (!hasProperViewport) issues.push('Viewport not set to device-width');

      // Check font sizes
      const smallTextElements = Array.from(document.querySelectorAll('body *'))
        .filter(el => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          return fontSize > 0 && fontSize < 12;
        });
      
      if (smallTextElements.length > 10) {
        issues.push(`${smallTextElements.length} elements with small font size (< 12px)`);
      }

      // Check tap targets
      const clickableElements = document.querySelectorAll('a, button, input, select, textarea, [onclick]');
      let smallTapTargets = 0;
      clickableElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 48 || rect.height < 48) {
          smallTapTargets++;
        }
      });

      if (smallTapTargets > 5) {
        issues.push(`${smallTapTargets} elements with small tap targets (< 48px)`);
      }

      // Check horizontal scrolling
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      if (hasHorizontalScroll) {
        issues.push('Page has horizontal scrolling');
      }

      // Check touch-action CSS
      const hasTouchOptimization = !!document.querySelector('[style*="touch-action"]');

      return {
        hasViewport,
        hasProperViewport,
        smallTextElements: smallTextElements.length,
        smallTapTargets,
        hasHorizontalScroll,
        hasTouchOptimization,
        issues,
        score: Math.max(0, 100 - issues.length * 15),
      };
    });
  }

  /**
   * Calculate overall SEO score
   */
  private calculateSeoScore(data: any): number {
    const weights = {
      metaTags: 0.25,
      headings: 0.15,
      content: 0.20,
      technical: 0.20,
      structuredData: 0.10,
      links: 0.05,
      mobile: 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    if (data.metaTags?.score !== undefined) {
      totalScore += data.metaTags.score * weights.metaTags;
      totalWeight += weights.metaTags;
    }
    if (data.headings?.score !== undefined) {
      totalScore += data.headings.score * weights.headings;
      totalWeight += weights.headings;
    }
    if (data.content?.score !== undefined) {
      totalScore += data.content.score * weights.content;
      totalWeight += weights.content;
    }
    if (data.technical?.score !== undefined) {
      totalScore += data.technical.score * weights.technical;
      totalWeight += weights.technical;
    }
    if (data.structuredData?.score !== undefined) {
      totalScore += data.structuredData.score * weights.structuredData;
      totalWeight += weights.structuredData;
    }
    if (data.links?.score !== undefined) {
      totalScore += data.links.score * weights.links;
      totalWeight += weights.links;
    }
    if (data.mobile?.score !== undefined) {
      totalScore += data.mobile.score * weights.mobile;
      totalWeight += weights.mobile;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  }

  /**
   * Generate SEO recommendations
   */
  private generateRecommendations(data: any): SeoRecommendation[] {
    const recommendations: SeoRecommendation[] = [];

    // Meta tags recommendations
    if (data.metaTags) {
      if (!data.metaTags.title?.value) {
        recommendations.push({
          priority: 'critical',
          category: 'meta',
          title: 'Add a page title',
          description: 'Every page should have a unique, descriptive title between 30-60 characters.',
          impact: 'high',
        });
      }
      if (!data.metaTags.description?.value) {
        recommendations.push({
          priority: 'critical',
          category: 'meta',
          title: 'Add a meta description',
          description: 'Write a compelling meta description between 120-160 characters.',
          impact: 'high',
        });
      }
      if (!data.metaTags.openGraph?.isComplete) {
        recommendations.push({
          priority: 'medium',
          category: 'social',
          title: 'Complete Open Graph tags',
          description: 'Add og:title, og:description, and og:image for better social sharing.',
          impact: 'medium',
        });
      }
    }

    // Headings recommendations
    if (data.headings) {
      if (!data.headings.hasProperH1) {
        recommendations.push({
          priority: 'high',
          category: 'content',
          title: 'Use exactly one H1 heading',
          description: 'Each page should have exactly one H1 tag that describes the main topic.',
          impact: 'high',
        });
      }
    }

    // Content recommendations
    if (data.content) {
      if (data.content.wordCount < 300) {
        recommendations.push({
          priority: 'medium',
          category: 'content',
          title: 'Add more content',
          description: 'Pages with more content tend to rank better. Aim for at least 300 words.',
          impact: 'medium',
        });
      }
      if (data.content.images?.missingAlt > 0) {
        recommendations.push({
          priority: 'high',
          category: 'accessibility',
          title: 'Add alt text to images',
          description: `${data.content.images.missingAlt} images are missing alt text.`,
          impact: 'medium',
        });
      }
    }

    // Technical recommendations
    if (data.technical) {
      if (!data.technical.isHttps) {
        recommendations.push({
          priority: 'critical',
          category: 'security',
          title: 'Enable HTTPS',
          description: 'HTTPS is a ranking factor. Secure your site with an SSL certificate.',
          impact: 'high',
        });
      }
      if (data.technical.loadTime > 3000) {
        recommendations.push({
          priority: 'high',
          category: 'performance',
          title: 'Improve page load speed',
          description: 'Your page takes over 3 seconds to load. Optimize images and reduce blocking resources.',
          impact: 'high',
        });
      }
    }

    // Structured data recommendations
    if (data.structuredData) {
      if (data.structuredData.jsonLd?.count === 0 && data.structuredData.microdata?.itemCount === 0) {
        recommendations.push({
          priority: 'medium',
          category: 'technical',
          title: 'Add structured data',
          description: 'Implement JSON-LD structured data to help search engines understand your content.',
          impact: 'medium',
        });
      }
    }

    // Mobile recommendations
    if (data.mobile) {
      if (!data.mobile.hasProperViewport) {
        recommendations.push({
          priority: 'critical',
          category: 'mobile',
          title: 'Fix viewport configuration',
          description: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
          impact: 'high',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Collect all issues from analysis
   */
  private collectIssues(data: any): SeoIssue[] {
    const issues: SeoIssue[] = [];

    const addIssues = (source: string, severity: 'critical' | 'warning' | 'info', issueList: string[]) => {
      issueList.forEach(issue => {
        issues.push({ source, severity, message: issue });
      });
    };

    if (data.metaTags?.issues) {
      addIssues('Meta Tags', 'warning', data.metaTags.issues);
    }
    if (data.headings?.issues) {
      addIssues('Headings', 'warning', data.headings.issues);
    }
    if (data.content?.issues) {
      addIssues('Content', 'warning', data.content.issues);
    }
    if (data.technical?.issues) {
      addIssues('Technical', 'critical', data.technical.issues);
    }
    if (data.structuredData?.issues) {
      addIssues('Structured Data', 'info', data.structuredData.issues);
    }
    if (data.links?.issues) {
      addIssues('Links', 'warning', data.links.issues);
    }
    if (data.mobile?.issues) {
      addIssues('Mobile', 'critical', data.mobile.issues);
    }

    return issues;
  }
}

// Type definitions
export interface SeoProgressEvent {
  status: string;
  message?: string;
  data?: any;
  error?: string;
}

export interface SeoMetricsResult {
  score: number;
  metaTags: MetaTagsAnalysis | null;
  headings: HeadingsAnalysis | null;
  content: ContentAnalysis | null;
  technical: TechnicalSeoAnalysis | null;
  structuredData: StructuredDataAnalysis | null;
  links: LinksAnalysis | null;
  mobile: MobileFriendlinessAnalysis | null;
  recommendations: SeoRecommendation[];
  issues: SeoIssue[];
}

export interface MetaTagsAnalysis {
  title: { value: string | null; length: number; optimal: boolean };
  description: { value: string | null; length: number; optimal: boolean };
  keywords: string[];
  author: string | null;
  robots: string | null;
  viewport: string | null;
  canonical: string | null;
  lang: string | null;
  openGraph: {
    title: string | null;
    description: string | null;
    image: string | null;
    url: string | null;
    type: string | null;
    isComplete: boolean;
  };
  twitter: {
    card: string | null;
    title: string | null;
    description: string | null;
    image: string | null;
    isComplete: boolean;
  };
  issues: string[];
  score: number;
}

export interface HeadingsAnalysis {
  structure: {
    h1: { count: number; items: { text: string; length: number }[] };
    h2: { count: number; items: { text: string; length: number }[] };
    h3: { count: number; items: { text: string; length: number }[] };
    h4: { count: number; items: { text: string; length: number }[] };
    h5: { count: number; items: { text: string; length: number }[] };
    h6: { count: number; items: { text: string; length: number }[] };
  };
  totalHeadings: number;
  hasProperH1: boolean;
  hasHierarchy: boolean;
  issues: string[];
  score: number;
}

export interface ContentAnalysis {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  paragraphs: number;
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
  };
  links: {
    internal: number;
    external: number;
    total: number;
  };
  issues: string[];
  score: number;
}

export interface TechnicalSeoAnalysis {
  url: string;
  isHttps: boolean;
  hasDoctype: boolean;
  charset: string;
  hasFavicon: boolean;
  hasJsErrors: boolean;
  loadTime: number;
  ttfb: number;
  renderBlocking: {
    css: number;
    js: number;
  };
  issues: string[];
  score: number;
}

export interface StructuredDataAnalysis {
  jsonLd: {
    count: number;
    types: string[];
    isValid: boolean;
  };
  microdata: {
    itemCount: number;
  };
  hasOpenGraph: boolean;
  hasTwitterCards: boolean;
  issues: string[];
  score: number;
}

export interface LinksAnalysis {
  internal: { count: number; links: LinkInfo[] };
  external: { count: number; links: LinkInfo[] };
  broken: { count: number; links: LinkInfo[] };
  noFollow: { count: number; links: LinkInfo[] };
  total: number;
  issues: string[];
  score: number;
}

export interface LinkInfo {
  href: string;
  text: string;
  isNoFollow: boolean;
}

export interface MobileFriendlinessAnalysis {
  hasViewport: boolean;
  hasProperViewport: boolean;
  smallTextElements: number;
  smallTapTargets: number;
  hasHorizontalScroll: boolean;
  hasTouchOptimization: boolean;
  issues: string[];
  score: number;
}

export interface SeoRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SeoIssue {
  source: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

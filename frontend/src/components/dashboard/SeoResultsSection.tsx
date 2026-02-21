import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Link2,
  Smartphone,
  Code,
  Type,
  Image,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeoAnalysis {
  score: number;
  metaTags?: MetaTagsAnalysis;
  headings?: HeadingsAnalysis;
  content?: ContentAnalysis;
  technical?: TechnicalAnalysis;
  structuredData?: StructuredDataAnalysis;
  links?: LinksAnalysis;
  mobile?: MobileAnalysis;
  recommendations?: Recommendation[];
  issues?: Issue[];
}

interface MetaTagsAnalysis {
  title: { value: string | null; length: number; optimal: boolean };
  description: { value: string | null; length: number; optimal: boolean };
  canonical: string | null;
  lang: string | null;
  viewport: string | null;
  openGraph: { isComplete: boolean; title?: string; description?: string; image?: string };
  twitter: { isComplete: boolean };
  score: number;
  issues: string[];
}

interface HeadingsAnalysis {
  structure: {
    h1: { count: number; items: { text: string; length: number }[] };
    h2: { count: number; items: { text: string; length: number }[] };
    h3: { count: number; items: { text: string; length: number }[] };
    h4: { count: number; items: { text: string; length: number }[] };
    h5: { count: number; items: { text: string; length: number }[] };
    h6: { count: number; items: { text: string; length: number }[] };
  };
  hasProperH1: boolean;
  hasHierarchy: boolean;
  totalHeadings: number;
  score: number;
  issues: string[];
}

interface ContentAnalysis {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  paragraphs: number;
  images: { total: number; withAlt: number; missingAlt: number };
  links: { internal: number; external: number; total: number };
  score: number;
  issues: string[];
}

interface TechnicalAnalysis {
  isHttps: boolean;
  hasDoctype: boolean;
  charset: string;
  hasFavicon: boolean;
  loadTime: number;
  ttfb: number;
  score: number;
  issues: string[];
}

interface StructuredDataAnalysis {
  jsonLd: { count: number; types: string[]; isValid: boolean };
  microdata: { itemCount: number };
  hasOpenGraph: boolean;
  hasTwitterCards: boolean;
  score: number;
  issues: string[];
}

interface LinksAnalysis {
  internal: { count: number };
  external: { count: number };
  broken: { count: number };
  noFollow: { count: number };
  total: number;
  score: number;
  issues: string[];
}

interface MobileAnalysis {
  hasViewport: boolean;
  hasProperViewport: boolean;
  smallTextElements: number;
  smallTapTargets: number;
  hasHorizontalScroll: boolean;
  score: number;
  issues: string[];
}

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface Issue {
  source: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

const ScoreCircle = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl',
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-600 border-green-300';
    if (score >= 70) return 'bg-yellow-100 text-yellow-600 border-yellow-300';
    if (score >= 50) return 'bg-orange-100 text-orange-600 border-orange-300';
    return 'bg-red-100 text-red-600 border-red-300';
  };

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold border-2',
      sizeClasses[size],
      getScoreColor(score)
    )}>
      {score}
    </div>
  );
};

const CategoryCard = ({ 
  title, 
  icon: Icon, 
  score, 
  children,
  defaultOpen = false,
}: { 
  title: string; 
  icon: React.ElementType; 
  score: number; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-gray-500" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <ScoreCircle score={score} size="sm" />
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

const IssueItem = ({ issue }: { issue: Issue }) => {
  const severityConfig = {
    critical: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Critical' },
    warning: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50', label: 'Warning' },
    info: { icon: Info, color: 'text-blue-600 bg-blue-50', label: 'Info' },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg', config.color)}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <span className="text-xs font-medium uppercase">{issue.source}</span>
        <p className="text-sm mt-0.5">{issue.message}</p>
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
  const priorityColors = {
    critical: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50',
  };

  const impactBadge = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div className={cn('border-l-4 p-4 rounded-r-lg', priorityColors[recommendation.priority])}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase">{recommendation.category}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', impactBadge[recommendation.impact])}>
              {recommendation.impact} impact
            </span>
          </div>
          <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
        </div>
      </div>
    </div>
  );
};

export const SeoResultsSection = ({ seoAnalysis }: { seoAnalysis: SeoAnalysis }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'details' | 'recommendations' | 'issues'>('overview');

  if (!seoAnalysis) {
    return (
      <div className="text-center py-8 text-gray-500">
        No SEO analysis data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
        <div className="flex items-center justify-center gap-8">
          <ScoreCircle score={seoAnalysis.score} size="lg" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">SEO Score</h3>
            <p className="text-gray-600 mt-1">
              {seoAnalysis.score >= 90 ? 'Excellent! Your page is well optimized.' :
               seoAnalysis.score >= 70 ? 'Good, but there\'s room for improvement.' :
               seoAnalysis.score >= 50 ? 'Needs work. Several issues detected.' :
               'Critical issues found. Immediate attention required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'details', label: 'Detailed Analysis' },
          { id: 'recommendations', label: `Recommendations (${seoAnalysis.recommendations?.length || 0})` },
          { id: 'issues', label: `Issues (${seoAnalysis.issues?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              activeSection === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {seoAnalysis.metaTags && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.metaTags.score} size="sm" />
              <p className="text-sm font-medium mt-2">Meta Tags</p>
            </div>
          )}
          {seoAnalysis.headings && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.headings.score} size="sm" />
              <p className="text-sm font-medium mt-2">Headings</p>
            </div>
          )}
          {seoAnalysis.content && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.content.score} size="sm" />
              <p className="text-sm font-medium mt-2">Content</p>
            </div>
          )}
          {seoAnalysis.technical && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.technical.score} size="sm" />
              <p className="text-sm font-medium mt-2">Technical</p>
            </div>
          )}
          {seoAnalysis.structuredData && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.structuredData.score} size="sm" />
              <p className="text-sm font-medium mt-2">Structured Data</p>
            </div>
          )}
          {seoAnalysis.links && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.links.score} size="sm" />
              <p className="text-sm font-medium mt-2">Links</p>
            </div>
          )}
          {seoAnalysis.mobile && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <ScoreCircle score={seoAnalysis.mobile.score} size="sm" />
              <p className="text-sm font-medium mt-2">Mobile</p>
            </div>
          )}
        </div>
      )}

      {/* Detailed Analysis */}
      {activeSection === 'details' && (
        <div className="space-y-4">
          {seoAnalysis.metaTags && (
            <CategoryCard title="Meta Tags" icon={FileText} score={seoAnalysis.metaTags.score} defaultOpen>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Title</p>
                    <p className="font-medium mt-1 truncate">
                      {seoAnalysis.metaTags.title.value || <span className="text-red-500">Missing</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {seoAnalysis.metaTags.title.length} characters
                      {seoAnalysis.metaTags.title.optimal && <CheckCircle size={12} className="inline ml-1 text-green-500" />}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Description</p>
                    <p className="font-medium mt-1 text-sm line-clamp-2">
                      {seoAnalysis.metaTags.description.value || <span className="text-red-500">Missing</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {seoAnalysis.metaTags.description.length} characters
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {seoAnalysis.metaTags.canonical ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />}
                    <span>Canonical URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {seoAnalysis.metaTags.viewport ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />}
                    <span>Viewport</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {seoAnalysis.metaTags.openGraph.isComplete ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />}
                    <span>Open Graph</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {seoAnalysis.metaTags.twitter.isComplete ? 
                      <CheckCircle size={16} className="text-green-500" /> : 
                      <XCircle size={16} className="text-red-500" />}
                    <span>Twitter Cards</span>
                  </div>
                </div>
              </div>
            </CategoryCard>
          )}

          {seoAnalysis.headings && (
            <CategoryCard title="Heading Structure" icon={Type} score={seoAnalysis.headings.score}>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {seoAnalysis.headings.hasProperH1 ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>Has proper H1</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) => (
                    <div key={tag} className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500 uppercase">{tag}</p>
                      <p className="font-bold text-lg">{seoAnalysis.headings!.structure[tag].count}</p>
                    </div>
                  ))}
                </div>
                {seoAnalysis.headings.structure.h1.items.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">H1 Content:</p>
                    <p className="text-sm mt-1">{seoAnalysis.headings.structure.h1.items[0].text}</p>
                  </div>
                )}
              </div>
            </CategoryCard>
          )}

          {seoAnalysis.content && (
            <CategoryCard title="Content Analysis" icon={FileText} score={seoAnalysis.content.score}>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{seoAnalysis.content.wordCount}</p>
                  <p className="text-xs text-gray-500">Words</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{seoAnalysis.content.readingTime}</p>
                  <p className="text-xs text-gray-500">Min Read</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{seoAnalysis.content.images.total}</p>
                  <p className="text-xs text-gray-500">Images</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{seoAnalysis.content.links.total}</p>
                  <p className="text-xs text-gray-500">Links</p>
                </div>
              </div>
              {seoAnalysis.content.images.missingAlt > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    {seoAnalysis.content.images.missingAlt} images missing alt text
                  </span>
                </div>
              )}
            </CategoryCard>
          )}

          {seoAnalysis.technical && (
            <CategoryCard title="Technical SEO" icon={Code} score={seoAnalysis.technical.score}>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {seoAnalysis.technical.isHttps ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>HTTPS</span>
                </div>
                <div className="flex items-center gap-2">
                  {seoAnalysis.technical.hasDoctype ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>Doctype</span>
                </div>
                <div className="flex items-center gap-2">
                  {seoAnalysis.technical.hasFavicon ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>Favicon</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Charset:</span>
                  <span className="font-medium">{seoAnalysis.technical.charset}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">TTFB:</span>
                  <span className="font-medium">{seoAnalysis.technical.ttfb.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Load Time:</span>
                  <span className="font-medium">{seoAnalysis.technical.loadTime.toFixed(0)}ms</span>
                </div>
              </div>
            </CategoryCard>
          )}

          {seoAnalysis.links && (
            <CategoryCard title="Link Analysis" icon={Link2} score={seoAnalysis.links.score}>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{seoAnalysis.links.internal.count}</p>
                  <p className="text-xs text-gray-500">Internal Links</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{seoAnalysis.links.external.count}</p>
                  <p className="text-xs text-gray-500">External Links</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{seoAnalysis.links.broken.count}</p>
                  <p className="text-xs text-gray-500">Broken Links</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{seoAnalysis.links.noFollow.count}</p>
                  <p className="text-xs text-gray-500">NoFollow Links</p>
                </div>
              </div>
            </CategoryCard>
          )}

          {seoAnalysis.mobile && (
            <CategoryCard title="Mobile Friendliness" icon={Smartphone} score={seoAnalysis.mobile.score}>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {seoAnalysis.mobile.hasProperViewport ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>Proper Viewport</span>
                </div>
                <div className="flex items-center gap-2">
                  {!seoAnalysis.mobile.hasHorizontalScroll ? 
                    <CheckCircle size={16} className="text-green-500" /> : 
                    <XCircle size={16} className="text-red-500" />}
                  <span>No Horizontal Scroll</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Small Text Elements:</span>
                  <span className={seoAnalysis.mobile.smallTextElements > 0 ? 'text-yellow-600' : 'text-green-600'}>
                    {seoAnalysis.mobile.smallTextElements}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Small Tap Targets:</span>
                  <span className={seoAnalysis.mobile.smallTapTargets > 5 ? 'text-yellow-600' : 'text-green-600'}>
                    {seoAnalysis.mobile.smallTapTargets}
                  </span>
                </div>
              </div>
            </CategoryCard>
          )}
        </div>
      )}

      {/* Recommendations */}
      {activeSection === 'recommendations' && (
        <div className="space-y-4">
          {seoAnalysis.recommendations && seoAnalysis.recommendations.length > 0 ? (
            seoAnalysis.recommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-gray-500">No recommendations - your page is well optimized!</p>
            </div>
          )}
        </div>
      )}

      {/* Issues */}
      {activeSection === 'issues' && (
        <div className="space-y-3">
          {seoAnalysis.issues && seoAnalysis.issues.length > 0 ? (
            seoAnalysis.issues.map((issue, index) => (
              <IssueItem key={index} issue={issue} />
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-gray-500">No issues found!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeoResultsSection;

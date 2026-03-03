import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SeoAnalysis {
  score: number;
  metaTags?: any;
  headings?: any;
  content?: any;
  technical?: any;
  structuredData?: any;
  links?: any;
  mobile?: any;
  recommendations?: any[];
  issues?: any[];
}

interface TestResult {
  url: string;
  testType: string;
  deviceType: string;
  timestamp?: string;
  completedAt?: string;
  results?: {
    webMetrics?: {
      performanceScore?: number;
      accessibilityScore?: number;
      bestPracticesScore?: number;
      seoScore?: number;
      seoAnalysis?: SeoAnalysis;
      performanceMetrics?: any;
    };
  };
}

const getScoreColor = (score: number): [number, number, number] => {
  if (score >= 90) return [34, 197, 94]; // green
  if (score >= 70) return [234, 179, 8]; // yellow
  if (score >= 50) return [249, 115, 22]; // orange
  return [239, 68, 68]; // red
};

const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Poor';
};

export const exportSeoReportToPdf = (test: TestResult): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BugSpy', 15, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('SEO Analysis Report', 15, 25);
  
  const dateStr = test.completedAt ? new Date(test.completedAt).toLocaleDateString() : new Date().toLocaleDateString();
  doc.text(dateStr, pageWidth - 15, 25, { align: 'right' });

  yPos = 50;
  doc.setTextColor(0, 0, 0);

  // URL Section
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Analyzed URL:', 15, yPos);
  yPos += 6;
  
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(test.url, 15, yPos);
  yPos += 12;

  // Test Info
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.text(`Test Type: ${test.testType} | Device: ${test.deviceType}`, 15, yPos);
  yPos += 20;

  const webMetrics = test.results?.webMetrics;
  const seoAnalysis = webMetrics?.seoAnalysis;

  // Overall Score Section
  if (seoAnalysis?.score !== undefined || webMetrics?.seoScore !== undefined) {
    const score = seoAnalysis?.score ?? webMetrics?.seoScore ?? 0;
    const [r, g, b] = getScoreColor(score);
    
    // Score circle background
    doc.setFillColor(r, g, b, 0.1);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 45, 5, 5, 'F');
    
    // Score
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(score.toString(), 40, yPos + 25, { align: 'center' });
    
    // Label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('SEO Score', 75, yPos + 15);
    
    doc.setFontSize(12);
    doc.setTextColor(r, g, b);
    doc.text(getScoreLabel(score), 75, yPos + 28);
    
    yPos += 55;
  }

  // Category Scores
  if (seoAnalysis) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Category Breakdown', 15, yPos);
    yPos += 10;

    const categories = [
      { name: 'Meta Tags', score: seoAnalysis.metaTags?.score },
      { name: 'Headings', score: seoAnalysis.headings?.score },
      { name: 'Content', score: seoAnalysis.content?.score },
      { name: 'Technical SEO', score: seoAnalysis.technical?.score },
      { name: 'Structured Data', score: seoAnalysis.structuredData?.score },
      { name: 'Links', score: seoAnalysis.links?.score },
      { name: 'Mobile', score: seoAnalysis.mobile?.score },
    ].filter(c => c.score !== undefined);

    if (categories.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Score', 'Status']],
        body: categories.map(cat => [
          cat.name,
          cat.score?.toString() || 'N/A',
          getScoreLabel(cat.score || 0),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const score = parseInt(data.cell.text[0]) || 0;
            const [r, g, b] = getScoreColor(score);
            data.cell.styles.textColor = [r, g, b];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Page break if needed
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  // Recommendations Section
  if (seoAnalysis?.recommendations && seoAnalysis.recommendations.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Recommendations', 15, yPos);
    yPos += 10;

    const priorityColors: Record<string, [number, number, number]> = {
      critical: [239, 68, 68],
      high: [249, 115, 22],
      medium: [234, 179, 8],
      low: [34, 197, 94],
    };

    autoTable(doc, {
      startY: yPos,
      head: [['Priority', 'Category', 'Recommendation', 'Impact']],
      body: seoAnalysis.recommendations.map((rec: any) => [
        rec.priority.toUpperCase(),
        rec.category,
        rec.title,
        rec.impact,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        3: { cellWidth: 25 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const priority = data.cell.text[0].toLowerCase();
          const color = priorityColors[priority] || [107, 114, 128];
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Page break if needed
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  // Issues Section
  if (seoAnalysis?.issues && seoAnalysis.issues.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Issues Found', 15, yPos);
    yPos += 10;

    const severityColors: Record<string, [number, number, number]> = {
      critical: [239, 68, 68],
      warning: [234, 179, 8],
      info: [59, 130, 246],
    };

    autoTable(doc, {
      startY: yPos,
      head: [['Severity', 'Source', 'Issue']],
      body: seoAnalysis.issues.map((issue: any) => [
        issue.severity.toUpperCase(),
        issue.source,
        issue.message,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const severity = data.cell.text[0].toLowerCase();
          const color = severityColors[severity] || [107, 114, 128];
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Meta Tags Details
  if (seoAnalysis?.metaTags) {
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Meta Tags Details', 15, yPos);
    yPos += 10;

    const metaDetails = [
      ['Title', seoAnalysis.metaTags.title?.value || 'Missing', `${seoAnalysis.metaTags.title?.length || 0} chars`],
      ['Description', seoAnalysis.metaTags.description?.value?.substring(0, 50) + '...' || 'Missing', `${seoAnalysis.metaTags.description?.length || 0} chars`],
      ['Canonical', seoAnalysis.metaTags.canonical || 'Missing', '-'],
      ['Language', seoAnalysis.metaTags.lang || 'Missing', '-'],
      ['Viewport', seoAnalysis.metaTags.viewport ? 'Present' : 'Missing', '-'],
      ['Open Graph', seoAnalysis.metaTags.openGraph?.isComplete ? 'Complete' : 'Incomplete', '-'],
      ['Twitter Cards', seoAnalysis.metaTags.twitter?.isComplete ? 'Complete' : 'Incomplete', '-'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Meta Tag', 'Value', 'Notes']],
      body: metaDetails,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated by BugSpy • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `seo-report-${test.url.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${Date.now()}.pdf`;
  doc.save(filename);
};

export const exportPerformanceReportToPdf = (test: TestResult): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BugSpy', 15, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Performance Report', 15, 25);
  
  const dateStr = test.completedAt ? new Date(test.completedAt).toLocaleDateString() : new Date().toLocaleDateString();
  doc.text(dateStr, pageWidth - 15, 25, { align: 'right' });

  yPos = 50;
  doc.setTextColor(0, 0, 0);

  // URL Section
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Analyzed URL:', 15, yPos);
  yPos += 6;
  
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(test.url, 15, yPos);
  yPos += 20;

  const webMetrics = test.results?.webMetrics;

  // Lighthouse Scores
  if (webMetrics) {
    const scores = [
      { name: 'Performance', score: webMetrics.performanceScore },
      { name: 'Accessibility', score: webMetrics.accessibilityScore },
      { name: 'Best Practices', score: webMetrics.bestPracticesScore },
      { name: 'SEO', score: webMetrics.seoScore },
    ].filter(s => s.score !== undefined);

    if (scores.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Lighthouse Scores', 15, yPos);
      yPos += 15;

      // Draw score circles
      const circleRadius = 20;
      const spacing = (pageWidth - 30) / scores.length;
      
      scores.forEach((item, index) => {
        const x = 15 + spacing * index + spacing / 2;
        const [r, g, b] = getScoreColor(item.score || 0);
        
        // Circle background
        doc.setFillColor(r, g, b);
        doc.circle(x, yPos + circleRadius, circleRadius, 'F');
        
        // Score text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text((item.score || 0).toString(), x, yPos + circleRadius + 4, { align: 'center' });
        
        // Label
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(item.name, x, yPos + circleRadius * 2 + 10, { align: 'center' });
      });

      yPos += 70;
    }

    // Performance Metrics
    if (webMetrics.performanceMetrics) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Core Web Vitals', 15, yPos);
      yPos += 10;

      const perf = webMetrics.performanceMetrics;
      const vitals = [
        ['First Contentful Paint (FCP)', `${perf.firstContentfulPaint?.toFixed(0) || 0} ms`, perf.firstContentfulPaint < 1800 ? 'Good' : 'Needs Work'],
        ['Largest Contentful Paint (LCP)', `${perf.largestContentfulPaint?.toFixed(0) || 0} ms`, perf.largestContentfulPaint < 2500 ? 'Good' : 'Needs Work'],
        ['Total Blocking Time (TBT)', `${perf.totalBlockingTime?.toFixed(0) || 0} ms`, perf.totalBlockingTime < 200 ? 'Good' : 'Needs Work'],
        ['Cumulative Layout Shift (CLS)', (perf.cumulativeLayoutShift || 0).toFixed(3), perf.cumulativeLayoutShift < 0.1 ? 'Good' : 'Needs Work'],
        ['Time to First Byte (TTFB)', `${perf.timeToFirstByte?.toFixed(0) || 0} ms`, perf.timeToFirstByte < 200 ? 'Good' : 'Needs Work'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value', 'Status']],
        body: vitals,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
      });
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by BugSpy', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save
  const filename = `performance-report-${test.url.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${Date.now()}.pdf`;
  doc.save(filename);
};


/**
 * General export function that routes to the appropriate report type
 */
export const exportTestToPdf = (test: TestResult): void => {
  if (test.testType === 'seo' || test.results?.webMetrics?.seoAnalysis) {
    exportSeoReportToPdf(test);
  } else {
    exportPerformanceReportToPdf(test);
  }
};

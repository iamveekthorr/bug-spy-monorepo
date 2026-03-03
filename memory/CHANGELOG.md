# BugSpy - Changelog

## Mar 03, 2026

### Bug Fixes
- **BUG-1**: Verified search filter working on Tests page
- **BUG-2**: Fixed Analytics page charts - backend now returns comprehensive data
- **BUG-4**: Added Export PDF and Delete dropdown to Tests page
- **BUG-5**: Fixed Results column to display score from webMetrics

### Backend Changes
- `dashboard.service.ts`: Rewrote `getPerformanceAnalytics()` to return:
  - performanceTrends (date, averageScore, testCount)
  - errorDistribution (type, count, severity)
  - testTypeBreakdown (testType, count, averageScore)
  - deviceBreakdown (deviceType, count, averageScore)
- `dashboard.dto.ts`: Added 'day', 'week', 'month', 'year' to period validation

### Frontend Changes
- `TestsPage.tsx`: 
  - Added DropdownMenu with Export PDF and Delete options
  - Fixed score display to read from `test.results.webMetrics`
  - Added `useToast` for notifications
- `pdfExport.ts`: Added `exportTestToPdf()` general export function

---

## Feb 27, 2026

### Features
- Added refresh buttons to Dashboard, Tests, and Analytics pages
- Implemented email notifications for score drops
- Fixed timeout issues for complex website tests (30s → 90s)

### Bug Fixes
- Fixed hardcoded scores (85, 90, 85, 90) - installed chromium
- Added fallback performance score calculation when Lighthouse SpeedIndex fails

---

## Feb 24, 2026

### Initial Implementation
- Lighthouse integration for dynamic performance scoring
- SEO analysis service with 9 categories
- PDF export functionality
- SeoResultsSection component

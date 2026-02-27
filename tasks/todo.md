# BugSpy - Task Management

## Current Sprint

### Priority 2: Email Notifications for Score Drops
**Decisions**: Logged emails (dev), ≥5 point threshold, scheduled tests only
**Status**: COMPLETE

- [x] Backend: Create notification service (`api/src/notifications/`)
- [x] Backend: Add score comparison logic (≥5 point drop)
- [x] Backend: Store previous scores in test results
- [x] Backend: Create email templates (HTML)
- [x] Backend: API endpoints for notification preferences
- [x] Frontend: Add notification toggle in Settings
- [x] Frontend: Score drop threshold input
- [x] Test: UI verified via screenshot

### Priority 3: Historical Performance Trend Charts
- [ ] Backend: Create endpoint for historical scores by URL
- [ ] Backend: Modify test storage to track score history
- [ ] Frontend: Add time-series chart component
- [ ] Frontend: Integrate with existing Analytics page
- [ ] Test: Verify chart renders with real data

---

## Backlog

### Competitor SEO Comparison
- [ ] Design: Define comparison metrics
- [ ] Backend: Add competitor URL field to tests
- [ ] Backend: Run parallel analysis
- [ ] Frontend: Side-by-side comparison UI

### Export Analytics Charts as PNG
- [ ] Frontend: Add html2canvas or similar library
- [ ] Frontend: Add export button to chart components

### Track SEO Score History Per URL
- [ ] Backend: Create URL history collection
- [ ] Frontend: URL detail page with score timeline

---

## Completed

### Feb 27, 2026
- [x] Priority 2: Email notifications for score drops (backend + frontend UI)
- [x] Priority 1: Real-time refresh buttons (Dashboard, Tests, Analytics)
- [x] Fix: Hardcoded scores (85, 90, 85, 90) - installed chromium
- [x] Fix: Performance score fallback calculation
- [x] Verify: Dashboard tests returning from BE

---

## Review Section

### Last Review: Feb 27, 2026
- Refresh buttons implemented on 3 pages
- All buttons tested via screenshots
- No regressions found

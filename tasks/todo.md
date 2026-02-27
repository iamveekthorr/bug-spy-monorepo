# BugSpy - Task Management

## Current Sprint

### Priority 2: Email Notifications for Score Drops
- [ ] Research: Determine email service (logged/SendGrid/Resend)
- [ ] Backend: Create notification service in NestJS
- [ ] Backend: Add score comparison logic to detect drops
- [ ] Backend: Store previous scores for comparison
- [ ] Backend: Create email templates for notifications
- [ ] Backend: Add notification preferences to user settings
- [ ] Frontend: Add notification settings UI
- [ ] Test: Verify email triggers on score drop
- [ ] Document: Update API docs

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

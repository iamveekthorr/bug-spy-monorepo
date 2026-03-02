# BugSpy - Lessons Learned

## Rules to Prevent Mistakes

### Environment Setup
1. **Always check chromium installation** - Lighthouse requires chromium. Run `which chromium` before testing performance scores.
2. **Verify backend is running** - Check `ps aux | grep nest` before API tests.
3. **Use external URL for curl tests** - Use REACT_APP_BACKEND_URL, not localhost.

### Code Quality
1. **Import cn from lib/utils** - When using conditional classNames with Tailwind.
2. **Use refetch from useQuery** - For refresh functionality, don't create custom state.
3. **Add data-testid to all buttons** - Required for automated testing.

### Testing
1. **Take screenshots AFTER implementation** - Not during development loops.
2. **Test login flow first** - Many features require auth.
3. **Check backend logs on errors** - `tail -50 /var/log/supervisor/backend.out.log`

### Common Pitfalls
1. **ESLint parsing errors** - Usually pre-existing TypeScript issues, check if Vite compiles.
2. **Pod memory limits** - Long-running Lighthouse tests can cause restarts.
3. **Backend not starting** - Check supervisor config vs actual directory structure.

---

## Corrections Log

### Session: Mar 02, 2026
- **Issue**: Tests timing out for complex websites (github.com, bbc.com)
- **Root Cause**: Timeout set to 30 seconds, insufficient for complex sites
- **Fix**: Increased timeouts in:
  - `capture.config.ts`: PERFORMANCE_TEST_MS: 30000 → 90000
  - `capture-orchestrator.service.ts`: 30000 → 90000
  - `timeout-config.service.ts`: All environment timeouts increased 2-3x
- **Lesson**: Complex sites need at least 60-90 seconds for full Lighthouse analysis

### Session: Feb 27, 2026
- **Issue**: User reported hardcoded scores (85, 90, 85, 90)
- **Root Cause**: Chromium not installed, Lighthouse failing silently
- **Fix**: Install chromium + add fallback performance score calculation
- **Lesson**: Always verify external dependencies (chromium, etc.) are installed

---

## Patterns That Work

1. **Refresh buttons**: Use React Query's `refetch()` + `isFetching` state
2. **Loading states**: Use spinning icon with `animate-spin` class
3. **API testing**: Login first, capture token, chain requests with `&&`

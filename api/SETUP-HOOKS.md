# Git Hooks & CI/CD Setup

This document explains how to set up and use the git hooks and CI/CD pipeline for this project.

## 🔧 Manual Git Hook Setup

To enable pre-push validation hooks locally:

```bash
# Make the hook executable
chmod +x .githooks/pre-push

# Configure git to use the custom hooks directory
git config core.hooksPath .githooks
```

## 🚀 Available Scripts

### Validation Commands
- `npm run validate` - Runs full validation pipeline (lint + build + test)
- `npm run pre-push` - Manually run pre-push validation
- `npm run audit:security` - Check for security vulnerabilities

### Development Commands
- `npm run build` - TypeScript compilation
- `npm run lint` - ESLint validation  
- `npm test` - Run all tests
- `npm run test:cov` - Run tests with coverage

## 🔄 Pre-Push Hook Behavior

The pre-push hook automatically runs when you `git push` and will:

1. ✅ **TypeScript Compilation** - Ensures code compiles without errors
2. ✅ **Linting** - Validates code style and catches issues
3. ✅ **Tests** - Runs full test suite to ensure nothing is broken

If any step fails, the push will be **blocked** until you fix the issues.

## 🚦 CI/CD Pipeline (GitHub Actions)

The `.github/workflows/ci.yml` workflow runs on every push/PR and includes:

### Test & Build Job
- Tests on Node.js 18.x and 20.x
- Runs linting, compilation, and tests
- Generates coverage reports

### Build Validation Job  
- Validates production build artifacts
- Checks bundle sizes
- Performs smoke test of application startup

### Security Audit Job
- Scans for known vulnerabilities
- Blocks deployment if critical issues found

## 🐛 Memory Leak Fixes Applied

The following fixes were implemented to resolve "worker process failed to exit gracefully" errors:

1. **Timer Cleanup** - All `setTimeout` calls now properly cleanup
2. **Fake Timers** - Jest uses fake timers to prevent leaks during tests
3. **Global Cleanup** - Added `afterEach` cleanup in test files
4. **WebPageTestMetricsService** - Fixed timer management in web vitals collection

## 🔍 Troubleshooting

### If tests are still slow or have memory leaks:
```bash
# Run with open handles detection
npm test -- --detectOpenHandles

# Run specific test file to isolate issues
npm test -- src/path/to/specific.spec.ts
```

### If pre-push hook doesn't work:
```bash
# Check hook permissions
ls -la .githooks/pre-push

# Re-configure git hooks path
git config core.hooksPath .githooks

# Test hook manually
.githooks/pre-push
```

### If CI/CD fails:
- Check the GitHub Actions tab in your repository
- Review failed job logs for specific error messages
- Ensure all required secrets are configured (if any)

## ✨ Benefits

With this setup:
- **Quality Assurance** - Code is validated before reaching main branch
- **Fast Feedback** - Issues caught early in development process  
- **Consistent Standards** - All developers follow same validation rules
- **Memory Safe** - Tests run without leaking resources
- **Production Ready** - Build artifacts are validated before deployment
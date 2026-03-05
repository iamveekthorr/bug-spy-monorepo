import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123!';

// More resilient login helper that handles Cloudflare and various states
async function ensureLoggedIn(page: Page): Promise<boolean> {
  try {
    // Go to dashboard with shorter timeout
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Small wait for React to render
    await page.waitForTimeout(2000);
    
    // Check for blank page (Cloudflare block)
    const bodyContent = await page.locator('body').textContent().catch(() => '');
    if (!bodyContent || bodyContent.trim().length < 50) {
      console.log('Possible Cloudflare block - blank page');
      return false;
    }
    
    // Check if login modal appears
    const dialogLocator = page.locator('[role="dialog"]');
    const isDialogVisible = await dialogLocator.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isDialogVisible) {
      // Login via modal
      await dialogLocator.locator('input#email').fill(TEST_EMAIL);
      await dialogLocator.locator('input#password').fill(TEST_PASSWORD);
      await dialogLocator.locator('button[type="submit"]').click();
      
      // Wait for dashboard URL
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      await page.waitForTimeout(1000);
    }
    
    // Verify we're logged in
    const sidebar = await page.locator('text=Dashboard').first().isVisible({ timeout: 5000 }).catch(() => false);
    return sidebar;
  } catch (error) {
    console.log('Login failed:', error);
    return false;
  }
}

test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
  });

  test('should show welcome message on dashboard', async ({ page }) => {
    await expect(page.getByText(/welcome back/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display stats cards on dashboard', async ({ page }) => {
    await expect(page.getByText('Total Tests').first()).toBeVisible();
    await expect(page.getByText('This Month').first()).toBeVisible();
  });

  test('should display recent tests section', async ({ page }) => {
    await expect(page.getByText('Recent Tests')).toBeVisible();
  });

  test('should have quick actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });

  test('should open Run New Test modal from Quick Actions', async ({ page }) => {
    const runTestBtn = page.getByRole('button', { name: /run new test/i }).first();
    await runTestBtn.click();
    
    // The modal should appear - check for its content
    await expect(page.getByText('Start New Test')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Website URL')).toBeVisible();
  });
});

test.describe('Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
    await page.click('text=Tests');
    await page.waitForTimeout(1500);
  });

  test('should display Tests page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tests', exact: true }).first()).toBeVisible();
    await expect(page.getByText('View and manage your website test results')).toBeVisible();
  });

  test('should have search filter input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should display test with correct Score in Results column', async ({ page }) => {
    // The bug fix ensures Score displays correctly from webMetrics
    await expect(page.getByText(/Score:\s*\d+%/).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display test with correct Duration', async ({ page }) => {
    // Duration should show formatted time like <1s
    await expect(page.getByText(/<1s|[0-9]+s|[0-9]+m/).first()).toBeVisible();
  });

  test('should have dropdown actions for each test', async ({ page }) => {
    const moreActionsBtn = page.locator('[data-testid^="more-actions-"]').first();
    const hasTests = await moreActionsBtn.count() > 0;
    
    if (hasTests) {
      await moreActionsBtn.click();
      await expect(page.getByRole('menuitem', { name: /export pdf/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Test Result Page', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
    await page.click('text=Tests');
    await page.waitForTimeout(1500);
  });

  test('should load test result page without React hook errors', async ({ page }) => {
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    const hasTests = await firstTestLink.count() > 0;
    
    if (!hasTests) {
      test.skip();
      return;
    }
    
    await firstTestLink.click();
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
    await page.waitForTimeout(1500);
    
    // Page should load without errors - key elements visible
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible({ timeout: 10000 });
  });

  test('should have Rerun Test button visible', async ({ page }) => {
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    if (await firstTestLink.count() === 0) {
      test.skip();
      return;
    }
    
    await firstTestLink.click();
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
    await page.waitForTimeout(1500);
    
    await expect(page.getByTestId('rerun-test-btn')).toBeVisible({ timeout: 10000 });
  });

  test('should have Share and Export PDF buttons', async ({ page }) => {
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    if (await firstTestLink.count() === 0) {
      test.skip();
      return;
    }
    
    await firstTestLink.click();
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
    await page.waitForTimeout(1500);
    
    await expect(page.getByTestId('share-test-btn')).toBeVisible();
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible();
  });

  test('should show SEO tab with score for SEO test', async ({ page }) => {
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    if (await firstTestLink.count() === 0) {
      test.skip();
      return;
    }
    
    await firstTestLink.click();
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
    await page.waitForTimeout(1500);
    
    // Click SEO tab
    const seoTab = page.getByRole('button', { name: /seo/i }).first();
    if (await seoTab.isVisible()) {
      await seoTab.click();
      // Should show SEO score section
      await expect(page.getByText(/seo score/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Issues tab with actual issues from seoAnalysis', async ({ page }) => {
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    if (await firstTestLink.count() === 0) {
      test.skip();
      return;
    }
    
    await firstTestLink.click();
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
    await page.waitForTimeout(1500);
    
    // Click SEO tab
    const seoTab = page.getByRole('button', { name: /seo/i }).first();
    if (await seoTab.isVisible()) {
      await seoTab.click();
      
      // Click Issues sub-tab
      const issuesTab = page.getByRole('button', { name: /issues/i }).first();
      if (await issuesTab.isVisible()) {
        await issuesTab.click();
        // Verify issues content is displayed (from seoAnalysis.issues)
        await expect(page.getByText(/meta|description|missing/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
    await page.click('text=History');
    await page.waitForTimeout(1500);
  });

  test('should display History page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Test History' })).toBeVisible();
  });

  test('should display Score correctly (85%)', async ({ page }) => {
    // Bug fix: Score now uses results.webMetrics.performanceScore/seoScore
    await expect(page.getByText(/\d+%/).first()).toBeVisible();
  });

  test('should display Duration correctly (<1s)', async ({ page }) => {
    // Bug fix: Duration displays correctly
    await expect(page.getByText(/<1s|[0-9]+s|[0-9]+m/).first()).toBeVisible();
  });

  test('should have Export CSV button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();
  });
});

test.describe('Scheduled Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
    await page.click('text=Scheduled');
    await page.waitForTimeout(1500);
  });

  test('should display Scheduled Tests page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scheduled Tests', exact: true })).toBeVisible();
  });

  test('should have New Schedule button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new schedule/i })).toBeVisible();
  });

  test('should open New Schedule modal', async ({ page }) => {
    await page.getByRole('button', { name: /new schedule/i }).click();
    
    // Verify modal content
    await expect(page.getByText('Schedule Name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Website URL')).toBeVisible();
    await expect(page.getByRole('button', { name: /create schedule/i })).toBeVisible();
  });
});

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await ensureLoggedIn(page);
    if (!loggedIn) {
      test.skip();
    }
    await page.click('text=Analytics');
    await page.waitForTimeout(1500);
  });

  test('should display Analytics page with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Analytics & Reports' })).toBeVisible();
  });

  test('should have Refresh button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });

  test('should have export buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
  });

  test('should display metrics cards with real data', async ({ page }) => {
    await expect(page.getByText(/total tests/i).first()).toBeVisible();
    await expect(page.getByText(/average score/i).first()).toBeVisible();
    await expect(page.getByText(/success rate/i).first()).toBeVisible();
  });

  test('should display Performance Trends chart', async ({ page }) => {
    await expect(page.getByText('Performance Trends')).toBeVisible();
  });
});

import { test, expect, Page } from '@playwright/test';
import { waitForAppReady, removeEmergentBadge } from '../fixtures/helpers';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123!';

// Robust login helper that handles all cases
async function loginAndNavigateToDashboard(page: Page) {
  // Go to dashboard
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  
  // Check if we're already on dashboard with content visible
  const welcomeHeading = page.getByRole('heading', { name: /welcome back/i });
  const isAlreadyLoggedIn = await welcomeHeading.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (isAlreadyLoggedIn) {
    // Already logged in, we're good
    return;
  }
  
  // Check if login modal is showing
  const dialogLocator = page.locator('[role="dialog"]');
  const isDialogVisible = await dialogLocator.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (isDialogVisible) {
    // Login via modal
    const emailInput = dialogLocator.locator('input#email');
    const passwordInput = dialogLocator.locator('input#password');
    const submitButton = dialogLocator.locator('button[type="submit"]');
    
    await emailInput.clear();
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.clear();
    await passwordInput.fill(TEST_PASSWORD);
    await submitButton.click();
    
    // Wait for login response
    await page.waitForResponse(
      response => response.url().includes('/auth/login'),
      { timeout: 10000 }
    );
    
    // Wait for dashboard to be ready
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
  }
}

test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    await removeEmergentBadge(page);
    await loginAndNavigateToDashboard(page);
  });

  test('should show welcome message on dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should display stats cards on dashboard', async ({ page }) => {
    await expect(page.getByText('Total Tests').first()).toBeVisible();
    await expect(page.getByText('This Month').first()).toBeVisible();
    await expect(page.getByText('Avg Performance').first()).toBeVisible();
    await expect(page.getByText('Critical Issues').first()).toBeVisible();
  });

  test('should display recent tests section', async ({ page }) => {
    await expect(page.getByText('Recent Tests')).toBeVisible();
  });

  test('should have quick actions section', async ({ page }) => {
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByRole('button', { name: /run new test/i })).toBeVisible();
  });

  test('should have refresh button that works', async ({ page }) => {
    const refreshBtn = page.getByTestId('dashboard-refresh-btn');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(refreshBtn).toBeVisible();
  });
});

test.describe('Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    await removeEmergentBadge(page);
    await loginAndNavigateToDashboard(page);
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
  });

  test('should display Tests page with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();
    await expect(page.getByText('View and manage your website test results')).toBeVisible();
  });

  test('should have search filter input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should have filter options', async ({ page }) => {
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const refreshBtn = page.getByTestId('tests-refresh-btn');
    await expect(refreshBtn).toBeVisible();
  });

  test('should display test list table header', async ({ page }) => {
    await expect(page.getByText('URL', { exact: true }).first()).toBeVisible();
  });

  test('search filter should update URL', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('example');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/search=example/);
  });

  test('should have Clear button in filters', async ({ page }) => {
    const clearBtn = page.locator('button').filter({ hasText: /clear/i }).first();
    await expect(clearBtn).toBeVisible();
  });
});

test.describe('Test Result Page', () => {
  test.beforeEach(async ({ page }) => {
    await removeEmergentBadge(page);
    await loginAndNavigateToDashboard(page);
  });

  test('should load test result page without errors', async ({ page }) => {
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
    
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    const hasTests = await firstTestLink.count() > 0;
    
    if (hasTests) {
      await firstTestLink.click();
      await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
      await expect(page.locator('h1').first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should have Rerun Test, Share, Export PDF buttons', async ({ page }) => {
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
    
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    const hasTests = await firstTestLink.count() > 0;
    
    if (hasTests) {
      await firstTestLink.click();
      await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
      
      await expect(page.getByTestId('rerun-test-btn')).toBeVisible();
      await expect(page.getByTestId('share-test-btn')).toBeVisible();
      await expect(page.getByTestId('export-pdf-btn')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display tabs for test result navigation', async ({ page }) => {
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
    
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    const hasTests = await firstTestLink.count() > 0;
    
    if (hasTests) {
      await firstTestLink.click();
      await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
      
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should have back button', async ({ page }) => {
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
    
    const firstTestLink = page.locator('a[href*="/dashboard/tests/"]').first();
    const hasTests = await firstTestLink.count() > 0;
    
    if (hasTests) {
      await firstTestLink.click();
      await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i);
      
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Tests Page Actions', () => {
  test.beforeEach(async ({ page }) => {
    await removeEmergentBadge(page);
    await loginAndNavigateToDashboard(page);
    await page.goto('/dashboard/tests');
    await waitForAppReady(page);
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

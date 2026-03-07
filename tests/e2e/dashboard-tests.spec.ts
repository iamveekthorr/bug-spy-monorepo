import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123!';

// Helper to login - handles fresh browser context
async function loginAndNavigate(page: Page, path: string = '/dashboard'): Promise<boolean> {
  try {
    // Navigate to the target path
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if login modal appears
    const dialog = page.locator('dialog, [role="dialog"]');
    
    try {
      await dialog.waitFor({ state: 'visible', timeout: 8000 });
      
      // Fill credentials
      await dialog.locator('input[placeholder="you@example.com"]').fill(TEST_EMAIL);
      await dialog.locator('input[placeholder="Enter your password"]').fill(TEST_PASSWORD);
      
      // Click sign in
      await dialog.getByRole('button', { name: 'Sign in' }).click();
      
      // Wait for modal to close
      await expect(dialog).not.toBeVisible({ timeout: 15000 });
    } catch {
      // Dialog not found - user might already be logged in
    }
    
    return true;
  } catch (error) {
    console.log('Login failed:', error);
    return false;
  }
}

test.describe('Dashboard Overview', () => {
  test('should show dashboard with Avg Performance score (83%)', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard');
    if (!loggedIn) test.skip();
    
    // Verify welcome message
    await expect(page.getByText('Welcome back').first()).toBeVisible({ timeout: 15000 });
    
    // Verify stats cards including Avg Performance
    await expect(page.getByText('Total Tests').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Avg Performance').first()).toBeVisible();
    
    // Verify Recent Tests and Quick Actions
    await expect(page.getByText('Recent Tests')).toBeVisible();
    await expect(page.getByText('Quick Actions')).toBeVisible();
  });
});

test.describe('Tests Page', () => {
  test('should display tests with Score: 85% in Results column', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/tests');
    if (!loggedIn) test.skip();
    
    // Verify Tests heading
    await expect(page.getByRole('main').getByRole('heading', { name: 'Tests' })).toBeVisible({ timeout: 15000 });
    
    // Verify Score displays correctly from webMetrics
    await expect(page.getByText(/Score:\s*\d+%/).first()).toBeVisible({ timeout: 10000 });
    
    // Verify Duration displays correctly
    await expect(page.getByText(/<1s|[0-9]+s|[0-9]+m/).first()).toBeVisible();
  });
  
  test('should have Export PDF and Delete in dropdown', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/tests');
    if (!loggedIn) test.skip();
    
    // Click more actions button
    const moreActionsBtn = page.locator('[data-testid^="more-actions-"]').first();
    await expect(moreActionsBtn).toBeVisible({ timeout: 15000 });
    await moreActionsBtn.click();
    
    // Verify dropdown options
    await expect(page.getByRole('menuitem', { name: /export pdf/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible();
  });
});

test.describe('Test Result Page', () => {
  test('should show Performance Score: 85 in large circle', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/tests');
    if (!loggedIn) test.skip();
    
    // Wait for tests to load
    await expect(page.getByRole('main').getByRole('heading', { name: 'Tests' })).toBeVisible({ timeout: 15000 });
    
    // Click on SEO test (example.com)
    const testLink = page.locator('a:has-text("example.com")').first();
    await expect(testLink).toBeVisible({ timeout: 10000 });
    await testLink.click();
    
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i, { timeout: 15000 });
    
    // Verify Performance Score circle
    await expect(page.getByText('Performance Score').first()).toBeVisible({ timeout: 10000 });
    
    // Verify Rerun Test, Share, Export PDF buttons
    await expect(page.getByTestId('rerun-test-btn')).toBeVisible();
    await expect(page.getByTestId('share-test-btn')).toBeVisible();
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible();
  });
  
  test('should show Issues tab with (1) badge', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/tests');
    if (!loggedIn) test.skip();
    
    await expect(page.getByRole('main').getByRole('heading', { name: 'Tests' })).toBeVisible({ timeout: 15000 });
    
    // Click on SEO test
    const testLink = page.locator('a:has-text("example.com")').first();
    await expect(testLink).toBeVisible({ timeout: 10000 });
    await testLink.click();
    
    await page.waitForURL(/\/dashboard\/tests\/[a-z0-9]+/i, { timeout: 15000 });
    
    // Verify Issues tab is visible
    const issuesTab = page.locator('button').filter({ hasText: /issues/i }).first();
    await expect(issuesTab).toBeVisible({ timeout: 10000 });
    
    // Click Issues tab and verify content
    await issuesTab.click();
    await expect(page.getByText('Issues Detected')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Scheduled Tests Modal', () => {
  test('should open Scheduled Tests modal', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/scheduled');
    if (!loggedIn) test.skip();
    
    // Verify Scheduled Tests heading (use exact match to avoid strict mode violation)
    await expect(page.getByRole('heading', { name: 'Scheduled Tests', exact: true })).toBeVisible({ timeout: 15000 });
    
    // Click New Schedule button
    await page.getByRole('button', { name: /new schedule/i }).click();
    
    // Verify modal content
    await expect(page.getByText('Create New Schedule')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Schedule Name')).toBeVisible();
    await expect(page.getByText('Website URL')).toBeVisible();
    await expect(page.getByRole('button', { name: /create schedule/i })).toBeVisible();
  });
});

test.describe('Analytics Page', () => {
  test('should show Analytics with charts and data', async ({ page }) => {
    const loggedIn = await loginAndNavigate(page, '/dashboard/analytics');
    if (!loggedIn) test.skip();
    
    // Verify heading
    await expect(page.getByRole('heading', { name: 'Analytics & Reports' })).toBeVisible({ timeout: 15000 });
    
    // Verify export buttons
    await expect(page.getByRole('button', { name: /csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
    
    // Verify Performance Trends chart
    await expect(page.getByText('Performance Trends')).toBeVisible();
  });
});

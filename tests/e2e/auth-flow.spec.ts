import { test, expect } from '@playwright/test';
import { waitForAppReady, removeEmergentBadge } from '../fixtures/helpers';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123!';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await removeEmergentBadge(page);
  });

  test('should show login modal when accessing protected route', async ({ page }) => {
    // Try to access dashboard (protected route)
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Should redirect to homepage and show login modal
    await expect(page).toHaveURL('/');
    
    // Wait for login modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Verify login modal elements
    await expect(page.locator('[role="dialog"] h2')).toContainText('Welcome back');
    await expect(page.locator('[role="dialog"] input[id="email"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] input[id="password"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] button[type="submit"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] button[type="submit"]')).toContainText('Sign in');
  });

  test('should display homepage with Login button in header', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    // Find Login button on homepage header (it's a button, not a link)
    // It has text "Login" and is in the header nav
    const loginButton = page.locator('header button').filter({ hasText: 'Login' }).first();
    await expect(loginButton).toBeVisible();
  });

  test('should open login modal from Login button on homepage', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    // Click login button in header
    const loginButton = page.locator('header button').filter({ hasText: 'Login' }).first();
    await loginButton.click();
    
    // Wait for login modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Verify the modal opened
    await expect(page.locator('[role="dialog"] h2')).toContainText('Welcome back');
  });

  test('should login successfully with valid credentials via modal', async ({ page }) => {
    // Go to dashboard which triggers login modal
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Wait for login modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Fill login form in modal
    await page.locator('[role="dialog"] input[id="email"]').fill(TEST_EMAIL);
    await page.locator('[role="dialog"] input[id="password"]').fill(TEST_PASSWORD);
    
    // Submit form
    await page.locator('[role="dialog"] button[type="submit"]').click();
    
    // Wait for navigation to dashboard (modal closes after successful login)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify dashboard elements are visible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should have social login buttons in modal', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Wait for login modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Check for Google and GitHub buttons
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /github/i })).toBeVisible();
  });

  test('should have sign up link in login modal', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Wait for login modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Check for sign up link/button
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should have forgot password link in login modal', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);
    
    // Wait for login modal
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Check for forgot password link
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /forgot password/i })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Critical User Paths', () => {

  test('homepage loads with navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('fund detail page loads for a known scheme', async ({ page }) => {
    await page.goto('/funds/118531');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toContainText('not found');
  });

  test('risk analysis page renders and displays categories', async ({ page }) => {
    await page.goto('/risk-analysis');
    await page.waitForLoadState('networkidle');
    const categoryPills = page.locator('button:has-text("Large Cap"), button:has-text("Mid Cap"), button:has-text("Small Cap")');
    const count = await categoryPills.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('top funds page loads and shows progress', async ({ page }) => {
    await page.goto('/top-funds');
    await page.waitForLoadState('networkidle');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('fund comparison page loads with search input', async ({ page }) => {
    await page.goto('/funds/compare');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('sign in page displays form', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('portfolio page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

});

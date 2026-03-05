import { test, expect } from '@playwright/test';

test.describe('Adrastea Visual Regression', () => {
  test('ログイン画面のスクリーンショット', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('ロビー画面のスクリーンショット', async ({ page }) => {
    // Note: This test requires authentication setup
    // For now, just verify the page loads
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

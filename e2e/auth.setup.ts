import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, '.auth/state.json');

setup('authenticate', async ({ page }) => {
  if (fs.existsSync(AUTH_FILE)) {
    const stat = fs.statSync(AUTH_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (ageMs < ONE_DAY) {
      console.log('✅ 認証状態が24h以内 — 再利用します');
      return;
    }
    console.log('⏰ 認証状態が24h超 — 再認証します');
  }

  await page.goto('/adrastea');
  await page.waitForLoadState('networkidle');

  const googleBtn = page.getByRole('button', { name: /Google/i });
  if (await googleBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    console.log('🔑 ブラウザで Google ログインしてください（90秒以内）...');
    await googleBtn.click();

    await page.waitForFunction(
      () => !!document.querySelector('.adrastea-root'),
      { timeout: 90_000 },
    );
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } else {
    await page.waitForFunction(
      () => !!document.querySelector('.adrastea-root'),
      { timeout: 30_000 },
    );
  }

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✅ 認証状態を ${AUTH_FILE} に保存しました`);
});

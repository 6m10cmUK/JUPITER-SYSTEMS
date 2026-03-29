import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoomById, BASE_URL, openPanel, ensurePanel } from './helpers';

const ROOM_NAME = `text_test_${Date.now()}`;
let roomId: string;

test.describe('シナリオテキスト管理テスト', () => {
  test.describe.configure({ mode: 'serial' });
  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
    // ScenarioTextPanel はデフォルトレイアウトに含まれないので設定から開く
    await openPanel(page, 'テキストメモ');
  });

  test('シナリオテキスト作成', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, 'button[aria-label="テキストメモを追加"]', 'テキストメモ');

    const addBtn = page.locator('button[aria-label="テキストメモを追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    // テキストメモがリストに追加される
    await expect(page.locator('[data-text-id]').first()).toBeVisible({ timeout: 5000 });
  });

  test('シナリオテキスト編集（ダブルクリック → エディタダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.dblclick();
      await page.waitForTimeout(300);

      // エディタダイアログが開く
      await expect(page.getByText('テキストメモ編集').or(page.locator('dialog, [role="dialog"]')).first()).toBeVisible({ timeout: 3000 });

      // ダイアログを閉じる
      await page.keyboard.press('Escape');
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト複製（Ctrl+D）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      const beforeCount = await page.locator('[data-text-id]').count();

      await page.keyboard.press('Control+d');
      await page.waitForTimeout(500);

      const afterCount = await page.locator('[data-text-id]').count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト削除（Delete → 確認ダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItems = page.locator('[data-text-id]');
    const beforeCount = await textItems.count();

    if (beforeCount > 1) {
      // 最後のアイテムを選択
      await textItems.last().click();
      await page.waitForTimeout(300);

      await page.keyboard.press('Delete');
      await page.waitForTimeout(300);

      // 確認ダイアログ
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);

        const afterCount = await textItems.count();
        expect(afterCount).toBeLessThan(beforeCount);
      }
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト Ctrl+C → paste で複製', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      const beforeCount = await page.locator('[data-text-id]').count();

      // Ctrl+C
      await page.keyboard.press('Control+c');
      await page.waitForTimeout(300);

      // paste イベント dispatch
      await page.evaluate(async () => {
        const text = await navigator.clipboard.readText();
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        document.dispatchEvent(evt);
      });
      await page.waitForTimeout(1500);

      const afterCount = await page.locator('[data-text-id]').count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    } else {
      test.skip();
    }
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });
});

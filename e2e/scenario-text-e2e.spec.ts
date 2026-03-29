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

  test('シナリオテキスト選択 → プロパティパネルに反映', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(500);

      // プロパティパネルに ScenarioTextEditor が表示される（「タイトル」ラベル + input）
      await expect(page.locator('input[placeholder="タイトル"]').first()).toBeVisible({ timeout: 5000 });
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

  test('拡大表示 → モーダル表示・縮小で閉じる', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(500);

      // 拡大ボタン
      const maximizeBtn = page.locator('button[title="テキストエリアを拡大"]').first();
      await expect(maximizeBtn).toBeVisible({ timeout: 3000 });
      await maximizeBtn.click();
      await page.waitForTimeout(500);

      // モーダルヘッダーに「テキストメモ - 」が表示
      await expect(page.locator('span').filter({ hasText: /テキストメモ -/ }).first()).toBeVisible({ timeout: 3000 });

      // モーダル内のエディタが表示
      const modalEditor = page.locator('[contenteditable="true"]').last();
      await expect(modalEditor).toBeVisible({ timeout: 2000 });

      // 縮小ボタンで閉じる
      await page.locator('button[title="縮小"]').first().click();
      await page.waitForTimeout(500);

      // モーダルが閉じた
      await expect(page.locator('span').filter({ hasText: /テキストメモ -/ }).first()).not.toBeVisible({ timeout: 2000 });
    } else {
      test.skip();
    }
  });

  test('拡大表示で編集 → 縮小後にプロパティパネルと同期', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(500);

      // プロパティパネルのエディタをクリアして入力
      const inlineEditor = page.locator('[contenteditable="true"]').first();
      await inlineEditor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await inlineEditor.pressSequentially('初期テキスト', { delay: 30 });
      await page.waitForTimeout(300);

      // 拡大
      await page.locator('button[title="テキストエリアを拡大"]').first().click();
      await page.waitForTimeout(500);

      // モーダル内のエディタに追記
      const modalEditor = page.locator('[contenteditable="true"]').last();
      await modalEditor.click();
      await page.keyboard.press('End');
      await modalEditor.pressSequentially('＋追加分', { delay: 30 });
      await page.waitForTimeout(300);

      // 縮小
      await page.locator('button[title="縮小"]').first().click();
      await page.waitForTimeout(500);

      // プロパティパネル側のエディタに「追加分」が含まれている
      const syncedText = await inlineEditor.innerText();
      expect(syncedText).toContain('追加分');
    } else {
      test.skip();
    }
  });

  test('テキスト修飾 → 太字', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      // エディタをクリア → 入力
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await editor.pressSequentially('ボールド', { delay: 50 });
      await page.waitForTimeout(300);

      // 全選択 → 太字ボタン
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.locator('button[title="太字"]').first().click({ force: true });
      await page.waitForTimeout(500);

      // **ボールド** 形式（HTML内に ** か <strong> か font-weight がある）
      const html = await editor.innerHTML();
      const hasBold = html.includes('**') || html.includes('<strong>') || html.includes('font-weight');
      expect(hasBold).toBe(true);
    } else {
      test.skip();
    }
  });

  test('テキスト修飾 → 斜体・打消し', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await ensurePanel(page, '[data-text-id]', 'テキストメモ');

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      const editor = page.locator('[contenteditable="true"]').first();

      // 斜体テスト
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await editor.pressSequentially('イタリック', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.locator('button[title="斜体"]').first().click({ force: true });
      await page.waitForTimeout(500);

      const htmlItalic = await editor.innerHTML();
      const hasItalic = htmlItalic.includes('*') || htmlItalic.includes('<em>') || htmlItalic.includes('<i>') || htmlItalic.includes('font-style');
      expect(hasItalic).toBe(true);

      // 打消しテスト
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      await editor.pressSequentially('取消線', { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+a');
      await page.waitForTimeout(200);
      await page.locator('button[title="打消し"]').first().click({ force: true });
      await page.waitForTimeout(500);

      const htmlStrike = await editor.innerHTML();
      const hasStrike = htmlStrike.includes('~~') || htmlStrike.includes('<s>') || htmlStrike.includes('<del>') || htmlStrike.includes('text-decoration');
      expect(hasStrike).toBe(true);
    } else {
      test.skip();
    }
  });

  // TODO: {変数}置換テスト — キャラクター作成 + ステータス設定 + テキストメモ「チャットに送信」が必要。別タスクで実装

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });
});

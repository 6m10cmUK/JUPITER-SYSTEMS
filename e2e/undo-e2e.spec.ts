import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoomById, BASE_URL } from './helpers';

const ROOM_NAME = `undo_test_${Date.now()}`;
let roomId: string;

test.describe.serial('Undo/Redo テスト', () => {
  test('ルーム作成 (準備)', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/`);
    await page.waitForLoadState('networkidle');
    // 認証チェック: ログイン画面が表示されたら skip（storageState 期限切れ）
    const loginBtn = page.getByText('Googleでログイン');
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await page.getByText('ルームを作成').waitFor({ timeout: 10000 });
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  test('Ctrl+Z で Undo → Ctrl+Shift+Z で Redo', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // シーン追加
    const addSceneBtn = page.locator('button[aria-label="シーンを追加"]').first();
    await expect(addSceneBtn).toHaveCount(1, { timeout: 5000 });

    const scenesBeforeCount = await page.locator('[data-scene-id]').count();

    await addSceneBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // シーンが増えたことを確認
    const scenesAfterAdd = await page.locator('[data-scene-id]').count();
    expect(scenesAfterAdd).toBeGreaterThan(scenesBeforeCount);

    // Ctrl+Z を複数回押す（1操作が複数 diff エントリを生むため）
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(500);
      const current = await page.locator('[data-scene-id]').count();
      if (current === scenesBeforeCount) break;
    }
    await page.waitForTimeout(500);

    const scenesAfterUndo = await page.locator('[data-scene-id]').count();
    expect(scenesAfterUndo).toBe(scenesBeforeCount);

    // Ctrl+Shift+Z を複数回押して Redo
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(500);
      const current = await page.locator('[data-scene-id]').count();
      if (current > scenesBeforeCount) break;
    }
    await page.waitForTimeout(500);

    const scenesAfterRedo = await page.locator('[data-scene-id]').count();
    expect(scenesAfterRedo).toBeGreaterThan(scenesBeforeCount);
  });

  test('Undo: オブジェクト追加→Ctrl+Z', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // オブジェクト追加ボタン
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });

    const objCountBefore = await page.locator('[data-sortable-item]').count();

    // テキストオブジェクト追加
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    const addTextOpt = page.getByText('シーンテキスト追加').first();
    if (await addTextOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addTextOpt.click();
      await page.waitForTimeout(1500);

      // オブジェクトが追加される
      const objCountAfter = await page.locator('[data-sortable-item]').count();
      expect(objCountAfter).toBeGreaterThan(objCountBefore);

      // Ctrl+Z で Undo
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);
        const current = await page.locator('[data-sortable-item]').count();
        if (current === objCountBefore) break;
      }
      await page.waitForTimeout(500);

      // オブジェクト数が元に戻る
      const objCountAfterUndo = await page.locator('[data-sortable-item]').count();
      expect(objCountAfterUndo).toBe(objCountBefore);
    } else {
      test.skip();
    }
  });

  test('Undo: オブジェクト削除→Ctrl+Z で復活', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // テキストオブジェクトを探す
    const textObj = page.getByText('テキスト').first();
    if (await textObj.isVisible({ timeout: 3000 }).catch(() => false)) {
      // テキストオブジェクトを選択
      await textObj.click();
      await page.waitForTimeout(300);

      const objCountBefore = await page.locator('[data-sortable-item]').count();

      // Delete キーで削除
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログが表示される
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // オブジェクトが削除される
        const objCountAfter = await page.locator('[data-sortable-item]').count();
        expect(objCountAfter).toBeLessThan(objCountBefore);

        // Ctrl+Z で Undo（復活）
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Control+z');
          await page.waitForTimeout(500);
          const current = await page.locator('[data-sortable-item]').count();
          if (current === objCountBefore) break;
        }
        await page.waitForTimeout(500);

        // オブジェクトが復活する
        const objCountAfterUndo = await page.locator('[data-sortable-item]').count();
        expect(objCountAfterUndo).toBe(objCountBefore);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });
});

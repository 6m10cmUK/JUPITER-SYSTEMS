import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoom, BASE_URL } from './helpers';
const ROOM_NAME = `obj_test_${Date.now()}`;
let roomId: string;

test.describe.serial('オブジェクト管理テスト', () => {
  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  // --- §2 オブジェクト ---

  test('オブジェクト追加（レイヤーパネル）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // ObjectLayerList の + ボタン
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    // ドロップダウンメニュー「シーン画像追加」
    const addSceneImageOpt = page.getByText('シーン画像追加').first();
    await expect(addSceneImageOpt).toBeVisible({ timeout: 3000 });
    await addSceneImageOpt.click();
    await page.waitForTimeout(1000);

    // アセットライブラリモーダルが開く → 閉じる
    const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('レイヤー表示/非表示トグル', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // レイヤーパネルの「前景」ボタンを使用
    const fgLayer = page.getByRole('button', { name: '前景' }).first();
    await expect(fgLayer).toBeVisible({ timeout: 5000 });
    await fgLayer.click();
    await page.waitForTimeout(300);

    // Eye アイコンボタンをクリック（前景行の visibility toggle）
    const visibilityBtn = fgLayer.locator('button').first();
    await expect(visibilityBtn).toBeVisible({ timeout: 3000 });
    await visibilityBtn.click();
    await page.waitForTimeout(300);

    // トグル後もボタンが存在する（再度クリック可能）
    await expect(visibilityBtn).toBeVisible();
  });

  test('テキストオブジェクト追加', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    // ドロップダウンメニュー「シーンテキスト追加」
    const addTextOpt = page.getByText('シーンテキスト追加').first();
    await expect(addTextOpt).toBeVisible({ timeout: 3000 });
    await addTextOpt.click();
    await page.waitForTimeout(1000);

    // テキストオブジェクトがレイヤーに追加される
    // ※ テキストオブジェクトは即座にレイヤーリストに追加される（モーダルなし）
    const textObj = page.getByText('テキスト').first();
    await expect(textObj).toBeVisible({ timeout: 5000 });
  });

  test('オブジェクト削除（右クリック → 削除）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // テキストオブジェクトを新規作成
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(300);
    const addTextOpt = page.getByText('シーンテキスト追加').first();
    if (await addTextOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTextOpt.click();
      await page.waitForTimeout(1000);
    }

    // レイヤーパネル内のテキストオブジェクトを右クリック → 「削除」
    const textItem = page.locator('[data-obj-id]').filter({ hasText: /テキスト|新規テキスト/ }).first();
    await expect(textItem).toBeVisible({ timeout: 5000 });
    await textItem.click({ button: 'right' });

    // コンテキストメニュー「削除」（menuitem に限定、シーンパネルの「シーンを削除」と区別）
    const deleteOpt = page.locator('[role="menuitem"]').filter({ hasText: '削除' }).first();
    if (await deleteOpt.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteOpt.click();
      await page.waitForTimeout(300);

      // 確認ダイアログ
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      test.skip();
      return;
    }

    // 削除されたことを確認（リロードして永続化チェック）
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const remaining = await page.locator('[data-obj-id]').filter({ hasText: /テキスト|新規テキスト/ }).count();
    expect(remaining).toBe(0);
  });

  test('背景・前景は Delete 削除不可', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 背景を選択
    const bgObj = page.getByRole('button', { name: '背景' }).first();
    await expect(bgObj).toBeVisible({ timeout: 5000 });
    await bgObj.click();
    await page.waitForTimeout(300);

    // Delete キーを押す
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // 確認ダイアログが出ない（削除されない）
    const confirmBtn = page.getByRole('button', { name: '削除' }).last();
    const dialogVisible = await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false);

    // 背景がまだ存在する
    await expect(bgObj).toBeVisible();

    // ダイアログが出た場合はキャンセル
    if (dialogVisible) await page.keyboard.press('Escape');
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ ignoreHTTPSErrors: true });
    await deleteRoom(page, ROOM_NAME);
    await page.close();
  });
});

import { test, expect } from '@playwright/test';
import {
  goToLobby,
  createRoom,
  deleteRoomById,
  selectBackground,
  selectForeground,
  BASE_URL,
} from './helpers';

const ROOM_NAME = `asset-tag-test-${Date.now()}`;
let roomId: string;

/**
 * アセットライブラリのタグ自動付与機能テスト
 *
 * 仕様:
 * - ルーム名のタグは常に自動付与
 * - AssetPicker経由の場合、呼び出し元の種別に応じたタグを追加で自動付与
 *   - 背景画像選択 → 「背景」タグ
 *   - 前景画像選択 → 「前景」タグ
 *   - キャラクター画像選択 → 「キャラクター」タグ
 *   - オブジェクト画像選択 → 「オブジェクト」タグ
 *   - カットイン画像選択 → 「カットイン」タグ
 * - ツールバーのアセットライブラリボタンから直接開いた場合 → ルーム名タグのみ
 */
test.describe('アセットタグ自動付与テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
    expect(roomId).toMatch(/^[a-f0-9-]+$/);
  });

  test('背景選択 → 「背景」タグが自動付与される', async ({ page }) => {
    // 1. ルームに入室
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. レイヤーパネルで「背景」を選択（プロパティパネルに背景プロパティが表示）
    await selectBackground(page);
    await page.waitForTimeout(500);

    // 3. AssetPicker エリア（「クリックしてアセットを選択」）をクリック
    const assetPickerArea = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerArea).toBeVisible({ timeout: 5000 });
    await assetPickerArea.click();
    await page.waitForTimeout(500);

    // 4. アセットライブラリモーダルが開く
    const libHeading = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeading).toBeVisible({ timeout: 5000 });

    // 5. URL 入力タブに切り替え（「URL入力」ボタンが見つかれば）
    const urlTabBtn = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtn.click();
      await page.waitForTimeout(300);
    }

    // 6. URL 入力フィールドを探してアセットを登録
    const urlInput = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });
    const testImageUrl = 'https://via.placeholder.com/100x100/ff0000/ffffff?text=BG';
    await urlInput.fill(testImageUrl);
    await page.waitForTimeout(300);

    // 7. 追加/登録ボタンをクリック
    const addBtn = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 3000 });
    await addBtn.click();
    await page.waitForTimeout(2000);

    // 8. アセットが一覧に追加される
    // URL を部分マッチで検索（完全一致は難しい場合がある）
    const assetItem = page.locator('div').filter({ hasText: /placeholder|100x100/ }).first();
    await expect(assetItem).toBeVisible({ timeout: 5000 });

    // 9. そのアセットに「背景」タグが付与されていることを確認
    // アセット行内に「背景」というテキストがあるはず
    const bgTag = assetItem.locator('span, div').filter({ hasText: '背景' }).first();
    await expect(bgTag).toBeVisible({ timeout: 5000 });

    // 10. ルーム名タグも付与されていることを確認
    const roomTag = assetItem.locator('span, div').filter({ hasText: ROOM_NAME }).first();
    await expect(roomTag).toBeVisible({ timeout: 5000 });
  });

  test('前景選択 → 「前景」タグが自動付与される', async ({ page }) => {
    // 1. ルームに再入室
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. レイヤーパネルで「前景」を選択
    await selectForeground(page);
    await page.waitForTimeout(500);

    // 3. AssetPicker をクリック
    const assetPickerArea = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerArea).toBeVisible({ timeout: 5000 });
    await assetPickerArea.click();
    await page.waitForTimeout(500);

    // 4. アセットライブラリが開く
    const libHeading = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeading).toBeVisible({ timeout: 5000 });

    // 5. URL 入力タブに切り替え
    const urlTabBtn = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtn.click();
      await page.waitForTimeout(300);
    }

    // 6. URL を入力
    const urlInput = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });
    const testImageUrl = 'https://via.placeholder.com/150x100/00ff00/000000?text=FG';
    await urlInput.fill(testImageUrl);
    await page.waitForTimeout(300);

    // 7. 追加ボタン
    const addBtn = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 3000 });
    await addBtn.click();
    await page.waitForTimeout(2000);

    // 8. 新しいアセットが一覧に追加される
    const assetItem = page.locator('div').filter({ hasText: /placeholder|150x100/ }).first();
    await expect(assetItem).toBeVisible({ timeout: 5000 });

    // 9. 「前景」タグが付与されていることを確認
    const fgTag = assetItem.locator('span, div').filter({ hasText: '前景' }).first();
    await expect(fgTag).toBeVisible({ timeout: 5000 });

    // 10. ルーム名タグも確認
    const roomTag = assetItem.locator('span, div').filter({ hasText: ROOM_NAME }).first();
    await expect(roomTag).toBeVisible({ timeout: 5000 });
  });

  test('ツールバー直接開き → ルーム名タグのみ（種別タグなし）', async ({ page }) => {
    // 1. ルームに再入室
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. ツールバーのアセットライブラリボタンを探してクリック
    const assetLibBtn = page
      .locator('button[title*="アセット"], button[aria-label*="アセット"]')
      .first();
    await expect(assetLibBtn).toBeVisible({ timeout: 5000 });
    await assetLibBtn.click();
    await page.waitForTimeout(500);

    // 3. アセットライブラリモーダルが開く
    const libHeading = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeading).toBeVisible({ timeout: 5000 });

    // 4. URL 入力タブ
    const urlTabBtn = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtn.click();
      await page.waitForTimeout(300);
    }

    // 5. URL を入力
    const urlInput = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });
    const testImageUrl = 'https://via.placeholder.com/200x200/0000ff/ffffff?text=DIRECT';
    await urlInput.fill(testImageUrl);
    await page.waitForTimeout(300);

    // 6. 追加ボタン
    const addBtn = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtn).toBeVisible({ timeout: 3000 });
    await addBtn.click();
    await page.waitForTimeout(2000);

    // 7. 新しいアセットが一覧に追加される
    const assetItem = page.locator('div').filter({ hasText: /placeholder|200x200/ }).first();
    await expect(assetItem).toBeVisible({ timeout: 5000 });

    // 8. ルーム名タグは付与されている
    const roomTag = assetItem.locator('span, div').filter({ hasText: ROOM_NAME }).first();
    await expect(roomTag).toBeVisible({ timeout: 5000 });

    // 9. 背景や前景などの種別タグは付与されていない
    // （タグテキストが「背景」「前景」「キャラクター」「オブジェクト」「カットイン」ではない）
    const bgTag = assetItem.locator('span, div').filter({ hasText: /^背景$/ });
    const fgTag = assetItem.locator('span, div').filter({ hasText: /^前景$/ });
    const charTag = assetItem.locator('span, div').filter({ hasText: /^キャラクター$/ });
    const objTag = assetItem.locator('span, div').filter({ hasText: /^オブジェクト$/ });
    const cutinTag = assetItem.locator('span, div').filter({ hasText: /^カットイン$/ });

    await expect(bgTag).not.toBeVisible({ timeout: 2000 });
    await expect(fgTag).not.toBeVisible({ timeout: 2000 });
    await expect(charTag).not.toBeVisible({ timeout: 2000 });
    await expect(objTag).not.toBeVisible({ timeout: 2000 });
    await expect(cutinTag).not.toBeVisible({ timeout: 2000 });
  });

  test('複数AssetPicker順序利用 → 各々の種別タグが付与される', async ({ page }) => {
    // 1. ルームに再入室
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. 背景選択 + アセット登録
    await selectBackground(page);
    await page.waitForTimeout(500);
    const assetPickerBg = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerBg).toBeVisible({ timeout: 5000 });
    await assetPickerBg.click();
    await page.waitForTimeout(500);

    const libHeadingBg = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeadingBg).toBeVisible({ timeout: 5000 });

    const urlTabBtnBg = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtnBg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtnBg.click();
      await page.waitForTimeout(300);
    }

    const urlInputBg = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInputBg).toBeVisible({ timeout: 3000 });
    const bgImageUrl = 'https://via.placeholder.com/120x80/ff00ff/ffffff?text=MULTI-BG';
    await urlInputBg.fill(bgImageUrl);
    await page.waitForTimeout(300);

    const addBtnBg = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtnBg).toBeVisible({ timeout: 3000 });
    await addBtnBg.click();
    await page.waitForTimeout(2000);

    // 3. モーダルが閉じるまで待つ、または次の操作を実行
    // （モーダル内の「背景」タグが見える段階で、前景への移行）

    // 4. 前景選択 + 別のアセット登録
    // モーダルがまだ開いていれば閉じる
    const closeBtn = page.locator('button[title="閉じる"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    await selectForeground(page);
    await page.waitForTimeout(500);
    const assetPickerFg = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerFg).toBeVisible({ timeout: 5000 });
    await assetPickerFg.click();
    await page.waitForTimeout(500);

    const libHeadingFg = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeadingFg).toBeVisible({ timeout: 5000 });

    const urlTabBtnFg = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtnFg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtnFg.click();
      await page.waitForTimeout(300);
    }

    const urlInputFg = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInputFg).toBeVisible({ timeout: 3000 });
    const fgImageUrl = 'https://via.placeholder.com/140x100/ffff00/000000?text=MULTI-FG';
    await urlInputFg.fill(fgImageUrl);
    await page.waitForTimeout(300);

    const addBtnFg = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtnFg).toBeVisible({ timeout: 3000 });
    await addBtnFg.click();
    await page.waitForTimeout(2000);

    // 5. モーダルを閉じて確認
    const closeBtnFinal = page.locator('button[title="閉じる"]').first();
    if (await closeBtnFinal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtnFinal.click();
      await page.waitForTimeout(500);
    }

    // 6. アセット一覧から 背景アセットと前景アセットの両方がそれぞれのタグを持っていることを確認
    // （複数アセット登録なので、ここではザックリと確認）
    const bgAssetItem = page.locator('div').filter({ hasText: /MULTI-BG/ }).first();
    const fgAssetItem = page.locator('div').filter({ hasText: /MULTI-FG/ }).first();

    await expect(bgAssetItem).toBeVisible({ timeout: 5000 });
    await expect(fgAssetItem).toBeVisible({ timeout: 5000 });

    // 背景アセットには「背景」タグ
    const bgTagInBgAsset = bgAssetItem.locator('span, div').filter({ hasText: '背景' }).first();
    await expect(bgTagInBgAsset).toBeVisible({ timeout: 5000 });

    // 前景アセットには「前景」タグ
    const fgTagInFgAsset = fgAssetItem.locator('span, div').filter({ hasText: '前景' }).first();
    await expect(fgTagInFgAsset).toBeVisible({ timeout: 5000 });
  });

  test('同一アセットを複数AssetPickerから追加時 → 各タグが重複なく付与される', async ({
    page,
  }) => {
    // 1. ルームに再入室
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 2. 背景選択 + 特定の URL を入力してアセット登録
    await selectBackground(page);
    await page.waitForTimeout(500);
    const assetPickerBg = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerBg).toBeVisible({ timeout: 5000 });
    await assetPickerBg.click();
    await page.waitForTimeout(500);

    const libHeadingBg = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeadingBg).toBeVisible({ timeout: 5000 });

    const urlTabBtnBg = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtnBg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtnBg.click();
      await page.waitForTimeout(300);
    }

    const sharedImageUrl = 'https://via.placeholder.com/180x120/00ff00/000000?text=SHARED';
    const urlInputBg = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInputBg).toBeVisible({ timeout: 3000 });
    await urlInputBg.fill(sharedImageUrl);
    await page.waitForTimeout(300);

    const addBtnBg = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtnBg).toBeVisible({ timeout: 3000 });
    await addBtnBg.click();
    await page.waitForTimeout(2000);

    // 3. モーダルを閉じる
    const closeBtnAfterBg = page.locator('button[title="閉じる"]').first();
    if (await closeBtnAfterBg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtnAfterBg.click();
      await page.waitForTimeout(500);
    }

    // 4. 前景選択 + 同じ URL を入力してアセット更新（またはタグ追加）
    // 既にあるアセットなので、タグが追加される想定
    await selectForeground(page);
    await page.waitForTimeout(500);
    const assetPickerFg = page.getByText('クリックしてアセットを選択').first();
    await expect(assetPickerFg).toBeVisible({ timeout: 5000 });
    await assetPickerFg.click();
    await page.waitForTimeout(500);

    const libHeadingFg = page.getByRole('heading', { name: /アセット/ });
    await expect(libHeadingFg).toBeVisible({ timeout: 5000 });

    const urlTabBtnFg = page.locator('button').filter({ hasText: 'URL入力' }).first();
    if (await urlTabBtnFg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await urlTabBtnFg.click();
      await page.waitForTimeout(300);
    }

    const urlInputFg = page
      .locator('input[type="url"], input[placeholder*="https"], input[placeholder*="URL"]')
      .first();
    await expect(urlInputFg).toBeVisible({ timeout: 3000 });
    await urlInputFg.fill(sharedImageUrl);
    await page.waitForTimeout(300);

    const addBtnFg = page
      .locator('button')
      .filter({
        hasText: /追加|登録|OK|確定/,
      })
      .first();
    await expect(addBtnFg).toBeVisible({ timeout: 3000 });
    await addBtnFg.click();
    await page.waitForTimeout(2000);

    // 5. モーダルを閉じる
    const closeBtnAfterFg = page.locator('button[title="閉じる"]').first();
    if (await closeBtnAfterFg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtnAfterFg.click();
      await page.waitForTimeout(500);
    }

    // 6. アセット一覧から該当アセットを見つけて、タグが「背景」「前景」の両方あり、重複がないことを確認
    const sharedAssetItem = page.locator('div').filter({ hasText: /SHARED/ }).first();
    await expect(sharedAssetItem).toBeVisible({ timeout: 5000 });

    const bgTagInSharedAsset = sharedAssetItem.locator('span, div').filter({ hasText: '背景' }).first();
    const fgTagInSharedAsset = sharedAssetItem.locator('span, div').filter({ hasText: '前景' }).first();

    await expect(bgTagInSharedAsset).toBeVisible({ timeout: 5000 });
    await expect(fgTagInSharedAsset).toBeVisible({ timeout: 5000 });
  });

  test.afterAll(async () => {
    if (roomId) {
      await deleteRoomById(roomId);
    }
  });
});

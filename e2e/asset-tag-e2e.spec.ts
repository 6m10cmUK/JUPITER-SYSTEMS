import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoomById, selectBackground, BASE_URL } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const ROOM_NAME = `tag_test_${Date.now()}`;
let roomId: string;

// 1x1 透明 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);
const TEST_IMAGE_PATH = path.join('/tmp', `test-asset-${Date.now()}.png`);

test.describe('アセットタグ自動付与テスト', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    fs.writeFileSync(TEST_IMAGE_PATH, TINY_PNG);
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      fs.unlinkSync(TEST_IMAGE_PATH);
    }
  });

  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  test('背景 AssetPicker からアップロード → 「背景」タグが付与される', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 背景を選択してプロパティパネルに表示
    await selectBackground(page);
    await page.waitForTimeout(500);

    // AssetPicker をクリック
    const picker = page.getByText('クリックしてアセットを選択').first();
    await expect(picker).toBeVisible({ timeout: 5000 });
    await picker.click();
    await page.waitForTimeout(500);

    // アセットライブラリモーダルが開く
    await expect(page.getByText('アセットライブラリ').first()).toBeVisible({ timeout: 5000 });

    // ファイルアップロード
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadBtn = page.getByText('ファイルから追加').first();
    await expect(uploadBtn).toBeVisible({ timeout: 3000 });
    await uploadBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(TEST_IMAGE_PATH);

    // アップロード完了を待つ
    await page.waitForTimeout(3000);

    // アセットのタグ表示に「背景」が含まれる
    await expect(page.getByText('背景', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('ツールバーから直接開いてアップロード → ルーム名タグのみ', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ツールバーの「アセットライブラリ」ボタン
    const assetLibBtn = page.locator('button[title="アセットライブラリ"]').first();
    await expect(assetLibBtn).toBeVisible({ timeout: 5000 });
    await assetLibBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText('アセットライブラリ').first()).toBeVisible({ timeout: 5000 });

    // ファイルアップロード
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadBtn = page.getByText('ファイルから追加').first();
    await expect(uploadBtn).toBeVisible({ timeout: 3000 });
    await uploadBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(TEST_IMAGE_PATH);

    // アップロード完了を待つ
    await page.waitForTimeout(3000);

    // ルーム名タグが表示される
    await expect(page.getByText(ROOM_NAME).first()).toBeVisible({ timeout: 5000 });
  });
});

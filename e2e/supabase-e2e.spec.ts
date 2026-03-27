import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, enterRoom, addScene, sendChat, deleteRoom } from './helpers';

const ROOM_NAME = `テスト_${Date.now()}`;

test.describe.serial('Adrastea Supabase E2E', () => {
  let roomId: string;

  test('ロビー画面が表示される', async ({ page }) => {
    await goToLobby(page);
    await expect(page.getByRole('heading', { name: /Adrastea/ })).toBeVisible();
    await expect(page.getByText('ルームを作成')).toBeVisible();
  });

  test('ルーム作成 → 一覧に表示', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
    await goToLobby(page);
    await expect(page.getByText(ROOM_NAME)).toBeVisible();
  });

  test('ルーム入室 → エディタ表示', async ({ page }) => {
    await goToLobby(page);
    await enterRoom(page, ROOM_NAME);
    await expect(page.getByText('シーン')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('レイヤー')).toBeVisible();
  });

  test('デフォルトシーン「メイン」が存在', async ({ page }) => {
    await page.goto(`http://localhost:6100/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('メイン')).toBeVisible({ timeout: 10000 });
  });

  test('シーン追加 → シーン一覧に表示', async ({ page }) => {
    await page.goto(`http://localhost:6100/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await addScene(page);
    await expect(
      page.locator('[data-selection-panel]').first().getByText(/新しいシーン|シーン/)
    ).toBeVisible({ timeout: 5000 });
  });

  test('チャットメッセージ送信 → ログに表示', async ({ page }) => {
    await page.goto(`http://localhost:6100/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const testMsg = `e2e_test_${Date.now()}`;
    await sendChat(page, testMsg);
    await expect(page.getByText(testMsg)).toBeVisible({ timeout: 5000 });
  });

  test('ダイスロール → 結果表示', async ({ page }) => {
    await page.goto(`http://localhost:6100/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await sendChat(page, '1d6');
    await expect(page.locator('text=/\\d+/')).toBeVisible({ timeout: 5000 });
  });

  test('ルーム削除 → 一覧から消える', async ({ page }) => {
    await deleteRoom(page, ROOM_NAME);
    await goToLobby(page);
    await expect(page.getByText(ROOM_NAME)).not.toBeVisible({ timeout: 5000 });
  });
});

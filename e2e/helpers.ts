import type { Page } from '@playwright/test';

const BASE_URL = 'https://localhost:6100';

export async function goToLobby(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/adrastea/`);
  await page.waitForLoadState('networkidle');
  await page.getByText('ルームを作成').waitFor({ timeout: 10000 });
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.getByText('ルームを作成').click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('textbox', { name: 'ルーム名', exact: true }).fill(name);
  await page.getByRole('button', { name: '作成' }).click();
  await page.waitForURL(/\/adrastea\/[a-f0-9-]+/, { timeout: 15000 });
  const url = page.url();
  return url.split('/adrastea/')[1];
}

export async function enterRoom(page: Page, roomName: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(roomName) }).click();
  await page.waitForURL(/\/adrastea\/[a-f0-9-]+/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

export async function addScene(page: Page): Promise<void> {
  const scenePanel = page.locator('[data-selection-panel]').first();
  await scenePanel.getByRole('button', { name: /シーンを追加|新規作成/ }).click();
  await page.waitForTimeout(500);
}

export async function sendChat(page: Page, message: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // dockview レイアウト完了待ち
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();
  await editor.pressSequentially(message, { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000); // Supabase Realtime 反映待ち
}

export async function deleteRoom(page: Page, roomName: string): Promise<void> {
  await goToLobby(page);
  // ルームカードを特定
  const roomCard = page.locator(`button:has-text("${roomName}")`).first();
  if (await roomCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    // カード内の削除ボタン（title="削除"）
    const deleteIcon = roomCard.locator('button[title="削除"]');
    await deleteIcon.click({ force: true });
    await page.waitForTimeout(500);
    // 確認モーダルの「削除」ボタン — AdButton variant="danger"
    await page.getByRole('button', { name: '削除', exact: true }).last().click();
    await page.waitForTimeout(2000);
  }
}

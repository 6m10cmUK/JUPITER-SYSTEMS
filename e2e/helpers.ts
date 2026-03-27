import type { Page } from '@playwright/test';

const BASE_URL = 'http://localhost:6100';

export async function goToLobby(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/adrastea/`);
  await page.waitForLoadState('networkidle');
  await page.getByText('ルームを作成').waitFor({ timeout: 10000 });
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await page.getByText('ルームを作成').click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('textbox', { name: 'ルーム名' }).fill(name);
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
  const input = page.getByPlaceholder('メッセージを入力');
  await input.fill(message);
  await input.press('Enter');
  await page.waitForTimeout(500);
}

export async function deleteRoom(page: Page, roomName: string): Promise<void> {
  await goToLobby(page);
  const roomCard = page.locator('button').filter({ has: page.getByText(roomName) });
  if (await roomCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    const deleteBtn = roomCard.getByRole('button', { name: '削除' });
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

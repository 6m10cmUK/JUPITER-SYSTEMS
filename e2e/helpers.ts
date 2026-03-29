import type { Page } from '@playwright/test';

export const BASE_URL = 'https://localhost:6100';

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
  // シーン追加がレンダリングされるまで待つ
  await page.getByText('新しいシーン', { exact: false }).first().waitFor({ state: 'visible', timeout: 5000 });
}

export async function sendChat(page: Page, message: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();
  await editor.pressSequentially(message, { delay: 30 });
  await page.keyboard.press('Enter');
}

export async function deleteRoom(page: Page, roomName: string): Promise<void> {
  await goToLobby(page);
  // SortableRoomCard は aria-roledescription="sortable" を持つ
  const card = page.locator('[aria-roledescription="sortable"]').filter({ hasText: roomName }).first();
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    // hover して削除ボタンを表示
    await card.hover();
    await page.waitForTimeout(300);
    const deleteIcon = card.locator('button[title="削除"]');
    if (await deleteIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteIcon.click({ force: true });
      await page.waitForTimeout(500);
      // 確認ダイアログ内の「削除」ボタン
      const dialog = page.getByRole('dialog').first();
      const confirmBtn = dialog.getByRole('button', { name: '削除', exact: true });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        // 削除がDBに反映されるまで待つ
        await page.waitForTimeout(3000);
      }
    }
  }
}

export async function selectBackground(page: Page): Promise<void> {
  const bgBtn = page.getByRole('button', { name: '背景' }).first();
  await bgBtn.waitFor({ state: 'visible', timeout: 5000 });
  await bgBtn.click({ force: true });
}

export async function selectForeground(page: Page): Promise<void> {
  const fgBtn = page.getByRole('button', { name: '前景' }).first();
  await fgBtn.waitFor({ state: 'visible', timeout: 5000 });
  await fgBtn.click({ force: true });
}

export async function addTextObject(page: Page): Promise<void> {
  // レイヤーパネルの + ボタン（テキストオブジェクト追加）
  const addObjBtn = page.locator('button[aria-label*="追加"]').first();
  await addObjBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addObjBtn.click();
  // メニュー項目が表示されるまで待つ
  const textBtn = page.getByRole('button', { name: 'テキスト' }).first();
  await textBtn.waitFor({ state: 'visible', timeout: 5000 });
  await textBtn.click();
}

export async function addCharacter(page: Page): Promise<void> {
  // キャラクターパネルの + ボタン
  const addCharBtn = page.locator('button[aria-label*="キャラクター"]').first();
  await addCharBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addCharBtn.click();
}

export async function addBgmTrack(page: Page, trackName: string = 'TestBGM'): Promise<void> {
  // BGMパネルの + ボタン
  const addBgmBtn = page.locator('button[aria-label*="BGM"]').first();
  await addBgmBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addBgmBtn.click();
  // トラック名入力フィールドが表示されるまで待つ
  const nameInput = page.getByRole('textbox', { name: 'トラック名' }).first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(trackName);
}

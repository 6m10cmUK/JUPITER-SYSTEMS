import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

export const BASE_URL = 'https://localhost:6100';

const SUPABASE_URL = 'https://yrbunpqdbhlgxagifpau.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J1PYr4e0chbEHislvQVTKw_F7Wx5-WH';

/** 認証済み Supabase クライアントを取得 */
async function getSupabase() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await supabase.auth.signInWithPassword({
    email: process.env.PLAYWRIGHT_TEST_EMAIL!,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD!,
  });
  return supabase;
}

/** デバッグ用: 認証済み Supabase クライアント */
export async function getSupabaseForDebug() { return getSupabase(); }

/** ルームに属するシーンの ID 一覧を取得 */
export async function getSceneIds(roomId: string): Promise<string[]> {
  const supabase = await getSupabase();
  const { data } = await supabase.from('scenes').select('id').eq('room_id', roomId);
  return data?.map(s => s.id) ?? [];
}

/** Supabase API でルームを直接削除 */
export async function deleteRoomById(roomId: string): Promise<void> {
  const supabase = await getSupabase();
  await supabase.from('rooms').delete().eq('id', roomId);
}

/** Supabase API で BGM トラックを直接作成 */
export async function createBgmTrackDirect(roomId: string, opts: {
  name: string;
  bgmSource: string;
  sceneIds?: string[];
}): Promise<string> {
  const supabase = await getSupabase();
  const id = crypto.randomUUID();
  const now = Date.now();
  const { error } = await supabase.from('bgms').insert({
    id,
    room_id: roomId,
    name: opts.name,
    bgm_type: 'url',
    bgm_source: opts.bgmSource,
    bgm_volume: 0.5,
    bgm_loop: true,
    scene_ids: opts.sceneIds ?? [],
    is_playing: false,
    is_paused: false,
    auto_play_scene_ids: [],
    fade_in: false,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(`createBgmTrackDirect failed: ${error.message}`);
  return id;
}

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
  const addObjBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
  await addObjBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addObjBtn.click({ force: true });
  await page.waitForTimeout(300);
  const textOpt = page.getByText('シーンテキスト追加').first();
  await textOpt.waitFor({ state: 'visible', timeout: 3000 });
  await textOpt.click();
  await page.waitForTimeout(500);
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

/**
 * 設定モーダルからパネルを開く（dockview レイアウトに追加）
 * togglePanel なので、既に開いている場合は閉じてしまう点に注意。
 */
export async function openPanel(page: Page, panelTitle: string): Promise<void> {
  // 設定ボタン（title="ルーム設定"）
  await page.locator('button[title="ルーム設定"]').click();
  await page.waitForTimeout(300);

  // 設定モーダル内の「レイアウト」ナビボタン
  const modal = page.locator('.adrastea-root').last();
  await modal.getByRole('button', { name: 'レイアウト' }).click();
  await page.waitForTimeout(300);

  // パネル名の span を見つけて親の div 内のボタンを取得
  const panelSpan = modal.locator('span').filter({ hasText: panelTitle });
  await panelSpan.scrollIntoViewIfNeeded();
  const row = panelSpan.locator('xpath=..');
  const btn = row.locator('button');
  const btnText = await btn.textContent({ timeout: 3000 });
  if (btnText?.includes('表示する')) {
    await btn.click();
    await page.waitForTimeout(500);
  }

  // 設定モーダルを閉じる
  await modal.locator('button[title="閉じる"]').click();
  await page.waitForTimeout(300);
}

/**
 * パネルが表示されていなければ openPanel で開く。
 * checkSelector: パネルが表示されているか判定するセレクタ
 * panelTitle: openPanel に渡すパネル名
 */
export async function ensurePanel(page: Page, checkSelector: string, panelTitle: string): Promise<void> {
  const visible = await page.locator(checkSelector).first().isVisible({ timeout: 2000 }).catch(() => false);
  if (!visible) {
    await openPanel(page, panelTitle);
  }
}

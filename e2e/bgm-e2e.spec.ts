import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoomById, createBgmTrackDirect, getSceneIds, BASE_URL } from './helpers';

const ROOM_NAME = `bgm_test_${Date.now()}`;
let roomId: string;

const BGM_URL_1 = 'https://www.dropbox.com/scl/fi/qbry1e1h0gcisv7urbs3i/Rhuzerv.mp3?rlkey=9z8lhlbndhxy116f6g982dz6w&dl=1';
const BGM_URL_2 = 'https://www.dropbox.com/scl/fi/9udc6cqk8b2d0ngl1lhwf/.mp3?rlkey=f7fdzhedrzkwdfl4hxk9cau66&dl=1';

test.describe.serial('BGM管理テスト', () => {
  test('ルーム作成 + BGM トラック準備', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();

    const sceneIds = await getSceneIds(roomId);
    await createBgmTrackDirect(roomId, { name: 'テストBGM1', bgmSource: BGM_URL_1, sceneIds });
    await createBgmTrackDirect(roomId, { name: 'テストBGM2', bgmSource: BGM_URL_2, sceneIds });
  });

  test('BGMトラックが表示される', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    await expect(page.getByText('テストBGM1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('テストBGM2').first()).toBeVisible({ timeout: 5000 });
  });

  test('BGM ボリュームスライダー操作', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    const track1 = page.getByText('テストBGM1').first();
    await track1.waitFor({ state: 'visible', timeout: 5000 });

    // BGM トラック行内のボリュームスライダー（max=1 step=0.01 でマスターボリュームと区別）
    const volumeSlider = page.locator('input[type="range"][max="1"][step="0.01"]').first();
    await volumeSlider.waitFor({ state: 'visible', timeout: 3000 });
    await volumeSlider.fill('0.3');
    await expect(volumeSlider).toHaveValue('0.3', { timeout: 3000 });
  });

  test('BGM ミュート機能', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    const muteBtn = page.locator('button[title="ミュート"]').first();
    await muteBtn.waitFor({ state: 'visible', timeout: 3000 });
    await muteBtn.click();
    await expect(page.locator('button[title="ミュート解除"]').first()).toBeVisible({ timeout: 3000 });
  });

  test('BGM ループ切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    const loopBtn = page.locator('button[title="ループ"]').first();
    await loopBtn.waitFor({ state: 'visible', timeout: 3000 });
    const initialColor = await loopBtn.evaluate(el => el.style.color);
    await loopBtn.click();
    const afterColor = await loopBtn.evaluate(el => el.style.color);
    expect(afterColor).not.toBe(initialColor);
  });

  // 削除テストは最後（他のテストがトラックを必要とするため）
  test('BGMトラック削除（右クリック → 削除）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    const track2 = page.getByText('テストBGM2').first();
    await track2.waitFor({ state: 'visible', timeout: 5000 });

    const tracksBefore = await page.getByText(/テストBGM/).count();

    await track2.click({ button: 'right' });
    const deleteOpt = page.locator('[role="menuitem"]').filter({ hasText: '削除' }).first();
    await deleteOpt.waitFor({ state: 'visible', timeout: 3000 });
    await deleteOpt.click();

    const confirmBtn = page.getByRole('button', { name: '削除' }).last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(track2).not.toBeVisible({ timeout: 5000 });
    const tracksAfter = await page.getByText(/テストBGM/).count();
    expect(tracksAfter).toBeLessThan(tracksBefore);
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });
});

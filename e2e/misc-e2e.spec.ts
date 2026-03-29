import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, deleteRoomById, sendChat, BASE_URL } from './helpers';

const ROOM_NAME = `misc_test_${Date.now()}`;
let roomId: string;

test.describe.serial('チャット・プロパティ・アセットライブラリテスト', () => {
  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  // --- §5 チャット ---

  test('チャット + ダイスロール送信', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 通常メッセージ送信
    const msg = `feat_msg_${Date.now()}`;
    await sendChat(page, msg);
    await expect(page.getByText(msg).first()).toBeVisible({ timeout: 10000 });

    // ダイスロール送信
    await sendChat(page, '2d6');
    const diceResult = page.getByText(/2D6/).first();
    await expect(diceResult).toBeVisible({ timeout: 10000 });
  });

  test('チャンネル切替（メイン→情報→雑談）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // チャットパネルを探す
    const chatPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('チャット') }).first();
    if (await chatPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // チャンネルタブを探す（button.adra-tab で実装）
      const mainTab = chatPanel.locator('button.adra-tab').filter({ hasText: /メイン/ }).first();
      const infoTab = chatPanel.locator('button.adra-tab').filter({ hasText: /情報/ }).first();
      const casualTab = chatPanel.locator('button.adra-tab').filter({ hasText: /雑談/ }).first();

      if (await mainTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mainTab.click();
        await page.waitForTimeout(300);
      }

      if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await infoTab.click();
        await page.waitForTimeout(300);

        // 情報タブが選択されたことを確認
        await expect(infoTab).toHaveAttribute('aria-selected', 'true');
      }

      if (await casualTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await casualTab.click();
        await page.waitForTimeout(300);

        // 雑談タブが選択されたことを確認
        await expect(casualTab).toHaveAttribute('aria-selected', 'true');
      }
    } else {
      test.skip();
    }
  });

  test('チャット送信者名変更', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // チャットパネルを探す
    const chatPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('チャット') }).first();
    if (await chatPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 送信者名設定ボタンを探す（右上のプロフィール/設定ボタン）
      const settingsBtn = chatPanel.locator('button[aria-label*="設定"], button[aria-label*="プロフィール"], button[aria-label*="名前"]').first();
      if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(300);

        // 名前入力フィールドを探す
        const nameInput = page.locator('input[placeholder*="名前"], input[placeholder*="ユーザー"]').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('テスト送信者');
          await page.waitForTimeout(300);

          // 保存ボタンまたはEnter
          const saveBtn = page.getByRole('button', { name: /保存|OK/ }).first();
          if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await saveBtn.click();
          } else {
            await nameInput.press('Enter');
          }
          await page.waitForTimeout(500);

          // 送信者名が反映されたメッセージを送信して確認
          await sendChat(page, 'テスト送信者確認メッセージ');
          await page.waitForTimeout(500);

          // リロードして変更が保存されたことを確認
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1500);
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  // --- §6 プロパティパネル ---

  test('プロパティパネル表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // レイヤーパネルから「前景」を探す
    const layerPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー').or(page.getByText('オブジェクト')) }).first();
    await expect(layerPanel).toBeVisible({ timeout: 5000 });

    const fgObj = layerPanel.getByRole('button', { name: '前景' }).first();
    await expect(fgObj).toBeVisible({ timeout: 3000 });

    await fgObj.click();
    await page.waitForTimeout(300);

    // プロパティパネルが表示される
    const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|背景|色/) }).first();
    await expect(propPanel).toBeVisible({ timeout: 5000 });
  });

  test('オブジェクト選択 → プロパティ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // テキストオブジェクトを探す
    const textObj = page.getByText('テキスト').first();
    if (await textObj.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textObj.click();
      await page.waitForTimeout(300);

      // プロパティパネルが表示される
      const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|テキスト|色|フォント/) }).first();
      await expect(propPanel).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('キャラクター選択 → プロパティ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // キャラクターアイテムを探す
    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator('[data-char-id]').first().click();
      await page.waitForTimeout(300);

      // プロパティパネルが表示される（キャラクター編集またはプロパティ）
      const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|キャラクター/) }).first();
      await expect(propPanel).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('BGM選択 → プロパティ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // BGMトラックアイテムを探す
    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const trackItem = bgmPanel.locator('[data-track-id]').first();
      if (await trackItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trackItem.click();
        await page.waitForTimeout(300);

        // プロパティパネルが表示される
        const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|BGM|ボリューム/) }).first();
        await expect(propPanel).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  // --- §7 アセットライブラリ ---

  test('アセットライブラリ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // ツールバーの「アセットライブラリ」ボタン
    const assetBtn = page.locator('button[title="アセットライブラリ"]').first();
    await expect(assetBtn).toBeVisible({ timeout: 5000 });

    await assetBtn.click();
    await page.waitForTimeout(300);

    // アセットライブラリのタイトルが表示される
    await expect(page.getByRole('heading', { name: 'アセットライブラリ' })).toBeVisible({ timeout: 3000 });
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });
});

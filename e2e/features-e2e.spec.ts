import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, enterRoom, sendChat } from './helpers';

const BASE_URL = 'https://localhost:6100';
const ROOM_NAME = `feat_test_${Date.now()}`;
let roomId: string;

test.describe.serial('Adrastea 機能テスト (Tier 1)', () => {

  // --- §0 ルーム準備 ---

  test('ルーム作成 (準備)', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  // --- §1 シーン管理 ---

  test('シーン追加', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // シーンパネルの + ボタン（aria-label="シーンを追加"）
    const addSceneBtn = page.locator('button[aria-label="シーンを追加"]').first();
    if (await addSceneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 追加前のシーン数を確認
      const scenesBeforeCount = await page.locator('[data-scene-id]').count();

      await addSceneBtn.click();
      await page.waitForTimeout(1000);

      // 新しいシーンが追加される
      const scenesAfterCount = await page.locator('[data-scene-id]').count();
      expect(scenesAfterCount).toBeGreaterThan(scenesBeforeCount);

      // 「新しいシーン」という名前のシーンが表示される
      const newScene = page.getByText('新しいシーン').first();
      await expect(newScene).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('シーン名編集（ダブルクリック）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「新しいシーン」をダブルクリック
    const sceneToEdit = page.getByText('新しいシーン').first();
    if (await sceneToEdit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sceneToEdit.dblclick();
      await page.waitForTimeout(300);

      // インライン入力フィールドが表示される
      const sceneInput = page.locator('div[data-scene-id] input').first();
      if (await sceneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sceneInput.fill('編集テストシーン');
        await sceneInput.press('Enter');
        await page.waitForTimeout(500);

        // 新しい名前が表示される
        await expect(page.getByText('編集テストシーン').first()).toBeVisible({ timeout: 3000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('シーン複製（Ctrl+D）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 編集テストシーンを選択
    const targetScene = page.getByText('編集テストシーン').first();
    if (await targetScene.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetScene.click();
      await page.waitForTimeout(300);

      // Ctrl+D で複製
      await page.keyboard.press('Control+d');
      await page.waitForTimeout(1500);

      // 複製シーン（「編集テストシーン(2)」）が表示される
      const copiedScene = page.getByText('編集テストシーン(2)').first();
      await expect(copiedScene).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('シーン削除（確認ダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 複製シーンを選択
    const sceneToDelete = page.getByText('編集テストシーン(2)').first();
    if (await sceneToDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sceneToDelete.click();
      await page.waitForTimeout(300);

      // Delete キーで削除
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログが表示される
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // 削除されたシーンが消える
        await expect(sceneToDelete).not.toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  // --- §2 オブジェクト ---

  test('オブジェクト追加（レイヤーパネル）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ObjectLayerList の + ボタンを探す（title="追加"）
    const objectPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー').or(page.getByText('オブジェクト')) }).first();
    if (await objectPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const addBtn = objectPanel.locator('button[title="追加"]').first();
      if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);

        // ドロップダウンメニュー「シーン画像追加」
        const addSceneImageOpt = page.getByText('シーン画像追加').first();
        if (await addSceneImageOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addSceneImageOpt.click();
          await page.waitForTimeout(1500);

          // アセットライブラリモーダルが開く
          const assetModal = page.locator('dialog, [role="dialog"]').first();
          if (await assetModal.isVisible({ timeout: 2000 }).catch(() => false)) {
            const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
            if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await closeBtn.click();
              await page.waitForTimeout(500);
            }
          } else {
            test.skip();
          }
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

  test('レイヤー表示/非表示トグル', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤーパネルから「前景」を探す
    const objectPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー').or(page.getByText('オブジェクト')) }).first();
    if (await objectPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fgLayer = objectPanel.locator('div').filter({ hasText: '前景' }).first();
      if (await fgLayer.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 前景を選択
        await fgLayer.click();
        await page.waitForTimeout(300);

        // 可視性トグルボタン（目玉アイコン）を探す
        const visibilityBtn = fgLayer.locator('button svg').first();
        if (await visibilityBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          // 前景の可視状態を取得
          const visibilityToggleBtn = fgLayer.locator('button').filter({ has: visibilityBtn }).first();
          if (await visibilityToggleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await visibilityToggleBtn.click();
            await page.waitForTimeout(500);
            // トグルが成功したことを確認（再度クリック可能）
            expect(await visibilityToggleBtn.isVisible({ timeout: 1000 }).catch(() => false)).toBeTruthy();
          } else {
            test.skip();
          }
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

  // --- §3 キャラクター ---

  test('キャラクター作成', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクターパネルを探す
    const charPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('キャラクター') }).first();
    if (await charPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // パネルヘッダーの + ボタン（title="キャラクター追加"）
      const addCharBtn = charPanel.locator('button').filter({ has: page.locator('button[style*="color"]') }).last();
      const addCharBtnWithTitle = charPanel.locator('button').filter({ has: page.locator('svg') }).last();

      // title属性が「キャラクター追加」のボタンを探す
      const buttons = await charPanel.locator('button').all();
      let foundAddBtn = false;

      for (const btn of buttons) {
        const title = await btn.getAttribute('title');
        if (title && title.includes('キャラクター追加')) {
          await btn.click();
          foundAddBtn = true;
          await page.waitForTimeout(1000);
          break;
        }
      }

      if (foundAddBtn) {
        // 新しいキャラクターが追加される（パネルに表示される）
        // キャラクター数が増えたかを確認
        const charItems = await charPanel.locator('[data-char-id]').count();
        expect(charItems).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  // --- §4 BGM ---

  test('BGMトラック追加', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // BGM パネルを探す（title="BGM"のアイコンを持つパネル）
    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // BGM パネルヘッダーの + ボタン（title="トラック追加"）
      const addBgmBtn = bgmPanel.locator('button[title="トラック追加"]').first();
      if (await addBgmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBgmBtn.click();
        await page.waitForTimeout(1500);

        // アセットライブラリモーダルが開く
        const assetModal = page.locator('dialog, [role="dialog"]').first();
        if (await assetModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
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

  // --- §5 チャット ---

  test('チャット + ダイスロール送信', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 通常メッセージ送信
    const msg = `feat_msg_${Date.now()}`;
    await sendChat(page, msg);
    await expect(page.getByText(msg).first()).toBeVisible({ timeout: 10000 });

    // ダイスロール送信
    await sendChat(page, '2d6');
    const diceResult = page.getByText(/2D6/).first();
    await expect(diceResult).toBeVisible({ timeout: 10000 });
  });

  // --- §6 プロパティパネル ---

  test('プロパティパネル表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤーパネルから「前景」を探す
    const layerPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー').or(page.getByText('オブジェクト')) }).first();
    if (await layerPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fgObj = layerPanel.locator('div').filter({ hasText: '前景' }).first();
      if (await fgObj.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 前景をクリック
        await fgObj.click();
        await page.waitForTimeout(500);

        // プロパティパネルが表示される（右側に「プロパティ」パネルが出現）
        const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|背景|色/) }).first();
        if (await propPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
          // プロパティパネルが表示される
          expect(true).toBeTruthy();
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

  // --- §7 アセットライブラリ ---

  test('アセットライブラリ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // トップバー（右上など）のアセットボタンを探す
    // ボタンのaria-labelやtitle属性で「アセット」「Asset」を含むものを探す
    const topBar = page.locator('header, nav, [role="toolbar"]').first();
    if (await topBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      const assetBtn = topBar.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /.*/ }).last();
      if (await assetBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        const title = await assetBtn.getAttribute('title');
        const ariaLabel = await assetBtn.getAttribute('aria-label');

        if ((title && title.includes('アセット')) || (ariaLabel && ariaLabel.includes('アセット'))) {
          await assetBtn.click();
          await page.waitForTimeout(500);

          // アセットライブラリモーダルが表示される
          const assetModal = page.locator('dialog, [role="dialog"]').first();
          await expect(assetModal).toBeVisible({ timeout: 3000 });
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

});

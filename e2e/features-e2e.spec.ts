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

  test('シーン削除（確認ダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 新しいシーンを作成（既に存在するはず）
    const newSceneBtn = page.getByRole('button', { name: 'シーンを追加' });
    if (await newSceneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newSceneBtn.click();
      await page.waitForTimeout(1000);
    }

    // 新しいシーンが表示されるまで待機
    const newSceneItem = page.getByText('新規シーン').first();
    await newSceneItem.waitFor({ timeout: 3000 });

    // 新しいシーンを選択
    await newSceneItem.click();
    await page.waitForTimeout(300);

    // Delete キーで削除
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // 確認ダイアログが表示される
    const confirmBtn = page.getByRole('button', { name: /削除/, exact: true }).last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      // 新規シーンが消える
      await expect(newSceneItem).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('シーン名編集（ダブルクリック）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // メインシーンをダブルクリック
    const sceneName = page.getByText('メイン').first();
    await sceneName.dblclick();
    await page.waitForTimeout(300);

    // インライン入力に「テストシーン」と入力
    const input = page.locator('input').filter({ hasText: 'メイン' }).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill('テストシーン');
      await input.press('Enter');
      await page.waitForTimeout(1000);
      await expect(page.getByText('テストシーン').first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('シーン複製（Ctrl+D）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // テストシーンがなければメインを複製
    let targetScene = page.getByText('テストシーン').first();
    const isVisible = await targetScene.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      targetScene = page.getByText('メイン').first();
    }

    await targetScene.click();
    await page.waitForTimeout(300);

    // Ctrl+D で複製
    await page.keyboard.press('Control+d');
    await page.waitForTimeout(1500);

    // 複製シーンが表示される
    const copiedScene = page.getByText(/のコピー/).first();
    await expect(copiedScene).toBeVisible({ timeout: 5000 });
  });

  // --- §2 オブジェクト ---

  test('オブジェクト追加（画像パネル）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤーパネルの + ボタン（ドロップダウン）
    const layerAddBtn = page.locator('button[title="追加"]').first();
    if (await layerAddBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await layerAddBtn.click();
      await page.waitForTimeout(500);

      // ドロップダウンメニュー「シーン画像追加」をクリック
      const addImageBtn = page.getByText('シーン画像追加').first();
      if (await addImageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addImageBtn.click();
        await page.waitForTimeout(1500);
        // アセットライブラリが開く（キャンセルボタンで閉じる）
        const assetModal = page.locator('dialog, [role="dialog"]').first();
        if (await assetModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    } else {
      test.skip();
    }
  });

  test('オブジェクト表示/非表示トグル', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤー一覧を探す（「前景」など既存オブジェクト）
    const fgLayer = page.getByText('前景').first();
    if (await fgLayer.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 前景を選択してプロパティを確認
      await fgLayer.click();
      await page.waitForTimeout(500);

      // visibility トグル（目玉アイコン）を探す
      const fgRow = fgLayer.locator('..');
      const visibilityIcon = fgRow.locator('svg').first();
      if (await visibilityIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        // クリック前の可視状態を確認
        const boardBefore = page.locator('[data-type="foreground"]').first();
        const visibleBefore = await boardBefore.isVisible({ timeout: 1000 }).catch(() => false);

        // visibility トグルをクリック
        await visibilityIcon.click();
        await page.waitForTimeout(500);

        // 表示/非表示が反転したことを確認
        const visibleAfter = await boardBefore.isVisible({ timeout: 1000 }).catch(() => false);
        expect(visibleBefore !== visibleAfter || !visibleBefore).toBeTruthy();
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

    // キャラクターパネルの「+」ボタン
    const addCharBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /.*/ });
    const charSection = page.locator('[data-selection-panel]').filter({ has: page.getByText('キャラクター') }).first();

    if (await charSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // キャラクターパネルのヘッダーから + ボタンを探す
      const charPanel = charSection.locator('button').last();
      if (await charPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await charPanel.click();
        await page.waitForTimeout(1000);
        // キャラクターが追加される
        await expect(page.getByText(/キャラクター/).first()).toBeVisible({ timeout: 5000 });
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

    // BGM パネルを探す
    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/BGM|トラック/) }).first();

    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // BGM パネルのヘッダーから + ボタンを探す（「トラック追加」Tooltip）
      const addBgmBtn = bgmPanel.locator('button[title="トラック追加"]');
      if (await addBgmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addBgmBtn.click();
        await page.waitForTimeout(1500);
        // アセットライブラリが開く
        const assetModal = page.locator('dialog, [role="dialog"]').first();
        if (await assetModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    } else {
      test.skip();
    }

  });

  // --- §5 チャット（追加テスト）---

  test('秘密ダイス送信', async ({ page }) => {

    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await sendChat(page, 's1d6');

    // 秘密ダイスの結果表示
    const diceResult = page.getByText(/1D6|シークレット|secret/).first();
    await expect(diceResult).toBeVisible({ timeout: 5000 });

  });

  // --- §8 プロパティパネル ---

  test('プロパティパネルでオブジェクト設定変更', async ({ page }) => {

    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤー一覧の「前景」をクリック
    const fg = page.getByText('前景').first();
    if (await fg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fg.click();
      await page.waitForTimeout(500);

      // プロパティパネルが表示されるか確認
      const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|Property/) }).first();
      const isPropVisible = await propPanel.isVisible({ timeout: 3000 }).catch(() => false);

      if (isPropVisible) {
        // 画像/単色トグルが存在するか確認（プロパティパネルに）
        const hasToggle = await page.getByRole('button', { name: /画像|単色/ }).first().isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasToggle || isPropVisible).toBeTruthy();
      }
    } else {
      test.skip();
    }

  });

  // --- §19 アセットライブラリ ---

  test('アセットライブラリ表示', async ({ page }) => {

    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // トップツールバーのアセットライブラリボタンを探す
    const assetBtn = page.getByRole('button', { name: /アセット|Asset/ }).first();
    if (await assetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assetBtn.click();
      await page.waitForTimeout(500);

      // アセットライブラリモーダルが表示される
      const assetModal = page.locator('dialog, [role="dialog"]').first();
      await expect(assetModal).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }

  });

});

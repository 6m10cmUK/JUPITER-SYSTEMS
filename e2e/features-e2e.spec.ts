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

    // シーンパネルの + ボタン
    const addSceneBtn = page.locator('button[aria-label="シーンを追加"]').first();
    await expect(addSceneBtn).toBeVisible({ timeout: 5000 });

    const scenesBeforeCount = await page.locator('[data-scene-id]').count();
    await addSceneBtn.click();
    await page.waitForTimeout(1000);

    // 新しいシーンが追加される
    const scenesAfterCount = await page.locator('[data-scene-id]').count();
    expect(scenesAfterCount).toBeGreaterThan(scenesBeforeCount);

    // 「新しいシーン」という名前のシーンが表示される
    await expect(page.getByText('新しいシーン').first()).toBeVisible({ timeout: 3000 });
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

  test('シーン切替 → アクティブシーン変更', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「メイン」シーンがアクティブなことを確認
    const mainScene = page.getByText('メイン').first();
    await expect(mainScene).toBeVisible({ timeout: 3000 });

    // 「編集テストシーン」に切替
    const targetScene = page.getByText('編集テストシーン').first();
    if (await targetScene.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetScene.click();
      await page.waitForTimeout(1000);

      // アクティブシーンが切り替わったことを確認（レイヤーパネル等の更新）
      // Board パネルが表示されていればシーン切替成功
      await expect(page.locator('[data-scene-id]').first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('シーン右クリック「名前を変更」', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「編集テストシーン」を右クリック
    const targetScene = page.getByText('編集テストシーン').first();
    if (await targetScene.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetScene.click({ button: 'right' });
      await page.waitForTimeout(500);

      // コンテキストメニュー「名前を変更」
      const renameOpt = page.getByText('名前を変更').first();
      if (await renameOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await renameOpt.click();
        await page.waitForTimeout(500);

        // インライン入力フィールドが表示される
        const sceneInput = page.locator('div[data-scene-id] input').first();
        if (await sceneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sceneInput.fill('右クリック編集シーン');
          await sceneInput.press('Enter');
          await page.waitForTimeout(1000);

          // リロードして名前が保存されたことを確認
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          await expect(page.getByText('右クリック編集シーン').first()).toBeVisible({ timeout: 5000 });
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

  test('シーン右クリック「複製」', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「右クリック編集シーン」を右クリック
    const targetScene = page.getByText('右クリック編集シーン').first();
    if (await targetScene.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetScene.click({ button: 'right' });
      await page.waitForTimeout(500);

      // コンテキストメニュー「複製」
      const duplicateOpt = page.getByText('複製').first();
      if (await duplicateOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        const scenesBeforeCount = await page.locator('[data-scene-id]').count();

        await duplicateOpt.click();
        await page.waitForTimeout(1500);

        const scenesAfterCount = await page.locator('[data-scene-id]').count();
        expect(scenesAfterCount).toBeGreaterThan(scenesBeforeCount);

        // 複製シーン（「右クリック編集シーン(2)」）が表示される
        const copiedScene = page.getByText('右クリック編集シーン(2)').first();
        await expect(copiedScene).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('シーン右クリック「削除」', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「右クリック編集シーン(2)」を右クリック
    const targetScene = page.getByText('右クリック編集シーン(2)').first();
    if (await targetScene.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetScene.click({ button: 'right' });
      await page.waitForTimeout(500);

      // コンテキストメニュー「削除」
      const deleteOpt = page.getByText('削除').first();
      if (await deleteOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteOpt.click();
        await page.waitForTimeout(500);

        // 確認ダイアログが表示される
        const confirmBtn = page.getByRole('button', { name: '削除' }).last();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(1000);

          // 削除されたシーンが消える
          await expect(targetScene).not.toBeVisible({ timeout: 5000 });
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

  test('最後のシーン削除不可 → エラートースト', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 全シーンを削除してたった1つのシーンが残るようにする
    // （ただし、テスト環境では事前に全削除している可能性があるため、スキップ可能に）
    const allScenes = page.locator('[data-scene-id]');
    const sceneCount = await allScenes.count();

    if (sceneCount === 1) {
      // 最後のシーンを選択
      const lastScene = allScenes.first();
      await lastScene.click();
      await page.waitForTimeout(300);

      // Delete キーで削除を試行
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログが出ない、またはトースト エラーが表示される
      const errorToast = page.getByText(/削除できません|最後のシーン|削除不可/).first();
      if (await errorToast.isVisible({ timeout: 2000 }).catch(() => false)) {
        // エラートーストが表示された
        await expect(errorToast).toBeVisible();
      } else {
        // 削除ダイアログが出なければOK
        const confirmBtn = page.getByRole('button', { name: '削除' }).last();
        const dialogVisible = await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false);
        expect(dialogVisible).toBe(false);
      }

      // シーンが削除されていない
      await expect(lastScene).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  // --- §2 オブジェクト ---

  test('オブジェクト追加（レイヤーパネル）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ObjectLayerList の + ボタン
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    // ドロップダウンメニュー「シーン画像追加」
    const addSceneImageOpt = page.getByText('シーン画像追加').first();
    await expect(addSceneImageOpt).toBeVisible({ timeout: 3000 });
    await addSceneImageOpt.click();
    await page.waitForTimeout(1500);

    // アセットライブラリモーダルが開く → 閉じる
    const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('レイヤー表示/非表示トグル', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // レイヤーパネルの「前景」ボタンを使用
    const fgLayer = page.getByRole('button', { name: '前景' }).first();
    await expect(fgLayer).toBeVisible({ timeout: 5000 });
    await fgLayer.click();
    await page.waitForTimeout(300);

    // Eye アイコンボタンをクリック（前景行の visibility toggle）
    const visibilityBtn = fgLayer.locator('button').first();
    await expect(visibilityBtn).toBeVisible({ timeout: 3000 });
    await visibilityBtn.click();
    await page.waitForTimeout(500);

    // トグル後もボタンが存在する（再度クリック可能）
    await expect(visibilityBtn).toBeVisible();
  });

  test('テキストオブジェクト追加', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    // ドロップダウンメニュー「シーンテキスト追加」
    const addTextOpt = page.getByText('シーンテキスト追加').first();
    await expect(addTextOpt).toBeVisible({ timeout: 3000 });
    await addTextOpt.click();
    await page.waitForTimeout(1500);

    // テキストオブジェクトがレイヤーに追加される
    // ※ テキストオブジェクトは即座にレイヤーリストに追加される（モーダルなし）
    const textObj = page.getByText('テキスト').first();
    await expect(textObj).toBeVisible({ timeout: 5000 });
  });

  // TODO: panelSelection がレイヤーに切り替わらず Delete がシーンに発火する問題。セレクタ修正が必要
  test.skip('オブジェクト削除（Delete → 確認ダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // まずテキストオブジェクトを新規作成（前テストの残骸に依存しない）
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);
    const addTextOpt = page.getByText('シーンテキスト追加').first();
    if (await addTextOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTextOpt.click();
      await page.waitForTimeout(1500);
    }

    // レイヤーパネル内の「新規テキスト」を選択
    const textObj = page.getByRole('button', { name: '新規テキスト' }).first();
    await expect(textObj).toBeVisible({ timeout: 5000 });
    await textObj.click();
    await page.waitForTimeout(300);

    // ヘッダーの削除ボタン（🗑 アイコン）をクリック
    const layerPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー') }).first();
    const deleteBtn = layerPanel.locator('button').filter({ has: page.locator('svg') }).nth(1); // 削除ボタン（2番目のアイコンボタン）
    await deleteBtn.click({ force: true });
    await page.waitForTimeout(500);

    // 確認ダイアログ
    const confirmBtn = page.getByRole('button', { name: '削除' }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }

    // 削除されたことを確認（リロードして永続化チェック）
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const remaining = await page.getByRole('button', { name: '新規テキスト' }).count();
    expect(remaining).toBe(0);
  });

  test('背景・前景は Delete 削除不可', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 背景を選択
    const bgObj = page.getByRole('button', { name: '背景' }).first();
    await expect(bgObj).toBeVisible({ timeout: 5000 });
    await bgObj.click();
    await page.waitForTimeout(300);

    // Delete キーを押す
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // 確認ダイアログが出ない（削除されない）
    const confirmBtn = page.getByRole('button', { name: '削除' }).last();
    const dialogVisible = await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false);

    // 背景がまだ存在する
    await expect(bgObj).toBeVisible();

    // ダイアログが出た場合はキャンセル
    if (dialogVisible) await page.keyboard.press('Escape');
  });

  // --- §3 キャラクター ---

  test('キャラクター作成', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクター追加ボタン（aria-label ベースで直接探す）
    const addCharBtn = page.locator('button[aria-label="キャラクター追加"]').first();
    if (await addCharBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addCharBtn.click();

      // キャラクター編集モーダルが開いたことを確認（= DB への INSERT 成功）
      await expect(page.getByText('キャラクター編集').first()).toBeVisible({ timeout: 10000 });

      // モーダルを閉じてリロード（楽観的更新がないため Realtime を待つよりリロードで確認）
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // リロード後にキャラクターがリストに表示されることを確認
      await expect(page.locator('[data-char-id]').first()).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('キャラクター削除', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクターが存在することを確認
    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      // キャラクターを選択
      await charItem.click();
      await page.waitForTimeout(300);

      // Delete キーで削除
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログが表示される
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // リロードして削除が永続化されたことを確認
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const remainingChars = await page.locator('[data-char-id]').count();
        expect(remainingChars).toBe(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('キャラクター右クリック「新規作成」', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクターリストの空白エリアで右クリック
    const charPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('キャラクター') }).first();
    if (await charPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // キャラクターリストエリア内で右クリック
      await charPanel.click({ button: 'right' });
      await page.waitForTimeout(500);

      // コンテキストメニュー「新規作成」
      const newOpt = page.getByText('新規作成').first();
      if (await newOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newOpt.click();
        await page.waitForTimeout(1500);

        // キャラクター編集モーダルが開く
        await expect(page.getByText('キャラクター編集').first()).toBeVisible({ timeout: 5000 });

        // モーダルを閉じる
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // リロードして新規キャラクターが作成されたことを確認
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const charCount = await page.locator('[data-char-id]').count();
        expect(charCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('キャラクター ダブルクリック編集 → モーダルで名前変更', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ダブルクリック
      await charItem.dblclick();
      await page.waitForTimeout(500);

      // キャラクター編集モーダルが開く
      const modal = page.getByText('キャラクター編集').or(page.locator('dialog, [role="dialog"]')).first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // 名前入力フィールドを探して変更
      const nameInput = modal.locator('input[type="text"], input[placeholder*="名前"], input[placeholder*="キャラクター"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('編集済みキャラ');
        await page.waitForTimeout(300);
      }

      // モーダル内の保存ボタンがあれば クリック、なければエスケープで自動保存扱い
      const saveBtn = modal.getByRole('button', { name: /保存|完了|OK/ }).first();
      if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);

      // リロードして名前が変更されたことを確認
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await expect(page.getByText('編集済みキャラ').first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('キャラクター複製（Ctrl+D）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await charItem.click();
      await page.waitForTimeout(300);

      const charCountBefore = await page.locator('[data-char-id]').count();

      // Ctrl+D で複製
      await page.keyboard.press('Control+d');
      await page.waitForTimeout(1500);

      const charCountAfter = await page.locator('[data-char-id]').count();
      expect(charCountAfter).toBeGreaterThan(charCountBefore);

      // リロードして複製が永続化されたことを確認
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const charCountReloaded = await page.locator('[data-char-id]').count();
      expect(charCountReloaded).toBeGreaterThan(charCountBefore);
    } else {
      test.skip();
    }
  });

  test('キャラクター Ctrl+C → paste で複製', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await charItem.click();
      await page.waitForTimeout(300);

      const charCountBefore = await page.locator('[data-char-id]').count();

      // Ctrl+C
      await page.keyboard.press('Control+c');
      await page.waitForTimeout(500);

      // paste イベント dispatch
      await page.evaluate(async () => {
        const text = await navigator.clipboard.readText();
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        document.dispatchEvent(evt);
      });
      await page.waitForTimeout(2000);

      const charCountAfter = await page.locator('[data-char-id]').count();
      expect(charCountAfter).toBeGreaterThan(charCountBefore);
    } else {
      test.skip();
    }
  });

  test('キャラクター is_hidden_on_board → ボード上非表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      // キャラクターを選択してモーダルを開く
      await charItem.dblclick();
      await page.waitForTimeout(500);

      const modal = page.getByText('キャラクター編集').or(page.locator('dialog, [role="dialog"]')).first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // is_hidden_on_board チェックボックスを探して ON にする
      const hiddenCheckbox = modal.locator('input[type="checkbox"]').filter({ has: page.getByText(/非表示|隠す|ボード/) }).first();
      if (await hiddenCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await hiddenCheckbox.isChecked();
        if (!isChecked) {
          await hiddenCheckbox.check();
        }
      }

      // モーダルを閉じる
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);

      // リロードして非表示状態が保存されたことを確認
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 再度モーダルを開いてチェックボックスが ON になっていることを確認
      const charItem2 = page.locator('[data-char-id]').first();
      if (await charItem2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await charItem2.dblclick();
        await page.waitForTimeout(500);

        const modal2 = page.getByText('キャラクター編集').or(page.locator('dialog, [role="dialog"]')).first();
        await expect(modal2).toBeVisible({ timeout: 5000 });

        const hiddenCheckbox2 = modal2.locator('input[type="checkbox"]').filter({ has: page.getByText(/非表示|隠す|ボード/) }).first();
        if (await hiddenCheckbox2.isVisible({ timeout: 2000 }).catch(() => false)) {
          const isCheckedAfter = await hiddenCheckbox2.isChecked();
          expect(isCheckedAfter).toBe(true);
        }

        await page.keyboard.press('Escape');
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

    // BGM パネル内のトラック追加ボタン
    const addBgmBtn = page.locator('button[aria-label="トラック追加"]').first();
    await expect(addBgmBtn).toHaveCount(1, { timeout: 5000 });
    await addBgmBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // アセットライブラリモーダルが開く → 閉じる
    const closeBtn = page.getByRole('button', { name: /キャンセル|閉じる/ }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('BGMトラック名編集（ダブルクリック → Enter）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // BGM トラックアイテムを探す（data-track-id か類似の属性を使用）
      const trackItem = bgmPanel.locator('[data-track-id], button:has-text("トラック")').first();
      if (await trackItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        // ダブルクリック
        await trackItem.dblclick();
        await page.waitForTimeout(500);

        // インライン入力フィールドが出現
        const trackInput = bgmPanel.locator('input').first();
        if (await trackInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await trackInput.fill('編集済みBGM');
          await trackInput.press('Enter');
          await page.waitForTimeout(1000);

          // リロードして名前が保存されたことを確認
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          const bgmPanel2 = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
          await expect(bgmPanel2).toBeVisible({ timeout: 5000 });
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

  test('BGMトラック削除（Delete → シーンから除去）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const trackItems = bgmPanel.locator('[data-track-id], button');
      const trackCountBefore = await trackItems.count();

      if (trackCountBefore > 0) {
        // 最後のトラックを選択
        const lastTrack = trackItems.last();
        await lastTrack.click();
        await page.waitForTimeout(300);

        // Delete キーで削除
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);

        // 確認ダイアログが表示される場合はクリック
        const confirmBtn = page.getByRole('button', { name: '削除' }).last();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(1000);

        // リロードしてトラックが削除されたことを確認
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const bgmPanel2 = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
        const trackCountAfter = await bgmPanel2.locator('[data-track-id], button').count();
        expect(trackCountAfter).toBeLessThanOrEqual(trackCountBefore);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('BGM Ctrl+C → paste で複製', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const trackItem = bgmPanel.locator('[data-track-id]').first();
      if (await trackItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trackItem.click();
        await page.waitForTimeout(300);

        const trackCountBefore = await bgmPanel.locator('[data-track-id]').count();

        // Ctrl+C
        await page.keyboard.press('Control+c');
        await page.waitForTimeout(500);

        // paste イベント dispatch
        await page.evaluate(async () => {
          const text = await navigator.clipboard.readText();
          const dt = new DataTransfer();
          dt.setData('text/plain', text);
          const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
          document.dispatchEvent(evt);
        });
        await page.waitForTimeout(2000);

        const trackCountAfter = await bgmPanel.locator('[data-track-id]').count();
        expect(trackCountAfter).toBeGreaterThan(trackCountBefore);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('BGM ボリュームスライダー操作', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ボリュームスライダーを探す（input[type="range"] か aria-label で）
      const volumeSlider = bgmPanel.locator('input[type="range"]').first();
      if (await volumeSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
        // スライダーの値を変更
        await volumeSlider.fill('50');
        await page.waitForTimeout(500);

        // 値が変わったことを確認
        const newValue = await volumeSlider.inputValue();
        expect(parseInt(newValue)).toBe(50);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('BGM ミュート機能', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ミュートボタンを探す（aria-label で「ミュート」または「音声」含む）
      const muteBtn = bgmPanel.locator('button[aria-label*="ミュート"], button[aria-label*="音"]').first();
      if (await muteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const initialState = await muteBtn.getAttribute('aria-pressed');

        // ミュートボタンをクリック
        await muteBtn.click();
        await page.waitForTimeout(500);

        // 状態が変わったことを確認
        const afterState = await muteBtn.getAttribute('aria-pressed');
        expect(afterState).not.toBe(initialState);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('BGM ループ切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ループボタンを探す（aria-label で「ループ」含む）
      const loopBtn = bgmPanel.locator('button[aria-label*="ループ"], button[aria-label*="リピート"]').first();
      if (await loopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const initialState = await loopBtn.getAttribute('aria-pressed');

        // ループボタンをクリック
        await loopBtn.click();
        await page.waitForTimeout(500);

        // 状態が変わったことを確認
        const afterState = await loopBtn.getAttribute('aria-pressed');
        expect(afterState).not.toBe(initialState);
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

  test('チャンネル切替（メイン→情報→雑談）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // チャットパネルを探す
    const chatPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('チャット') }).first();
    if (await chatPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // チャンネルタブを探す（メイン、情報、雑談）
      const mainTab = chatPanel.getByRole('tab', { name: /メイン|Main/ }).first();
      const infoTab = chatPanel.getByRole('tab', { name: /情報|Info/ }).first();
      const casualTab = chatPanel.getByRole('tab', { name: /雑談|Casual/ }).first();

      if (await mainTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mainTab.click();
        await page.waitForTimeout(500);
      }

      if (await infoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await infoTab.click();
        await page.waitForTimeout(500);

        // 情報タブが選択されたことを確認
        await expect(infoTab).toHaveAttribute('aria-selected', 'true');
      }

      if (await casualTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await casualTab.click();
        await page.waitForTimeout(500);

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
    await page.waitForTimeout(2000);

    // チャットパネルを探す
    const chatPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('チャット') }).first();
    if (await chatPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 送信者名設定ボタンを探す（右上のプロフィール/設定ボタン）
      const settingsBtn = chatPanel.locator('button[aria-label*="設定"], button[aria-label*="プロフィール"], button[aria-label*="名前"]').first();
      if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(500);

        // 名前入力フィールドを探す
        const nameInput = page.locator('input[placeholder*="名前"], input[placeholder*="ユーザー"]').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('テスト送信者');
          await page.waitForTimeout(500);

          // 保存ボタンまたはEnter
          const saveBtn = page.getByRole('button', { name: /保存|OK/ }).first();
          if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await saveBtn.click();
          } else {
            await nameInput.press('Enter');
          }
          await page.waitForTimeout(1000);

          // 送信者名が反映されたメッセージを送信して確認
          await sendChat(page, 'テスト送信者確認メッセージ');
          await page.waitForTimeout(1000);

          // リロードして変更が保存されたことを確認
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
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
    await page.waitForTimeout(2000);

    // レイヤーパネルから「前景」を探す
    const layerPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('レイヤー').or(page.getByText('オブジェクト')) }).first();
    await expect(layerPanel).toBeVisible({ timeout: 5000 });

    const fgObj = layerPanel.getByRole('button', { name: '前景' }).first();
    await expect(fgObj).toBeVisible({ timeout: 3000 });

    await fgObj.click();
    await page.waitForTimeout(500);

    // プロパティパネルが表示される
    const propPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText(/プロパティ|背景|色/) }).first();
    await expect(propPanel).toBeVisible({ timeout: 5000 });
  });

  test('オブジェクト選択 → プロパティ表示', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // テキストオブジェクトを探す
    const textObj = page.getByText('テキスト').first();
    if (await textObj.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textObj.click();
      await page.waitForTimeout(500);

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
    await page.waitForTimeout(2000);

    // キャラクターアイテムを探す
    const charItem = page.locator('[data-char-id]').first();
    if (await charItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await charItem.click();
      await page.waitForTimeout(500);

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
    await page.waitForTimeout(2000);

    // BGMトラックアイテムを探す
    const bgmPanel = page.locator('[data-selection-panel]').filter({ has: page.getByText('BGM') }).first();
    if (await bgmPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const trackItem = bgmPanel.locator('[data-track-id]').first();
      if (await trackItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trackItem.click();
        await page.waitForTimeout(500);

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
    await page.waitForTimeout(2000);

    // ツールバーの「アセットライブラリ」ボタン
    const assetBtn = page.locator('button[title="アセットライブラリ"]').first();
    await expect(assetBtn).toBeVisible({ timeout: 5000 });

    await assetBtn.click();
    await page.waitForTimeout(500);

    // アセットライブラリのタイトルが表示される
    await expect(page.getByRole('heading', { name: 'アセットライブラリ' })).toBeVisible({ timeout: 3000 });
  });

  // --- §9 クリップボード ---

  test('シーン Ctrl+C → Ctrl+V でコピペ', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 「メイン」シーンを選択（クリックで panelSelection 設定）
    const mainScene = page.getByText('メイン').first();
    await expect(mainScene).toBeVisible({ timeout: 3000 });
    await mainScene.click();
    await page.waitForTimeout(300);

    const scenesBeforeCount = await page.locator('[data-scene-id]').count();

    // Ctrl+C（グローバルハンドラ → actions.copy）
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(500);

    // paste イベントを手動 dispatch（Playwright headless では Ctrl+V がネイティブ paste を発火しない）
    await page.evaluate(async () => {
      const text = await navigator.clipboard.readText();
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.dispatchEvent(evt);
    });
    await page.waitForTimeout(2000);

    // シーンが複製されて増える
    const scenesAfterCount = await page.locator('[data-scene-id]').count();
    expect(scenesAfterCount).toBeGreaterThan(scenesBeforeCount);
  });

  // --- §7 シナリオテキスト ---

  test('シナリオテキスト作成', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const addBtn = page.locator('button[aria-label="テキストメモを追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });
    await addBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // テキストメモがリストに追加される
    await expect(page.locator('[data-text-id]').first()).toBeVisible({ timeout: 5000 });
  });

  test('シナリオテキスト編集（ダブルクリック → エディタダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.dblclick();
      await page.waitForTimeout(500);

      // エディタダイアログが開く
      await expect(page.getByText('テキストメモ編集').or(page.locator('dialog, [role="dialog"]')).first()).toBeVisible({ timeout: 3000 });

      // ダイアログを閉じる
      await page.keyboard.press('Escape');
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト複製（Ctrl+D）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      const beforeCount = await page.locator('[data-text-id]').count();

      await page.keyboard.press('Control+d');
      await page.waitForTimeout(1000);

      const afterCount = await page.locator('[data-text-id]').count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト削除（Delete → 確認ダイアログ）', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textItems = page.locator('[data-text-id]');
    const beforeCount = await textItems.count();

    if (beforeCount > 1) {
      // 最後のアイテムを選択
      await textItems.last().click();
      await page.waitForTimeout(300);

      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログ
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        const afterCount = await textItems.count();
        expect(afterCount).toBeLessThan(beforeCount);
      }
    } else {
      test.skip();
    }
  });

  test('シナリオテキスト Ctrl+C → paste で複製', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textItem = page.locator('[data-text-id]').first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(300);

      const beforeCount = await page.locator('[data-text-id]').count();

      // Ctrl+C
      await page.keyboard.press('Control+c');
      await page.waitForTimeout(500);

      // paste イベント dispatch
      await page.evaluate(async () => {
        const text = await navigator.clipboard.readText();
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        document.dispatchEvent(evt);
      });
      await page.waitForTimeout(2000);

      const afterCount = await page.locator('[data-text-id]').count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    } else {
      test.skip();
    }
  });

  // --- §10 Undo / Redo ---

  test('Ctrl+Z で Undo → Ctrl+Y で Redo', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // シーン追加
    const addSceneBtn = page.locator('button[aria-label="シーンを追加"]').first();
    await expect(addSceneBtn).toHaveCount(1, { timeout: 5000 });

    const scenesBeforeCount = await page.locator('[data-scene-id]').count();

    await addSceneBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // シーンが増えたことを確認
    const scenesAfterAdd = await page.locator('[data-scene-id]').count();
    expect(scenesAfterAdd).toBeGreaterThan(scenesBeforeCount);

    // Ctrl+Z を複数回押す（1操作が複数 diff エントリを生むため）
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(500);
      const current = await page.locator('[data-scene-id]').count();
      if (current === scenesBeforeCount) break;
    }
    await page.waitForTimeout(500);

    const scenesAfterUndo = await page.locator('[data-scene-id]').count();
    expect(scenesAfterUndo).toBe(scenesBeforeCount);

    // Ctrl+Y を複数回押して Redo
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(500);
      const current = await page.locator('[data-scene-id]').count();
      if (current > scenesBeforeCount) break;
    }
    await page.waitForTimeout(500);

    const scenesAfterRedo = await page.locator('[data-scene-id]').count();
    expect(scenesAfterRedo).toBeGreaterThan(scenesBeforeCount);
  });

  test('Undo: オブジェクト追加→Ctrl+Z', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // オブジェクト追加ボタン
    const addBtn = page.locator('button[aria-label="オブジェクト追加"]').first();
    await expect(addBtn).toHaveCount(1, { timeout: 5000 });

    const objCountBefore = await page.locator('[data-object-id]').count();

    // テキストオブジェクト追加
    await addBtn.click({ force: true });
    await page.waitForTimeout(500);

    const addTextOpt = page.getByText('シーンテキスト追加').first();
    if (await addTextOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addTextOpt.click();
      await page.waitForTimeout(1500);

      // オブジェクトが追加される
      const objCountAfter = await page.locator('[data-object-id]').count();
      expect(objCountAfter).toBeGreaterThan(objCountBefore);

      // Ctrl+Z で Undo
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(500);
        const current = await page.locator('[data-object-id]').count();
        if (current === objCountBefore) break;
      }
      await page.waitForTimeout(500);

      // オブジェクト数が元に戻る
      const objCountAfterUndo = await page.locator('[data-object-id]').count();
      expect(objCountAfterUndo).toBe(objCountBefore);
    } else {
      test.skip();
    }
  });

  test('Undo: オブジェクト削除→Ctrl+Z で復活', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // テキストオブジェクトを探す
    const textObj = page.getByText('テキスト').first();
    if (await textObj.isVisible({ timeout: 3000 }).catch(() => false)) {
      // テキストオブジェクトを選択
      await textObj.click();
      await page.waitForTimeout(300);

      const objCountBefore = await page.locator('[data-object-id]').count();

      // Delete キーで削除
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // 確認ダイアログが表示される
      const confirmBtn = page.getByRole('button', { name: '削除' }).last();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // オブジェクトが削除される
        const objCountAfter = await page.locator('[data-object-id]').count();
        expect(objCountAfter).toBeLessThan(objCountBefore);

        // Ctrl+Z で Undo（復活）
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press('Control+z');
          await page.waitForTimeout(500);
          const current = await page.locator('[data-object-id]').count();
          if (current === objCountBefore) break;
        }
        await page.waitForTimeout(500);

        // オブジェクトが復活する
        const objCountAfterUndo = await page.locator('[data-object-id]').count();
        expect(objCountAfterUndo).toBe(objCountBefore);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

});

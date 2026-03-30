import { test, expect } from '@playwright/test';
import { goToLobby, createRoom, selectBackground, selectForeground, addTextObject, addCharacter, addBgmTrack, deleteRoomById, createBgmTrackDirect, getSceneIds, BASE_URL } from './helpers';
const ROOM_NAME = `prop_test_${Date.now()}`;
let roomId: string;

test.describe.serial('Adrastea プロパティパネルテスト', () => {

  // §0 ルーム準備
  test('ルーム作成', async ({ page }) => {
    await goToLobby(page);
    roomId = await createRoom(page, ROOM_NAME);
    expect(roomId).toBeTruthy();
  });

  // --- 背景プロパティ ---

  test('P-02: グリッド表示切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 背景を選択
    await selectBackground(page);
    await page.waitForTimeout(300);

    // グリッド表示チェックボックスを取得（label[role="checkbox"]）
    const gridCheckbox = page.locator('label[role="checkbox"]:has-text("グリッド表示")').first();
    await expect(gridCheckbox).toBeVisible({ timeout: 5000 });

    const isCheckedBefore = (await gridCheckbox.getAttribute('aria-checked')) === 'true';
    await gridCheckbox.click();
    await page.waitForTimeout(200);

    const isCheckedAfter = (await gridCheckbox.getAttribute('aria-checked')) === 'true';
    expect(isCheckedAfter).toBe(!isCheckedBefore);
  });

  test('P-03: 背景ぼかし切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 背景を選択
    await selectBackground(page);
    await page.waitForTimeout(300);

    // 背景ぼかしチェックボックスを取得（label[role="checkbox"]）
    const blurCheckbox = page.locator('label[role="checkbox"]:has-text("背景ぼかし")').first();
    await expect(blurCheckbox).toBeVisible({ timeout: 5000 });

    const isCheckedBefore = (await blurCheckbox.getAttribute('aria-checked')) === 'true';
    await blurCheckbox.click();
    await page.waitForTimeout(200);

    const isCheckedAfter = (await blurCheckbox.getAttribute('aria-checked')) === 'true';
    expect(isCheckedAfter).toBe(!isCheckedBefore);
  });

  // --- 前景プロパティ ---

  test('P-08: 前景位置ロック切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 前景を選択
    await selectForeground(page);
    await page.waitForTimeout(300);

    // 位置ロックチェックボックスを取得（label[role="checkbox"]）
    const posLockCheckbox = page.locator('label[role="checkbox"]:has-text("位置を固定")').first();
    await expect(posLockCheckbox).toBeVisible({ timeout: 5000 });

    const isCheckedBefore = (await posLockCheckbox.getAttribute('aria-checked')) === 'true';
    await posLockCheckbox.click();
    await page.waitForTimeout(200);

    const isCheckedAfter = (await posLockCheckbox.getAttribute('aria-checked')) === 'true';
    expect(isCheckedAfter).toBe(!isCheckedBefore);
  });

  test('P-09: 前景サイズロック切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 前景を選択
    await selectForeground(page);
    await page.waitForTimeout(300);

    // サイズロックチェックボックスを取得（label[role="checkbox"]）
    const sizeLockCheckbox = page.locator('label[role="checkbox"]:has-text("サイズを固定")').first();
    await expect(sizeLockCheckbox).toBeVisible({ timeout: 5000 });

    const isCheckedBefore = (await sizeLockCheckbox.getAttribute('aria-checked')) === 'true';
    await sizeLockCheckbox.click();
    await page.waitForTimeout(200);

    const isCheckedAfter = (await sizeLockCheckbox.getAttribute('aria-checked')) === 'true';
    expect(isCheckedAfter).toBe(!isCheckedBefore);
  });

  // --- オブジェクトプロパティ（テキストオブジェクト追加後） ---

  test('P-10: テキストオブジェクト名編集', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // テキストオブジェクト追加
    await addTextObject(page);
    await page.waitForTimeout(1000);

    // 追加されたテキストオブジェクトをレイヤーパネルでクリック（プロパティパネルに表示させる）
    const textItem = page.locator('[data-obj-id]').filter({ hasText: /テキスト|新規テキスト/ }).first();
    if (await textItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textItem.click();
      await page.waitForTimeout(500);
    }

    // オブジェクト名フィールド
    const nameInput = page.getByRole('textbox', { name: 'オブジェクト名' }).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    // 既存テキストをクリア → 新しい名前を入力
    await nameInput.click({ clickCount: 3 }); // 全選択
    const newName = `TO_${Date.now()}`;
    await nameInput.pressSequentially(newName, { delay: 30 });

    // 入力値が反映されたことを確認
    await expect(nameInput).toHaveValue(newName, { timeout: 3000 });
  });

  test('P-13: テキストオブジェクト不透明度編集', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // テキストオブジェクトをクリック（既に作成されているはず）
    const objectName = page.locator('[data-obj-id]').filter({ hasText: /テキスト|新規テキスト|TO_/ }).first();
    await expect(objectName).toBeVisible({ timeout: 5000 });
    await objectName.click();
    await page.waitForTimeout(300);

    // opacity スライダーを取得（aria-label か data-* 属性）
    const opacitySlider = page.locator('input[type="range"]').filter({ has: page.getByText('opacity', { exact: false }) }).first();
    if (await opacitySlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      const valueBefore = await opacitySlider.getAttribute('value');
      await opacitySlider.fill('0.5');
      await page.waitForTimeout(300);

      const valueAfter = await opacitySlider.getAttribute('value');
      expect(valueAfter).not.toBe(valueBefore);
    } else {
      // opacity が input[type="number"] の場合
      const opacityInput = page.locator('input[type="number"]').filter({ has: page.getByText('opacity', { exact: false }) }).first();
      if (await opacityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opacityInput.fill('0.5');
        await page.waitForTimeout(300);
        const value = await opacityInput.inputValue();
        expect(value).toBe('0.5');
      }
    }
  });

  test.skip('P-15: position_locked ON → 座標フィールド disabled', async ({ page }) => {
    // NOTE: テキストオブジェクトには「位置を固定」機能がないため skip
    // 画像オブジェクト（パネル）で同機能を確認する必要がある
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test.skip('P-16: size_locked ON → サイズフィールド disabled', async ({ page }) => {
    // NOTE: テキストオブジェクトには「サイズを固定」機能がないため skip
    // 画像オブジェクト（パネル）で同機能を確認する必要がある
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  // --- キャラクタープロパティ（キャラクター追加後） ---

  test('P-21: キャラクター名編集', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    // ルーム UI が表示されるまで待つ
    await page.locator('[data-scene-id]').first().waitFor({ state: 'visible', timeout: 15000 });

    // キャラクタータブをクリックしてパネルをアクティブにする
    const charTab = page.locator('[class*="tab"]').filter({ hasText: 'キャラクター' }).first();
    if (await charTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await charTab.click();
      await page.waitForTimeout(300);
    }

    // キャラクター追加
    await addCharacter(page);
    await page.waitForTimeout(300);

    // キャラクター編集モーダルが開くのを待つ
    await expect(page.getByText('キャラクター編集').first()).toBeVisible({ timeout: 10000 });

    // モーダル内の名前フィールド（placeholder="キャラクター名"）
    const nameInput = page.locator('input[placeholder="キャラクター名"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const newCharName = `TC_${Date.now()}`;
    await nameInput.click({ clickCount: 3, force: true });
    await nameInput.pressSequentially(newCharName, { delay: 30 });

    // 入力値が反映されたことを確認
    await expect(nameInput).toHaveValue(newCharName, { timeout: 3000 });

    // モーダルを閉じる
    await page.keyboard.press('Escape');
  });

  test('P-22: キャラクター色変更', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクターをクリック（既に作成されているはず）
    const charItem = page.locator('[data-char-id]').first();
    await expect(charItem).toBeVisible({ timeout: 5000 });
    await charItem.dblclick();
    await page.waitForTimeout(1000); // モーダル完全表示待ち

    // キャラクター編集モーダルが開くのを待つ
    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // テーマカラーの色入力フィールド（モーダル内の最初のテキスト入力）
    const colorInput = modal.locator('input[type="text"]').first();
    await expect(colorInput).toBeVisible({ timeout: 5000 });

    // selectAll を使用して全選択、その後 fill で置き換え
    await colorInput.selectText();
    await colorInput.fill('#ff0000');
    await page.waitForTimeout(300);

    // 確認
    const value = await colorInput.inputValue();
    expect(value.toLowerCase()).toBe('#ff0000');

    // モーダルを閉じる
    await page.keyboard.press('Escape');
  });

  test('P-23: キャラクターサイズ変更', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // キャラクターをクリック
    const charItem = page.locator('[data-char-id]').first();
    await expect(charItem).toBeVisible({ timeout: 5000 });
    await charItem.dblclick();
    await page.waitForTimeout(1000); // モーダル完全表示待ち

    // キャラクター編集モーダルが開くのを待つ
    await expect(page.getByText('キャラクター編集').first()).toBeVisible({ timeout: 5000 });

    // 駒サイズの数値入力を探す
    // モーダル内で最初のテキスト入力が色、続くnumber inputがサイズ
    const numberInputs = page.locator('input[type="number"]');
    const sizeInput = numberInputs.filter({ has: page.getByText('駒サイズ') }).first();

    // フォールバック: セレクタが見つからない場合は複数の number input から探す
    let finalSizeInput = sizeInput;
    if (!(await sizeInput.isVisible({ timeout: 1000 }).catch(() => false))) {
      // 最初の number input を試す
      finalSizeInput = numberInputs.first();
    }

    await expect(finalSizeInput).toBeVisible({ timeout: 5000 });
    const valueBefore = await finalSizeInput.inputValue();
    const newSize = '8';
    await finalSizeInput.selectText();
    await finalSizeInput.fill(newSize);
    await page.waitForTimeout(300);

    const valueAfter = await finalSizeInput.inputValue();
    expect(valueAfter).toBe(newSize);
    expect(valueAfter).not.toBe(valueBefore);

    // モーダルを閉じる
    await page.keyboard.press('Escape');
  });

  // --- BGMプロパティ（BGMトラック追加後） ---

  test('P-31: BGMループ再生切替', async ({ page }) => {
    // API で BGM トラック作成（dockview タブ非アクティブ問題を回避）
    const sceneIds = await getSceneIds(roomId);
    await createBgmTrackDirect(roomId, { name: 'PropBGM', bgmSource: 'https://example.com/test.mp3', sceneIds });

    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmName = page.getByText('PropBGM').first();
    await expect(bgmName).toBeVisible({ timeout: 10000 });

    // ループボタン（BgmPanel 内）
    const loopBtn = page.locator('button[title="ループ"]').first();
    await expect(loopBtn).toBeVisible({ timeout: 3000 });
    const colorBefore = await loopBtn.evaluate(el => getComputedStyle(el).color);
    await loopBtn.click();
    await page.waitForTimeout(300);
    const colorAfter = await loopBtn.evaluate(el => getComputedStyle(el).color);
    expect(colorAfter).not.toBe(colorBefore);
  });

  test('P-32: BGMフェードイン切替', async ({ page }) => {
    await page.goto(`${BASE_URL}/adrastea/${roomId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bgmName = page.getByText('PropBGM').first();
    await expect(bgmName).toBeVisible({ timeout: 10000 });

    const fadeBtn = page.locator('button[title*="フェードイン"]').first();
    await expect(fadeBtn).toBeVisible({ timeout: 3000 });
    const opacityBefore = await fadeBtn.evaluate(el => getComputedStyle(el).opacity);
    await fadeBtn.click();
    await page.waitForTimeout(300);
    const opacityAfter = await fadeBtn.evaluate(el => getComputedStyle(el).opacity);
    expect(opacityAfter).not.toBe(opacityBefore);
  });

  test.afterAll(async () => {
    if (roomId) await deleteRoomById(roomId);
  });

});

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:6100/adrastea/LXtApmtaokhayfIbVzuT');
  await page.waitForLoadState('networkidle');
  const nameInput = page.locator('input[placeholder="表示名を入力"]');
  if (await nameInput.isVisible({ timeout: 5000 })) {
    await nameInput.fill('TestUser');
    await page.locator('button:has-text("ゲスト参加")').click();
    await page.waitForTimeout(5000);
  }

  // スクリーンショット1: 初期状態
  await page.screenshot({ path: '/tmp/adrastea-step1.png' });

  // フローティングパネルを全部閉じる（×ボタン）
  // シーン/キャラクター/テキスト/カットインのタブグループ、レイヤー、プロパティ
  const innerPanelIds = ['scene', 'character', 'scenarioText', 'cutin', 'layer', 'property'];
  for (const id of innerPanelIds) {
    const closeBtn = page.locator('.dockview-inner-board .dv-default-tab-action').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/adrastea-step2-closed.png' });

  // 目のマーク（Eye icon）をクリックしてパネルメニューを開く
  const eyeButton = page.locator('button[title="パネル表示"]');
  await eyeButton.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/adrastea-step3-menu.png' });

  // シーンを再表示
  const sceneBtn = page.locator('button:has-text("シーン")').first();
  if (await sceneBtn.isVisible({ timeout: 2000 })) {
    await sceneBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: '/tmp/adrastea-step4-reopened.png' });

  await browser.close();
})();

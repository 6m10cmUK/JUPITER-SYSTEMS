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
  // フローティングパネルのクラスと背景色を調査
  const info = await page.evaluate(() => {
    const groups = document.querySelectorAll('.dv-groupview');
    return Array.from(groups).map(g => {
      const bg = getComputedStyle(g).backgroundColor;
      const isFloating = g.classList.contains('dv-groupview-floating');
      const tabs = g.querySelector('.dv-tabs-and-actions-container');
      const tabsBg = tabs ? getComputedStyle(tabs).backgroundColor : 'N/A';
      const tabTexts = Array.from(g.querySelectorAll('.dv-tab')).map(t => t.textContent?.trim());
      return {
        floating: isFloating,
        bg,
        tabsBg,
        tabs: tabTexts,
        classes: g.className,
      };
    });
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();

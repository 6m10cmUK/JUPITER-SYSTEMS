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
  const info = await page.evaluate(() => {
    const results = [];
    let el = document.querySelector('.dv-groupview-floating');
    while (el) {
      const s = getComputedStyle(el);
      if (s.zIndex !== 'auto' || s.position !== 'static') {
        results.push({
          tag: el.tagName,
          cls: el.className.substring(0, 80),
          zIndex: s.zIndex,
          position: s.position,
        });
      }
      el = el.parentElement;
    }
    return results;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();

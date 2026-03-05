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
  await page.screenshot({ path: '/tmp/adrastea-room3.png' });

  // Check background colors of non-floating elements
  const info = await page.evaluate(() => {
    const results = [];
    const el = document.querySelector('.dockview-inner-board');
    if (!el) return ['NOT FOUND'];

    // Check all elements up to the board for backgrounds
    function checkBg(selector) {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach(n => {
        const bg = getComputedStyle(n).backgroundColor;
        const pe = getComputedStyle(n).pointerEvents;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          results.push(selector + ' -> bg=' + bg + ' pe=' + pe + ' class=' + n.className);
        }
      });
    }

    checkBg('.dockview-inner-board');
    checkBg('.dockview-inner-board .dv-dockview');
    checkBg('.dockview-inner-board .dv-branch-node');
    checkBg('.dockview-inner-board .dv-split-view-container');
    checkBg('.dockview-inner-board .dv-view-container');
    checkBg('.dockview-inner-board .dv-view');
    checkBg('.dockview-inner-board .dv-groupview');
    checkBg('.dockview-inner-board .dv-content-container');
    checkBg('.dockview-inner-board .dv-tabs-and-actions-container');
    checkBg('.dockview-inner-board .dv-sash-container');

    return results;
  });
  console.log('Non-transparent backgrounds:');
  info.forEach(i => console.log('  ', i));

  await browser.close();
})();

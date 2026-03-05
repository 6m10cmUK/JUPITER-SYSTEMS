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
  const html = await page.evaluate(() => {
    const el = document.querySelector('.dockview-inner-board');
    if (!el) return 'NOT FOUND';
    function dump(node, depth) {
      if (depth > 5 || !node || !node.tagName) return '';
      const tag = node.tagName.toLowerCase();
      const cls = node.className || '';
      const pe = getComputedStyle(node).pointerEvents;
      const inl = node.style.pointerEvents || '';
      let result = '  '.repeat(depth) + '<' + tag;
      if (cls) result += ' class="' + cls + '"';
      result += ' pe="' + pe + '"';
      if (inl) result += ' pe-inline="' + inl + '"';
      result += '>\n';
      for (const child of node.children) {
        result += dump(child, depth + 1);
      }
      return result;
    }
    const parent = el.parentElement;
    const parentPE = getComputedStyle(parent).pointerEvents;
    const parentInline = parent.style.pointerEvents || '';
    return 'PARENT: pe=' + parentPE + ' pe-inline=' + parentInline + '\n' + dump(el, 0);
  });
  console.log(html);
  await browser.close();
})();

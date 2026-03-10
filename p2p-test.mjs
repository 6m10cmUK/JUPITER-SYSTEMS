import { chromium } from 'playwright';

const ROOM_URL = 'http://localhost:6100/adrastea/4e6fa1ba-aa44-453b-a423-a2a33e1a62d0';
const AUTH_STATE = '/tmp/adrastea-auth.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitForLog = async (logs, kw, ms=15000) => {
  const t = Date.now();
  while (Date.now()-t < ms) { if (logs.some(l=>l.includes(kw))) return true; await sleep(300); }
  return false;
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx1 = await browser.newContext({ storageState: AUTH_STATE });
  const ctx2 = await browser.newContext({ storageState: AUTH_STATE });
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();
  const logs1=[], logs2=[];
  page1.on('console', m => { const t=m.type(),s=m.text(); logs1.push(s); if(t==='error'||s.includes('PeerManager')||s.includes('Permission')||s.includes('patch')) console.log(`[T1][${t}] ${s}`); });
  page2.on('console', m => { const t=m.type(),s=m.text(); logs2.push(s); if(t==='error'||s.includes('PeerManager')||s.includes('Permission')||s.includes('patch')) console.log(`[T2][${t}] ${s}`); });

  console.log('=== ルームを開く ===');
  await page1.goto(ROOM_URL);
  await sleep(2000);
  await page2.goto(ROOM_URL);

  console.log('=== P2P接続待ち（最大15秒）===');
  const ok = await waitForLog(logs1, 'DataChannel "reliable" opened', 15000);
  console.log(`P2P T1: ${ok?'connected':'timeout'}`);
  await sleep(2000); // full_sync 受信待ち

  await page1.screenshot({ path: '/tmp/tab1-before.png' });
  await page2.screenshot({ path: '/tmp/tab2-before.png' });

  // シーン一覧をDOMから取得
  const getSceneNames = page => page.evaluate(() =>
    [...document.querySelectorAll('[title]')]
      .filter(el => el.closest('[class*="scene"]') || el.closest('[class*="Scene"]'))
      .map(el => el.getAttribute('title') || el.innerText).slice(0, 20)
  );

  console.log('\n=== シーン追加前 ===');
  const s1b = await getSceneNames(page1);
  const s2b = await getSceneNames(page2);
  console.log('Tab1 scenes:', s1b.length);
  console.log('Tab2 scenes:', s2b.length);

  // シーン追加
  console.log('\n=== Tab1でシーン追加 ===');
  const addBtn = page1.locator('button[title="シーンを追加"]').first();
  await addBtn.click();
  console.log('クリック完了');
  await sleep(3000);

  console.log('\n=== シーン追加後 ===');
  const s1a = await getSceneNames(page1);
  const s2a = await getSceneNames(page2);
  console.log('Tab1 scenes:', s1a.length, `(${s1b.length}→${s1a.length})`);
  console.log('Tab2 scenes:', s2a.length, `(${s2b.length}→${s2a.length})`);
  console.log(`Tab2同期: ${s2a.length > s2b.length ? 'YES ✓' : 'NO ✗'}`);

  const denied = [...logs1,...logs2].filter(l=>l.includes('Permission')&&l.includes('denied'));
  if (denied.length) { console.log('\n[Permission denied]'); denied.forEach(l=>console.log(l)); }

  await page1.screenshot({ path: '/tmp/tab1-after.png' });
  await page2.screenshot({ path: '/tmp/tab2-after.png' });
  console.log('\n完了: /tmp/tab1-after.png /tmp/tab2-after.png');
  await browser.close();
})();

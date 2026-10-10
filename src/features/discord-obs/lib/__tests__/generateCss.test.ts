import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCSS } from '../generateCss.ts';
import { DEFAULT_ANIMATION_SETTINGS, DEFAULT_GENERAL_SETTINGS } from '../discordObs.types.ts';

const ID = '1234';

test('立ち絵の URL を変数に入れ、本人のアバター画像を差し替える', () => {
  const css = generateCSS(ID, '/a.webp', 'テスト', DEFAULT_ANIMATION_SETTINGS, DEFAULT_GENERAL_SETTINGS);
  assert.ok(css.includes(`--img-stand-url-${ID}: url("/a.webp");`));
  assert.ok(css.includes(`img[src*="avatars/${ID}"] {\n  content: var(--img-stand-url-${ID});`));
  assert.ok(css.includes('max-width: 800px;'));
});

test('跳ねる設定が無効ならアニメーションを出さない', () => {
  const on = generateCSS(ID, '', '', DEFAULT_ANIMATION_SETTINGS, DEFAULT_GENERAL_SETTINGS);
  const off = generateCSS(
    ID, '', '',
    { ...DEFAULT_ANIMATION_SETTINGS, bounce: { enabled: false, distance: 15 } },
    DEFAULT_GENERAL_SETTINGS,
  );
  assert.ok(on.includes('@keyframes speak-bounce'));
  assert.ok(!off.includes('speak-bounce'));
});

test('話していないときは「隠す」が「暗くする」より優先される', () => {
  const css = generateCSS(ID, '', '', DEFAULT_ANIMATION_SETTINGS, {
    ...DEFAULT_GENERAL_SETTINGS,
    hideWhenNotSpeaking: true,
    dimWhenNotSpeaking: true,
  });
  assert.ok(css.includes(':not([class*="Voice_avatarSpeaking__"]) {\n  display: none !important;'));
  assert.ok(!css.includes('brightness(70%)'));
});

test('縁取りは太さを 10 で割った px の影 8 方向で描く', () => {
  const css = generateCSS(
    ID, '', '',
    { ...DEFAULT_ANIMATION_SETTINGS, border: { enabled: true, thickness: 30 } },
    DEFAULT_GENERAL_SETTINGS,
  );
  assert.equal(css.match(/drop-shadow\([^)]*3px[^)]*white\)/g)?.length, 8);
});

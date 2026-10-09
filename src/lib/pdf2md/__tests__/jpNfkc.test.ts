import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jpNfkc, RADICAL_TO_KANJI } from '../jpNfkc.ts';

test('康熙部首を日本の字形に直す', () => {
  assert.equal(jpNfkc('瀬⼾⿊い'), '瀬戸黒い');
});

test('CJK 部首補助を漢字に直す', () => {
  assert.equal(jpNfkc('⻑'), '長');
});

test('全角英数は NFKC で半角にする', () => {
  assert.equal(jpNfkc('ＡＢＣ'), 'ABC');
});

test('表にない部首は NFKC どおり', () => {
  assert.equal(jpNfkc('⼁'), '丨');
});

test('表の全キーが値の NFKC に変わる', () => {
  for (const [k, v] of Object.entries(RADICAL_TO_KANJI)) {
    assert.equal(jpNfkc(k), v.normalize('NFKC'), k);
  }
});

test('表のキーは部首補助か康熙部首の範囲にある', () => {
  for (const k of Object.keys(RADICAL_TO_KANJI)) {
    const cp = k.codePointAt(0)!;
    const ok = (cp >= 0x2e80 && cp <= 0x2eff) || (cp >= 0x2f00 && cp <= 0x2fd5);
    assert.ok(ok, `${k} U+${cp.toString(16)}`);
  }
});

test('jpNfkc は二度かけても変わらない', () => {
  const src = Object.keys(RADICAL_TO_KANJI).join('') + '瀬⼾⿊い　ＡＢＣ①';
  const once = jpNfkc(src);
  assert.equal(jpNfkc(once), once);
});

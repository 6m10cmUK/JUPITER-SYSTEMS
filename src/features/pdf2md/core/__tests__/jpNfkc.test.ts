import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jpNfkc, RADICAL_TO_KANJI, JP_OVERRIDES } from '../jpNfkc.ts';
import { UNICODE_RADICAL_MAP } from '../radicalMap.generated.ts';

test('康熙部首を日本の字形に直す', () => {
  assert.equal(jpNfkc('瀬⼾⿊い'), '瀬戸黒い');
});

test('CJK 部首補助を漢字に直す', () => {
  assert.equal(jpNfkc('⻑'), '長');
});

test('部首補助の個別の対応', () => {
  assert.equal(jpNfkc('⺖'), '忄');
  assert.equal(jpNfkc('⻍'), '辶');
  assert.equal(jpNfkc('⺨'), '犭');
  assert.equal(jpNfkc('⻃'), '覀');
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

test('表のキーは 1 コードポイントで、値は NFKC で変わらない', () => {
  for (const [k, v] of Object.entries(RADICAL_TO_KANJI)) {
    assert.equal([...k].length, 1, `key ${k}`);
    assert.equal(v.normalize('NFKC'), v, `value ${v} of ${k}`);
  }
});

test('部首補助・康熙部首のうち生成表にある字は jpNfkc の結果に残らない', () => {
  const inRange = (cp: number) => cp >= 0x2e80 && cp <= 0x2fdf;
  const ranges: Array<[number, number]> = [[0x2e80, 0x2ef3], [0x2f00, 0x2fd5]];
  for (const [lo, hi] of ranges) {
    for (let cp = lo; cp <= hi; cp++) {
      const c = String.fromCodePoint(cp);
      if (!(c in UNICODE_RADICAL_MAP)) continue;
      for (const ch of jpNfkc(c)) {
        assert.ok(!inRange(ch.codePointAt(0)!), `U+${cp.toString(16)}`);
      }
    }
  }
});

test('JP_OVERRIDES の 6 件', () => {
  assert.equal(Object.keys(JP_OVERRIDES).length, 6);
  assert.equal(jpNfkc('⼾'), '戸');
  assert.equal(jpNfkc('⿊'), '黒');
  assert.equal(jpNfkc('⾭'), '青');
  assert.equal(jpNfkc('⿈'), '黄');
  assert.equal(jpNfkc('⺫'), '罒');
  assert.equal(jpNfkc('⻏'), '阝');
});

test('Unicode 公式の対応（上書き以外）', () => {
  assert.equal(jpNfkc('⻔'), '门');
  assert.equal(jpNfkc('⻢'), '马');
  assert.equal(jpNfkc('⺮'), '𥫗');
});

test('生成表は 300 件以上', () => {
  assert.ok(Object.keys(UNICODE_RADICAL_MAP).length >= 300);
});

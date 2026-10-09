import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchNext } from '../greedyMatch.ts';

const seq = Array.from('あいうえお').map((c) => ({ c }));

test('先読み範囲内で最初に一致した位置と次の位置を返す', () => {
  assert.deepEqual(matchNext(seq, 0, 'う', 32), { index: 2, next: 3 });
  assert.deepEqual(matchNext(seq, 3, 'お', 32), { index: 4, next: 5 });
});

test('先読み範囲の外・見つからない文字は null', () => {
  assert.equal(matchNext(seq, 0, 'お', 3), null);
  assert.equal(matchNext(seq, 0, 'ん', 32), null);
  assert.equal(matchNext(seq, 5, 'あ', 32), null);
});

test('NFKC で複数文字になる文字は先頭 1 文字で探し、残りぶん進める', () => {
  const s = Array.from('xfiy').map((c) => ({ c }));
  assert.deepEqual(matchNext(s, 0, 'ﬁ', 32), { index: 1, next: 3 });
});

test('全角英数は NFKC で半角として探す', () => {
  const s = Array.from('abc').map((c) => ({ c }));
  assert.deepEqual(matchNext(s, 0, 'Ｂ'.toLowerCase(), 32), { index: 1, next: 2 });
});

test('末尾を超えて進めない', () => {
  const s = Array.from('xf').map((c) => ({ c }));
  assert.deepEqual(matchNext(s, 0, 'ﬁ', 32), { index: 1, next: 2 });
});

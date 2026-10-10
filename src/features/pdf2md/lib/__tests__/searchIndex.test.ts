import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWithMap } from '../searchIndex.ts';

test('全角英字と丸数字を NFKC＋小文字化し、各文字の元位置を返す', () => {
  assert.deepEqual(normalizeWithMap('Ａ①'), { norm: 'a1', start: [0, 1], end: [1, 2] });
});

test('1 文字が複数文字に展開されたら、展開後の全文字が元の 1 文字を指す', () => {
  assert.deepEqual(normalizeWithMap('x㍻'), { norm: 'x平成', start: [0, 1, 1], end: [1, 2, 2] });
});

test('サロゲートペアは元の 2 単位をまとめて指す', () => {
  assert.deepEqual(normalizeWithMap('𠮷a'), { norm: '𠮷a', start: [0, 0, 2], end: [2, 2, 3] });
});

test('空文字は空の結果', () => {
  assert.deepEqual(normalizeWithMap(''), { norm: '', start: [], end: [] });
});

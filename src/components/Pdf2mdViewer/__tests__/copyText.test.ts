import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinBlocks } from '../copyText.ts';

test('空文字のブロックは除外して空行で連結する', () => {
  assert.equal(joinBlocks(['一つ目', '', '二つ目', '']), '一つ目\n\n二つ目');
});

test('1ブロックだけなら区切りを入れない', () => {
  assert.equal(joinBlocks(['だけ']), 'だけ');
  assert.equal(joinBlocks([]), '');
});

test('順序を保つ', () => {
  assert.equal(joinBlocks(['c', 'a', 'b']), 'c\n\na\n\nb');
});

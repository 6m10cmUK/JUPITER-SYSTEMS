import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileIdOf } from '../fileId.ts';

const bytes = (xs: number[]): ArrayBuffer => new Uint8Array(xs).buffer;

test('同じ入力なら同じ ID になる', () => {
  assert.equal(fileIdOf(bytes([1, 2, 3, 4])), fileIdOf(bytes([1, 2, 3, 4])));
});

test('1 バイト違えば別の ID になる', () => {
  assert.notEqual(fileIdOf(bytes([1, 2, 3, 4])), fileIdOf(bytes([1, 2, 3, 5])));
});

test('ID は 28 桁の 16 進数', () => {
  assert.match(fileIdOf(bytes([0])), /^[0-9a-f]{28}$/);
});

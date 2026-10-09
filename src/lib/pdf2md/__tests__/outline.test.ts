import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOutline } from '../outline.ts';
import { normalizeKey } from '../outlineKeys.ts';
import type { WorkBlock } from '../types.ts';

const para = (text: string, page: number, kind: WorkBlock['kind'] = 'paragraph'): WorkBlock => ({
  kind,
  text,
  page,
  fontSize: 10,
  bold: false,
  lineCount: 1,
});
const summary = (bs: WorkBlock[]) => bs.map((b) => `${b.kind === 'heading' ? `h${b.level}` : 'p'}:${b.page}:${b.text}`);

test('しおりと完全一致するブロックは見出しになり、既存の見出しは段落に戻る', () => {
  const blocks = [para('旧見出し', 1, 'heading'), para('はじめに', 1), para('本文です。', 1)];
  const out = applyOutline(blocks, [{ title: 'はじめに', level: 2, page: 1 }]);
  assert.deepEqual(summary(out), ['p:1:旧見出し', 'h2:1:はじめに', 'p:1:本文です。']);
});

test('ブロックの先頭がしおりと一致するときは見出しと本文に分ける', () => {
  const out = applyOutline([para('概要これは本文の続き', 1)], [{ title: '概要', level: 1, page: 1 }]);
  assert.deepEqual(summary(out), ['h1:1:概要', 'p:1:これは本文の続き']);
});

test('どのブロックにも当たらないしおりは、そのページの位置に見出しとして挿入する', () => {
  const blocks = [para('一ページ目の本文', 1), para('三ページ目の本文', 3)];
  const out = applyOutline(blocks, [{ title: '付録', level: 1, page: 2 }]);
  assert.deepEqual(summary(out), ['p:1:一ページ目の本文', 'h1:2:付録', 'p:3:三ページ目の本文']);
});

test('しおりのページの隣のページに一致するブロックがあれば、それを見出しにする', () => {
  const blocks = [para('まとめ', 1), para('本文です。', 2)];
  const out = applyOutline(blocks, [{ title: 'まとめ', level: 1, page: 2 }]);
  assert.deepEqual(summary(out), ['h1:1:まとめ', 'p:2:本文です。']);
});

test('normalizeKey は康熙部首と通常字を同一視する', () => {
  assert.equal(normalizeKey('⼾棚'), normalizeKey('戸棚'));
});

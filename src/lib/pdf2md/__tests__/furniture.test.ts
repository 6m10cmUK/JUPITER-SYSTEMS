import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeFurniture } from '../furniture.ts';
import type { Line, PageData } from '../types.ts';

const PAGES = 6;
const page = (n: number): PageData => ({ page: n, width: 600, height: 800, yMin: 0, runs: [] });
const line = (p: number, text: string, y: number): Line => ({
  page: p,
  text,
  x0: 100,
  x1: 500,
  y,
  fontSize: 10,
  bold: false,
  chars: text.length,
});

test('全ページの上端の柱と下端のノンブルを除き、本文は残す', () => {
  const pages = Array.from({ length: PAGES }, (_, i) => page(i + 1));
  const perPage = pages.map((pg) => [
    line(pg.page, '第一章 はじまりの町', 770),
    ...Array.from({ length: 12 }, (_, i) => line(pg.page, `本文のあるページ${'あいうえおかきくけこ'[i % 10]}${pg.page}行${i}`, 700 - i * 14)),
    line(pg.page, String(pg.page), 20),
  ]);
  const { lines, removedCount } = removeFurniture(pages, perPage);
  assert.equal(removedCount, PAGES * 2);
  for (const ls of lines) {
    assert.equal(ls.length, 12);
    assert.ok(ls.every((l) => l.text.startsWith('本文のあるページ')));
  }
});

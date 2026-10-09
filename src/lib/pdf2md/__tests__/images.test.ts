import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertImages } from '../images.ts';
import type { ExtractedImage } from '../extract.ts';
import type { PageData, WorkBlock } from '../types.ts';

const blk = (text: string, page: number, top: number): WorkBlock => ({
  kind: 'paragraph',
  text,
  page,
  fontSize: 10,
  bold: false,
  lineCount: 1,
  top,
  src: { text, styles: [] },
});
const img = (page: number, y0: number, y1: number): ExtractedImage => ({
  page,
  x0: 0,
  x1: 100,
  y0,
  y1,
  pageWidth: 200,
  blob: new Blob(['x']),
});
const pages: PageData[] = [1, 2, 3].map((p) => ({ page: p, width: 200, height: 300, yMin: 0, runs: [] }));
const describe = (bs: { kind: string; text: string; imageId?: string }[]) =>
  bs.map((b) => (b.kind === 'image' ? `[${b.imageId}]` : b.text));

test('画像は上端以上にあるブロックの直後に入り、top・src は外れる', () => {
  const blocks = [blk('A', 1, 280), blk('B', 1, 100), blk('C', 1, 50)];
  const { blocks: out, images } = insertImages(blocks, [img(1, 150, 200)], pages);
  assert.deepEqual(describe(out), ['A', '[p1-i1]', 'B', 'C']);
  assert.equal(images.length, 1);
  assert.equal(images[0].id, 'p1-i1');
  for (const b of out) {
    assert.equal('top' in b, false);
    assert.equal('src' in b, false);
  }
  assert.equal(out[1].displayWidth, 0.5);
});

test('画像より上のブロックが無ければページ先頭に入る', () => {
  const { blocks: out } = insertImages([blk('A', 1, 100)], [img(1, 150, 250)], pages);
  assert.deepEqual(describe(out), ['[p1-i1]', 'A']);
});

test('同じページの複数画像は上から順に並び、ID はページ内で通し番号', () => {
  const blocks = [blk('A', 1, 290), blk('B', 1, 10)];
  const { blocks: out, images } = insertImages(blocks, [img(1, 50, 100), img(1, 200, 250)], pages);
  assert.deepEqual(describe(out), ['A', '[p1-i2]', '[p1-i1]', 'B']);
  assert.deepEqual(images.map((i) => i.id), ['p1-i1', 'p1-i2']);
});

test('ID は別ページで 1 から振り直す', () => {
  const blocks = [blk('A', 1, 290), blk('B', 2, 290)];
  const { images } = insertImages(blocks, [img(1, 10, 50), img(2, 10, 50), img(2, 60, 90)], pages);
  assert.deepEqual(images.map((i) => i.id), ['p1-i1', 'p2-i1', 'p2-i2']);
});

test('ブロックの無いページの画像は、前のページのブロックの直後に入る', () => {
  const blocks = [blk('A', 1, 290), blk('C', 3, 290)];
  const { blocks: out } = insertImages(blocks, [img(2, 10, 50)], pages);
  assert.deepEqual(describe(out), ['A', '[p2-i1]', 'C']);
});

test('画像が無ければブロックをそのまま公開形にするだけ', () => {
  const { blocks: out, images } = insertImages([blk('A', 1, 10)], [], pages);
  assert.deepEqual(describe(out), ['A']);
  assert.equal(images.length, 0);
  assert.equal('top' in out[0], false);
});

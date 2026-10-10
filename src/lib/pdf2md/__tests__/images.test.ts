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

const col = (text: string, top: number, left: number, right: number): WorkBlock => ({
  ...blk(text, 1, top),
  segs: [{ page: 1, top, left, right }],
});
const imgX = (x0: number, x1: number, y0: number, y1: number): ExtractedImage => ({
  ...img(1, y0, y1),
  x0,
  x1,
});
const twoCols = () => [col('L1', 700, 10, 90), col('L2', 400, 10, 90), col('R1', 700, 110, 190), col('R2', 300, 110, 190)];

test('2 段組み: 右段の画像は右段のブロックの間に入る', () => {
  const { blocks: out } = insertImages(twoCols(), [imgX(110, 190, 450, 500)], pages);
  assert.deepEqual(describe(out), ['L1', 'L2', 'R1', '[p1-i1]', 'R2']);
});

test('2 段組み: 左段の画像は左段のブロックの間に入る', () => {
  const { blocks: out } = insertImages(twoCols(), [imgX(10, 90, 500, 550)], pages);
  assert.deepEqual(describe(out), ['L1', '[p1-i1]', 'L2', 'R1', 'R2']);
});

test('2 段組み: 両段にまたがる最上部の画像は先頭ブロックの前に入る', () => {
  const { blocks: out } = insertImages(twoCols(), [imgX(10, 190, 750, 800)], pages);
  assert.deepEqual(describe(out), ['[p1-i1]', 'L1', 'L2', 'R1', 'R2']);
});

test('segs が無いブロックは従来どおりページ全体で位置を決める', () => {
  const blocks = [blk('A', 1, 280), blk('B', 1, 100)];
  const { blocks: out } = insertImages(blocks, [imgX(110, 190, 150, 200)], pages);
  assert.deepEqual(describe(out), ['A', '[p1-i1]', 'B']);
});

test('出力の Block に segs は残らない', () => {
  const { blocks: out } = insertImages(twoCols(), [imgX(110, 190, 450, 500)], pages);
  for (const b of out) assert.equal('segs' in b, false);
  const { blocks: out2 } = insertImages(twoCols(), [], pages);
  for (const b of out2) assert.equal('segs' in b, false);
});

test('段をまたぐ連結段落 P: 右段の上部の画像は P の後ろ、右段の次のブロックの前に入る', () => {
  const p: WorkBlock = {
    ...blk('P', 1, 200),
    segs: [
      { page: 1, top: 200, left: 10, right: 90 },
      { page: 1, top: 700, left: 110, right: 190 },
    ],
  };
  const blocks = [col('L1', 700, 10, 90), p, col('R2', 300, 110, 190)];
  const { blocks: out } = insertImages(blocks, [imgX(110, 190, 450, 500)], pages);
  assert.deepEqual(describe(out), ['L1', 'P', '[p1-i1]', 'R2']);
});

test('重なりが小さいほうの幅のちょうど半分なら重ならない扱いで、ページ全体の位置決めになる', () => {
  // 画像 x 50..150 と X(x 100..200) は重なり 50 = 小さいほうの幅 100 の半分ちょうど。Y は重ならない
  const blocks = [col('X', 100, 100, 200), col('Y', 280, 0, 40)];
  const { blocks: out } = insertImages(blocks, [imgX(50, 150, 150, 200)], pages);
  // 候補なし -> 全ブロックで判定し、Y（画像より上）の直後。重なる扱いなら X の前になる
  assert.deepEqual(describe(out), ['X', 'Y', '[p1-i1]']);
});

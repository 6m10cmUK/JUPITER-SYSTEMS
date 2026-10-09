import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignHeadings } from '../headings.ts';
import type { WorkBlock } from '../types.ts';

const BODY = 10;
const block = (text: string, page: number, fontSize = BODY): WorkBlock => ({
  kind: 'paragraph',
  text,
  page,
  fontSize,
  bold: false,
  lineCount: 1,
});
const levels = (bs: WorkBlock[]) => bs.map((b) => (b.kind === 'heading' ? b.level : 0));

test('本文より大きい短いブロックは、サイズの段に応じて見出しレベルになる', () => {
  const { blocks, sizes } = assignHeadings(
    [
      block('第一章', 1, 20),
      block('本文はここにあります。', 1),
      block('第一節', 2, 14),
      block('本文はここにも続きます。', 2),
      block('第二章', 3, 20),
    ],
    BODY,
  );
  assert.deepEqual(levels(blocks), [1, 0, 2, 0, 1]);
  assert.deepEqual(sizes, [20, 14]);
});

test('同じレベルの見出しは、頭の記号で階層を分ける', () => {
  // ■ が 3 回、その下に ● が 2 つずつ。ページをばらして図のラベル扱いを避ける
  const texts = ['■一', '●a', '●b', '■二', '●c', '●d', '■三', '●e', '●f'];
  const { blocks } = assignHeadings(
    texts.map((t, i) => block(t, i + 1, 20)),
    BODY,
  );
  assert.deepEqual(levels(blocks), [1, 2, 2, 1, 2, 2, 1, 2, 2]);
});

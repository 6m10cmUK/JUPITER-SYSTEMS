import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachSpans } from '../styles.ts';
import type { CharStyle, WorkBlock } from '../types.ts';

const BODY = '#000000';
const RED = '#ff0000';
const st = (color: string, bold = false): CharStyle => ({ color, bold, italic: false });
const withSrc = (text: string, styles: CharStyle[]): WorkBlock => ({
  kind: 'paragraph',
  text,
  page: 1,
  fontSize: 10,
  bold: false,
  lineCount: 1,
  src: { text, styles },
});

test('本文色と違う色・太字の部分だけ spans に書式が付き、連結すると text に戻る', () => {
  const text = 'あいうえお';
  const { blocks, coloredBlocks } = attachSpans(
    [withSrc(text, [st(BODY), st(BODY), st(RED, true), st(RED, true), st(BODY)])],
    BODY,
  );
  assert.equal(coloredBlocks, 1);
  assert.deepEqual(blocks[0].spans, [{ text: 'あい' }, { text: 'うえ', color: RED, bold: true }, { text: 'お' }]);
  assert.equal(blocks[0].spans?.map((s) => s.text).join(''), text);
  assert.equal('src' in blocks[0], false);
});

test('書式がすべて既定なら spans は付かない', () => {
  const { blocks, coloredBlocks } = attachSpans([withSrc('かきくけこ', Array(5).fill(st(BODY)))], BODY);
  assert.equal(coloredBlocks, 0);
  assert.equal(blocks[0].spans, undefined);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlocks } from '../paragraphs.ts';
import { outlineKeyOf } from '../outlineKeys.ts';
import type { Group, Line } from '../types.ts';

const FS = 10;
const PITCH = 14;
const FULL = 200;

/** [text, x0, x1] から 1 段の合成グループを組む（左端 0・右端 200・行送り 14） */
function group(specs: [string, number, number][]): Group {
  const lines: Line[] = specs.map(([text, x0, x1], i) => ({
    page: 1,
    text,
    x0,
    x1,
    y: 700 - i * PITCH,
    fontSize: FS,
    bold: false,
    chars: text.length,
  }));
  return { page: 1, spanning: false, colKey: 'c0', lines };
}

const full = (text: string): [string, number, number] => [text, 0, FULL];
const texts = (g: Group) => buildBlocks([g], FS).map((b) => b.text);

test('右端まで届いた行は次の行とつながる', () => {
  const g = group([full('あいうえお'), full('かきくけこ'), full('さしすせそ'), full('たちつてと')]);
  assert.deepEqual(texts(g), ['あいうえおかきくけこさしすせそたちつてと']);
});

test('右端との差が 1.5 文字幅を超えて終わった行は段落の区切りになる', () => {
  // 差 16 > 15 は区切り、差 14 <= 15 は続き
  const brk = group([full('あいうえお'), full('かきくけこ'), ['さしすせそ', 0, FULL - 16], full('たちつてと'), full('なにぬねの')]);
  assert.deepEqual(texts(brk), ['あいうえおかきくけこさしすせそ', 'たちつてとなにぬねの']);
  const cont = group([full('あいうえお'), full('かきくけこ'), ['さしすせそ', 0, FULL - 14], full('たちつてと'), full('なにぬねの')]);
  assert.equal(texts(cont).length, 1);
});

test('字下げで始まる行は段落の区切りになる', () => {
  // 直前の行が閉じ括弧で終わる満行のとき、続きとはみなされず字下げが区切りを決める
  const g = group([full('あいうえお'), full('かきくけこ」'), ['さしすせそ', 10, FULL], full('たちつてと'), full('なにぬねの')]);
  assert.deepEqual(texts(g), ['あいうえおかきくけこ」', 'さしすせそたちつてとなにぬねの']);
});

test('文末記号で終わって余白がある行は段落の区切りになる', () => {
  const g = group([full('あいうえお'), full('かきくけこ'), ['さしすせそ。', 0, 150], full('たちつてと'), full('なにぬねの')]);
  assert.deepEqual(texts(g), ['あいうえおかきくけこさしすせそ。', 'たちつてとなにぬねの']);
});

test('折り返し: 行末の余白に次の行頭の塊が入らないときはつながる', () => {
  // 余白 25（1.5 字超・3 字以内）。次行が長い英数字列で始まれば入らず折り返し、和文 1 字なら入るので区切り
  const wrap = group([full('あいうえお'), full('かきくけこ'), ['さしすせそ', 0, 175], full('ABCDEFGHIJKL'), full('なにぬねの')]);
  assert.deepEqual(texts(wrap), ['あいうえおかきくけこさしすせそABCDEFGHIJKLなにぬねの']);
  const brk = group([full('あいうえお'), full('かきくけこ'), ['さしすせそ', 0, 175], full('たちつてと'), full('なにぬねの')]);
  assert.deepEqual(texts(brk), ['あいうえおかきくけこさしすせそ', 'たちつてとなにぬねの']);
});

test('連結: 和文同士はスペースなし、英数同士はスペースあり、行末ハイフンは語をつなぐ', () => {
  const ja = group([full('あいうえお'), full('かきくけこ'), full('さしすせそ')]);
  assert.deepEqual(texts(ja), ['あいうえおかきくけこさしすせそ']);
  const en = group([full('hello world foo'), full('bar baz qux'), full('quux corge')]);
  assert.deepEqual(texts(en), ['hello world foo bar baz qux quux corge']);
  const hy = group([full('an exam-'), full('ple of text'), full('and more')]);
  assert.deepEqual(texts(hy), ['an example of text and more']);
});

/** ページごとの 1 段グループ（行は page と y を持つ） */
function pageGroup(page: number, specs: [string, number, number][]): Group {
  const g = group(specs);
  return { ...g, page, colKey: `p${page}`, lines: g.lines.map((l) => ({ ...l, page })) };
}

test('しおりと一致する次ページ先頭の行は、前ページ末尾の行と連結しない', () => {
  const p1 = pageGroup(1, [full('あいうえお'), full('かきくけこ'), full('これは3日の物語')]);
  const p2 = pageGroup(2, [full('概要'), full('さしすせそ'), full('たちつてと')]);
  // しおり無しでは本文とつながる
  assert.equal(buildBlocks([p1, p2], FS).length, 1);
  const blocks = buildBlocks([p1, p2], FS, new Set([outlineKeyOf(2, '概要')]));
  assert.deepEqual(
    blocks.map((b) => b.text),
    ['あいうえおかきくけここれは3日の物語', '概要', 'さしすせそたちつてと'],
  );
});

test('しおりと一致する行は同一ページ内でも前後を切る', () => {
  const g = group([full('あいうえお'), full('かきくけこ'), full('概 要'), full('さしすせそ'), full('たちつてと')]);
  const blocks = buildBlocks([g], FS, new Set([outlineKeyOf(1, '概要')]));
  assert.deepEqual(
    blocks.map((b) => b.text),
    ['あいうえおかきくけこ', '概 要', 'さしすせそたちつてと'],
  );
});

test('単段のブロックは segs が 1 つ', () => {
  const g = group([full('あいうえお'), full('かきくけこ'), full('さしすせそ')]);
  const [b] = buildBlocks([g], FS);
  assert.deepEqual(b.segs, [{ page: 1, top: 700, left: 0, right: FULL }]);
});

test('ページをまたいで連結した段落は、ページごとに segs が分かれる', () => {
  const p1 = pageGroup(1, [full('あいうえお'), full('かきくけこ'), full('これは3日の物語')]);
  const p2 = pageGroup(2, [full('さしすせそ'), full('たちつてと'), full('なにぬねの')]);
  const blocks = buildBlocks([p1, p2], FS);
  assert.equal(blocks.length, 1);
  assert.deepEqual(
    blocks[0].segs?.map((s) => s.page),
    [1, 2],
  );
});

test('段をまたいで連結した段落は、y が上に戻る所で segs が 2 つに分かれる', () => {
  const left = group([full('あいうえお'), full('かきくけこ'), full('さしすせそ')]);
  const right = group([full('たちつてと'), full('なにぬねの'), full('はひふへほ')]);
  const rg: Group = { ...right, colKey: 'c1' };
  const blocks = buildBlocks([left, rg], FS);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].segs?.length, 2);
  assert.equal(blocks[0].segs?.[0].top, 700);
  assert.equal(blocks[0].segs?.[1].top, 700);
});

/** [text, x0, x1, 直前の行との追加アキ] から 1 段の合成グループを組む（段落間を空ける組版用） */
function gapGroup(specs: [string, number, number, number][]): Group {
  let y = 700;
  const lines: Line[] = specs.map(([text, x0, x1, extra], i) => {
    if (i > 0) y -= PITCH + extra;
    return { page: 1, text, x0, x1, y, fontSize: FS, bold: false, chars: text.length };
  });
  return { page: 1, spanning: false, colKey: 'c0', lines };
}

/** 先頭に「満行で句点終わりの行」を含む段落、続けて 3 行の段落を 6 つ並べる。gap は段落間のアキ */
function paragraphsDoc(gap: number): Group {
  const specs: [string, number, number, number][] = [
    ['あいうえお', 0, FULL, 0],
    ['かきくけこ。', 0, FULL, 0],
    ['さしすせそ', 0, FULL, 0],
    ['たちつてと。', 0, 150, 0],
  ];
  for (let p = 0; p < 6; p++) {
    specs.push([`ぱ${p}いうえお`, 0, FULL, gap]);
    specs.push([`ぱ${p}きくけこ`, 0, FULL, 0]);
    specs.push([`ぱ${p}しすせそ。`, 0, 150, 0]);
  }
  return gapGroup(specs);
}

test('字下げ無し・段落間アキありの本では、満行で句点終わりの行のあとを連結する', () => {
  const out = texts(paragraphsDoc(10));
  assert.equal(out[0], 'あいうえおかきくけこ。さしすせそたちつてと。');
  assert.equal(out.length, 7);
});

test('字下げ無し・段落間アキ無しの本では、満行で句点終わりの行のあとを従来どおり切る', () => {
  const out = texts(paragraphsDoc(0));
  assert.equal(out[0], 'あいうえおかきくけこ。');
  assert.equal(out[1], 'さしすせそたちつてと。');
});

/**
 * 先頭の段落のあとに、gaps[i] だけ空けた 3 行の段落を並べる（gap は直前の段落との間の追加アキ、0 ならアキ無し）。
 * 段落末（短い句点終わりの行）は、先頭の段落と最後以外の各段落の末尾で、合計 gaps.length 件。
 * 最後の段落の末尾は次の行が無いので数えない。
 */
function paragraphsDocGaps(gaps: number[]): Group {
  const specs: [string, number, number, number][] = [
    ['あいうえお', 0, FULL, 0],
    ['かきくけこ。', 0, FULL, 0],
    ['さしすせそ', 0, FULL, 0],
    ['たちつてと。', 0, 150, 0],
  ];
  gaps.forEach((gap, p) => {
    specs.push([`ぱ${p}いうえお`, 0, FULL, gap]);
    specs.push([`ぱ${p}きくけこ`, 0, FULL, 0]);
    specs.push([`ぱ${p}しすせそ。`, 0, 150, 0]);
  });
  return gapGroup(specs);
}

test('段落末の 70% だけにアキがある本では、満行で句点終わりの行のあとを従来どおり切る', () => {
  // 段落末 10 件のうち 7 件にアキ（0.7 < GAP_STYLE_RATIO）
  const out = texts(paragraphsDocGaps([10, 10, 10, 10, 10, 10, 10, 0, 0, 0]));
  assert.equal(out[0], 'あいうえおかきくけこ。');
  assert.equal(out[1], 'さしすせそたちつてと。');
});

test('段落末が 4 件だけの本では、全部アキがあっても満行で句点終わりの行のあとを従来どおり切る', () => {
  // 段落末 4 件（< GAP_STYLE_MIN_ENDS）
  const out = texts(paragraphsDocGaps([10, 10, 10, 10]));
  assert.equal(out[0], 'あいうえおかきくけこ。');
  assert.equal(out[1], 'さしすせそたちつてと。');
});

test('段落末の 17/20（0.85）にアキがある本は、アキで段落を示す本とみなして連結する', () => {
  const out = texts(paragraphsDocGaps([...Array(17).fill(10), 0, 0, 0]));
  assert.equal(out[0], 'あいうえおかきくけこ。さしすせそたちつてと。');
});

test('段落末がちょうど 5 件で全部アキありなら、アキで段落を示す本とみなして連結する', () => {
  const out = texts(paragraphsDocGaps([10, 10, 10, 10, 10]));
  assert.equal(out[0], 'あいうえおかきくけこ。さしすせそたちつてと。');
});

test('字下げのある本では、アキの有無にかかわらず満行で句点終わりの行のあとは連結し、字下げで切る', () => {
  const specs: [string, number, number, number][] = [
    ['あいうえお', 0, FULL, 0],
    ['かきくけこ。', 0, FULL, 0],
    ['さしすせそ', 0, FULL, 0],
    ['たちつてと。', 0, 150, 0],
  ];
  for (let p = 0; p < 12; p++) {
    specs.push([`ぱ${p}いうえお`, 10, FULL, 10]);
    specs.push([`ぱ${p}きくけこ`, 0, FULL, 0]);
    specs.push([`ぱ${p}しすせそ。`, 0, 150, 0]);
  }
  const out = texts(gapGroup(specs));
  assert.equal(out[0], 'あいうえおかきくけこ。さしすせそたちつてと。');
  assert.equal(out.length, 13);
});

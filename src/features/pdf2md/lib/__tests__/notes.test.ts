import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNote, inspectNotes, resolveNote, serializeNotes, type Note } from '../notes.ts';

const quiet = (t: { mock: { method: (o: object, m: string, f: () => void) => unknown } }) => t.mock.method(console, 'warn', () => {});

const BASE = ['第一段落の本文です。', '二番目の段落。猫が庭を歩いた。', '三番目の段落。'];

function noteOn(texts: string[], block: number, from: number, to: number): Note {
  const n = createNote(texts, { block, offset: from }, { block, offset: to }, 'メモ', 'n1', 1);
  assert.ok(n);
  return n;
}

test('保存位置の文字列が一致すればそのまま解決する', () => {
  const n = noteOn(BASE, 1, 7, 12); // 猫が庭を歩
  assert.equal(n.quote, '猫が庭を歩');
  assert.deepEqual(resolveNote(n, BASE), { start: n.start, end: n.end });
});

test('本文が少し変わっても quote を探して位置を直す', () => {
  const n = noteOn(BASE, 1, 7, 12);
  // 同じブロックの前に文字が増えた
  const shifted = [BASE[0], '【追記】' + BASE[1], BASE[2]];
  assert.deepEqual(resolveNote(n, shifted), { start: { block: 1, offset: 11 }, end: { block: 1, offset: 16 } });
  // 先頭にブロックが増えて block 番号がずれた
  const inserted = ['新しい段落', ...BASE];
  assert.deepEqual(resolveNote(n, inserted), { start: { block: 2, offset: 7 }, end: { block: 2, offset: 12 } });
});

test('同じ quote が複数あるときは前後の文脈が合う方を採る', () => {
  const texts = ['赤い猫が鳴く。', '青い猫が鳴く。'];
  const n = noteOn(texts, 1, 2, 3); // 青い[猫]が鳴く
  assert.equal(n.quote, '猫');
  const changed = ['赤い猫が鳴く。', 'また黒い猫が鳴く。', '青い猫が鳴く。'];
  assert.deepEqual(resolveNote(n, changed), { start: { block: 2, offset: 2 }, end: { block: 2, offset: 3 } });
});

test('見つからないとき・ブロックをまたぐメモが合わないときは null', () => {
  const n = noteOn(BASE, 1, 7, 12);
  assert.equal(resolveNote(n, ['まったく別の本文']), null);
  const multi = createNote(BASE, { block: 0, offset: 5 }, { block: 1, offset: 4 }, 'm', 'n2', 1);
  assert.ok(multi);
  assert.deepEqual(resolveNote(multi, BASE), { start: multi.start, end: multi.end });
  assert.equal(resolveNote(multi, ['第一段落の本文です。', '変わった']), null);
});

test('inspectNotes: 正常・未保存は damaged でない', () => {
  const n = noteOn(BASE, 0, 0, 4);
  assert.deepEqual(inspectNotes(serializeNotes([n])), { notes: [n], damaged: false });
  assert.deepEqual(inspectNotes(null), { notes: [], damaged: false });
});

test('inspectNotes: 壊れた JSON・形式不正・一部不正は damaged', (t) => {
  quiet(t);
  assert.deepEqual(inspectNotes('{broken'), { notes: [], damaged: true });
  assert.deepEqual(inspectNotes('{"v":2,"notes":[]}'), { notes: [], damaged: true });
  assert.deepEqual(inspectNotes('{"v":1,"notes":"x"}'), { notes: [], damaged: true });
  assert.deepEqual(inspectNotes('null'), { notes: [], damaged: true });
  const good = noteOn(BASE, 0, 0, 4);
  const raw = JSON.stringify({ v: 1, notes: [good, { id: 'bad' }] });
  assert.deepEqual(inspectNotes(raw), { notes: [good], damaged: true });
});

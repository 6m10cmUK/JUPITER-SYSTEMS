import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotes } from '../notesStorage.ts';
import type { Note } from '../notes.ts';

function note(id: string, body: string, updatedAt: number): Note {
  const p = { block: 0, offset: 0 };
  return { id, start: p, end: { block: 0, offset: 1 }, quote: 'x', prefix: '', suffix: '', body, createdAt: 1, updatedAt };
}

test('別タブで増えたメモを残し、このタブだけのメモを後ろに足す', () => {
  const latest = [note('a', 'A', 1), note('b', 'B', 1)];
  const mine = [note('a', 'A', 1), note('c', 'C', 2)];
  assert.deepEqual(mergeNotes(latest, mine, new Set()).map((n) => n.id), ['a', 'b', 'c']);
});

test('同じ id は updatedAt が新しいほうを採り、同じならこのタブを採る', () => {
  const newer = note('a', '新', 5);
  assert.equal(mergeNotes([note('a', '旧', 1)], [newer], new Set())[0].body, '新');
  assert.equal(mergeNotes([note('a', '他タブ', 9)], [note('a', '自分', 1)], new Set())[0].body, '他タブ');
  assert.equal(mergeNotes([note('a', '他タブ', 3)], [note('a', '自分', 3)], new Set())[0].body, '自分');
});

test('このタブで削除した id は最新側にあっても消す', () => {
  const latest = [note('a', 'A', 1), note('b', 'B', 1)];
  const mine = [note('b', 'B', 1)];
  assert.deepEqual(mergeNotes(latest, mine, new Set(['a'])).map((n) => n.id), ['b']);
});

test('base にあって最新に無い自分だけのメモは、別タブでの削除として復活させない', () => {
  const latest = [note('b', 'B', 1)];
  const mine = [note('a', 'A', 1), note('b', 'B', 1)];
  assert.deepEqual(mergeNotes(latest, mine, new Set(), new Set(['a', 'b'])).map((n) => n.id), ['b']);
});

test('base に無い自分だけの新規メモは残す', () => {
  const latest = [note('b', 'B', 1)];
  const mine = [note('b', 'B', 1), note('c', 'C', 2)];
  assert.deepEqual(mergeNotes(latest, mine, new Set(), new Set(['b'])).map((n) => n.id), ['b', 'c']);
});

test('base があっても updatedAt の新しいほうが勝つ', () => {
  const base = new Set(['a']);
  assert.equal(mergeNotes([note('a', '他タブ', 9)], [note('a', '自分', 1)], new Set(), base)[0].body, '他タブ');
  assert.equal(mergeNotes([note('a', '他タブ', 1)], [note('a', '自分', 9)], new Set(), base)[0].body, '自分');
});

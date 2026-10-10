import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warningsOf } from '../convertWarnings.ts';
import type { ConvertIssues } from '../../core/types.ts';

const NONE: ConvertIssues = {
  failedPages: [],
  pagesWithoutText: [],
  stylelessPages: [],
  imageFailures: 0,
  outlineUnreadable: false,
};

test('結果がまだ無いときと、問題が無いときは何も出さない', () => {
  assert.deepEqual(warningsOf(null), []);
  assert.deepEqual(warningsOf(NONE), []);
});

test('ページ数・枚数を入れて、決まった順に並べる', () => {
  assert.deepEqual(
    warningsOf({
      failedPages: [3],
      pagesWithoutText: [5, 6],
      stylelessPages: [7, 8, 9],
      imageFailures: 4,
      outlineUnreadable: true,
    }),
    [
      '1ページを読めませんでした',
      '2ページは文字も画像も取り出せないため表示していません',
      '3ページは画像・文字の色・太字を取得できませんでした',
      '画像4枚を表示できませんでした',
      'PDFのしおりを読めなかったため、見出しは本文から推定しています',
    ],
  );
});

test('問題のある項目だけを出す', () => {
  assert.deepEqual(warningsOf({ ...NONE, imageFailures: 1 }), ['画像1枚を表示できませんでした']);
});

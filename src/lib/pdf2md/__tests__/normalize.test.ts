import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, stripTocLeaders } from '../normalize.ts';

test('和文間のスペースを除き、英単語間のスペースは残す', () => {
  assert.equal(normalizeText('日本 語　の 文章'), '日本語の文章');
  assert.equal(normalizeText('日本語 and English 混在'), '日本語and English混在');
  assert.equal(normalizeText('hello   world'), 'hello world');
});

test('1 字ずつ空いた数字・英字をつなぐ', () => {
  assert.equal(normalizeText('2 0 3 2 年'), '2032年');
  assert.equal(normalizeText('F A B R M'), 'FABRM');
  // 2 字の英字は対象外
  assert.equal(normalizeText('A B'), 'A B');
});

test('部首補助の漢字を通常の漢字に直す', () => {
  assert.equal(normalizeText('⻄⺟⻑'), '西母長');
});

test('NFKC で全角英数を半角にし、三点リーダは壊さない', () => {
  assert.equal(normalizeText('Ａ１'), 'A1');
  assert.equal(normalizeText('待って…'), '待って…');
  assert.equal(normalizeText('そして… …'), 'そして……');
  assert.equal(normalizeText('―  ―'), '――');
});

test('目次のリーダーを空白 1 つにする', () => {
  assert.equal(stripTocLeaders('第1章 はじめに……… 12'), '第1章 はじめに 12');
  assert.equal(stripTocLeaders('本文だけの行'), '本文だけの行');
});

test('康熙部首を通常字に直してから正規化する', () => {
  assert.ok(normalizeText('瀬⼾⿊い').includes('瀬戸黒い'));
});

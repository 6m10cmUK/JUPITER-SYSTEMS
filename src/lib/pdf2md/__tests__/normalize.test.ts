import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, stripTocLeaders } from '../normalize.ts';

test('和文同士の空白は除き、英単語との間の空白は残す', () => {
  assert.equal(normalizeText('日本 語　の 文章'), '日本語の文章');
  assert.equal(normalizeText('日本語 and English 混在'), '日本語 and English 混在');
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

test('和文と英字の間の空白は残し、和文と数字・記号の間は消す', () => {
  assert.equal(normalizeText('TRPG 短編'), 'TRPG 短編');
  assert.equal(normalizeText('短編 TRPG シナリオ'), '短編 TRPG シナリオ');
  assert.equal(normalizeText('探 索 者'), '探索者');
  assert.equal(normalizeText('第 3 章'), '第3章');
  assert.equal(normalizeText('「 PDF 」'), '「PDF」');
  assert.equal(normalizeText('人々 TRPG'), '人々 TRPG');
  assert.equal(normalizeText('MP3 再生'), 'MP3 再生');
  assert.equal(normalizeText('Ver.2 短編'), 'Ver.2 短編');
  assert.equal(normalizeText('(TRPG) 短編'), '(TRPG) 短編');
  assert.equal(normalizeText('café 短編'), 'café 短編');
  assert.equal(normalizeText('短編 α'), '短編 α');
  assert.equal(normalizeText('ＴＲＰＧ 短編'), 'TRPG 短編');
  assert.equal(normalizeText('TRPG\t短編'), 'TRPG 短編');
  assert.equal(normalizeText('TRPG\u3000短編'), 'TRPG 短編');
});

test('中黒は語の文字ではないので、隣の空白は消える', () => {
  assert.equal(normalizeText('ア・ TRPG'), 'ア・TRPG');
  assert.equal(normalizeText('TRPG ・日本'), 'TRPG・日本');
});

test('拡張漢字は語の文字として扱い、ラテン文字との間の空白を残す', () => {
  assert.equal(normalizeText('TRPG 𠮷'), 'TRPG 𠮷');
  assert.equal(normalizeText('𠮷 TRPG'), '𠮷 TRPG');
});

test('ギリシャ文字と和文の間の空白は残す', () => {
  assert.equal(normalizeText('α 短編'), 'α 短編');
});

test('連続する空白は 1 つにまとまる', () => {
  assert.equal(normalizeText('TRPG   短編'), 'TRPG 短編');
});

test('曲がった引用符は約物として空白を消す', () => {
  assert.equal(normalizeText('日本 “TRPG” 日本'), '日本“TRPG”日本');
});

test('空白の多い長文でも 1 秒未満で終わる', () => {
  const input = '日本 a '.repeat(20000);
  const t = Date.now();
  normalizeText(input);
  assert.ok(Date.now() - t < 1000);
});

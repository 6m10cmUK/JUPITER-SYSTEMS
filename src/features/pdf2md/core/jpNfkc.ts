/**
 * NFKC 正規化の日本語向けラッパー。
 *
 * 漢字と部首で字形を共有するフォント（ヒラギノ、游明朝・游ゴシックなど）を使った PDF では、
 * Chrome や Mac の Word などの書き出し方によって、文字の対応表に部首コードが入り、
 * pdf.js が 戸・黒 などを康熙部首（U+2F00 台）として返す。
 * そのまま NFKC にかけると 戶・黑 のような旧字になるので、先に日本の字形へ置き換える。
 *
 * 表の方針:
 * 土台は Unicode の EquivalentUnifiedIdeograph（radicalMap.generated.ts）。
 * 日本の組版向けの上書きだけをここ（JP_OVERRIDES）に持つ。
 */
import { UNICODE_RADICAL_MAP } from './radicalMap.generated';

const JP_OVERRIDES: Readonly<Record<string, string>> = {
  // Unicode の対応先が JIS X 0208 外の字（戶・黑・靑・黃）なので、日本の字形にする。
  '⼾': '戸',
  '⿊': '黒',
  '⾭': '青',
  '⿈': '黄',
  // Unicode は意味で対応させている（目・邑）。PDF ではフォントが漢字と字形を共有することで
  // 部首コードが出るので、形の同じ字を採る（ヒラギノの cmap でも 罒・阝 と字形を共有する）。
  '⺫': '罒',
  '⻏': '阝',
};

export const RADICAL_TO_KANJI: Readonly<Record<string, string>> = {
  ...UNICODE_RADICAL_MAP,
  ...JP_OVERRIDES,
};

export { JP_OVERRIDES };

const RADICAL_RE = new RegExp(`[${Object.keys(RADICAL_TO_KANJI).join('')}]`, 'g');

export function jpNfkc(s: string): string {
  return s.replace(RADICAL_RE, (c) => RADICAL_TO_KANJI[c]).normalize('NFKC');
}

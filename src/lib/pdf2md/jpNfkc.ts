/**
 * NFKC 正規化の日本語向けラッパー。
 *
 * Chrome がヒラギノで出した PDF では、pdf.js が 戸・黒 などを康熙部首（U+2F00 台）として返す。
 * そのまま NFKC にかけると 戶・黑 のような旧字になるので、先に日本の字形へ置き換える。
 *
 * 表の方針:
 * - 康熙部首（U+2F00 台）は、NFKC の結果が JIS X 0208 に無い 4 字だけを日本の字形に戻す。
 * - CJK 部首補助（U+2E80 台）は NFKC で変わらないので、対応する通常字（独立字・偏旁）に寄せる。
 */
export const RADICAL_TO_KANJI: Readonly<Record<string, string>> = {
  // 康熙部首
  '⼾': '戸',
  '⾭': '青',
  '⿈': '黄',
  '⿊': '黒',
  // CJK 部首補助
  '⺟': '母',
  '⺠': '民',
  '⻁': '虎',
  '⻄': '西',
  '⻑': '長',
  '⻘': '青',
  '⻤': '鬼',
  '⻨': '麦',
  '⻩': '黄',
  '⻫': '斉',
  '⻭': '歯',
  '⻯': '竜',
  '⻲': '亀',
  '⻔': '門',
  '⻝': '食',
  '⻢': '馬',
  '⻣': '骨',
  // 偏旁
  '⻏': '阝',
  '⻌': '辶',
  '⺼': '肉',
  '⺮': '竹',
  '⺡': '氵',
  '⺅': '亻',
  '⺘': '扌',
  '⺾': '艹',
};

const RADICAL_RE = new RegExp(`[${Object.keys(RADICAL_TO_KANJI).join('')}]`, 'g');

export function jpNfkc(s: string): string {
  return s.replace(RADICAL_RE, (c) => RADICAL_TO_KANJI[c]).normalize('NFKC');
}

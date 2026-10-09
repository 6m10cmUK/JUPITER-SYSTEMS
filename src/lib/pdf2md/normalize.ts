import { TOC_LEADER_DOTS, isCjkLike } from './chars';
import { jpNfkc } from './jpNfkc';

/** NFKC で壊したくない文字（三点リーダ類） */
const NFKC_KEEP = new Set(['…', '‥']);

function nfkc(s: string): string {
  let out = '';
  let buf = '';
  const flush = () => {
    if (buf) out += jpNfkc(buf);
    buf = '';
  };
  for (const ch of s) {
    if (NFKC_KEEP.has(ch)) {
      flush();
      out += ch;
    } else buf += ch;
  }
  flush();
  return out;
}

/**
 * 和文の「語を構成する文字」（かな・漢字・々〆〇）。括弧などの和文約物は含めない。
 * 中黒「・」(U+30FB)・「゠」(U+30A0)・結合濁点類 (U+3099-309C) は語の文字に含めない。
 */
function isCjkWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.codePointAt(0)!;
  return (
    (c >= 0x3005 && c <= 0x3007) || // 々 〆 〇
    (c >= 0x3041 && c <= 0x3096) || // ひらがな
    (c >= 0x30a1 && c <= 0x30fa) || // カタカナ（゠・中黒を除く）
    (c >= 0x30fc && c <= 0x30ff) || // ー ヽ ヾ ヿ
    (c >= 0x31f0 && c <= 0x31ff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff66 && c <= 0xff9f) ||
    (c >= 0x20000 && c <= 0x2fa1f) // 拡張漢字
  );
}

const LATIN_OR_GREEK = /[\p{Script=Latin}\p{Script=Greek}]/u;
const isBlank = (ch: string) => ch === ' ' || ch === '\t';

/**
 * 和文に隣り合う空白を除く。
 * 和文同士・和文と数字・和文と約物（括弧など）の間の空白は組版の字間なので消す。
 * ただし空白の片側が和文の語の文字（かな・漢字・々〆〇）で、もう片側の語
 * （空白から次の空白または和文系文字までの連続）にラテン文字かギリシャ文字が含まれるときは、
 * 語の区切りとして空白を 1 つ残す（"TRPG 短編"、"MP3 再生"、"(TRPG) 短編"）。
 *
 * この規則は「空白で区切られた 1 トークン」だけを見る。トークンは空白または和文系文字で途切れ、
 * それより外側の文字は見ない。文字はコードポイント単位で扱う。
 * 左の語は入力側の配列を遡って判定する（消した空白は語の中身に影響しないので出力側は不要）。
 * 線形時間で動く。
 */
function removeCjkSpaces(s: string): string {
  const chars = [...s];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isBlank(ch)) {
      let j = i;
      while (j < chars.length && isBlank(chars[j])) j++;
      const prev = i > 0 ? chars[i - 1] : undefined;
      const next = chars[j];
      if (isCjkLike(prev) || isCjkLike(next)) {
        let keep = false;
        if (isCjkWordChar(prev)) {
          let k = j;
          while (k < chars.length && !isBlank(chars[k]) && !isCjkLike(chars[k])) k++;
          keep = LATIN_OR_GREEK.test(chars.slice(j, k).join(''));
        }
        if (!keep && isCjkWordChar(next)) {
          let k = i;
          while (k > 0 && !isBlank(chars[k - 1]) && !isCjkLike(chars[k - 1])) k--;
          keep = LATIN_OR_GREEK.test(chars.slice(k, i).join(''));
        }
        if (keep) out.push(' ');
        i = j - 1;
        continue;
      }
    }
    out.push(ch);
  }
  return out.join('');
}

export function normalizeText(input: string): string {
  let s = nfkc(input);
  s = s.replace(/[\u00a0\u3000]/g, ' ');
  s = s.replace(/[ \t]+/g, ' ');
  s = removeCjkSpaces(s);
  // "2 0 3 2" → "2032"（単独の数字が 2 つ以上）
  s = s.replace(/(?<![A-Za-z0-9])[0-9](?: [0-9])+(?![A-Za-z0-9])/g, (m) => m.replace(/ /g, ''));
  // 1 文字ずつ間隔の空いた英字列 "F A B R M"（3 文字以上）
  s = s.replace(/(?<![A-Za-z0-9])[A-Za-z](?: [A-Za-z]){2,}(?![A-Za-z0-9])/g, (m) => m.replace(/ /g, ''));
  s = s.replace(/…\s+…/g, '……').replace(/…\s+…/g, '……');
  s = s.replace(/―\s+―/g, '――');
  return s.trim();
}

const TOC_LEADER_TAIL = new RegExp(`[ ]*(?:${TOC_LEADER_DOTS})[ ]*(?=[0-9０-９]+[ ]*$)`);

/** 目次のリーダー（……… や ......）を空白 1 つにする。見出し判定がリーダーを手がかりに使うので、その後で呼ぶ */
export function stripTocLeaders(text: string): string {
  return text.replace(TOC_LEADER_TAIL, ' ');
}

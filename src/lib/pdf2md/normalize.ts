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

function removeCjkSpaces(s: string): string {
  const chars = [...s];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ' ' || ch === '\t') {
      let j = i;
      while (j < chars.length && (chars[j] === ' ' || chars[j] === '\t')) j++;
      const prev = out[out.length - 1] ?? chars[i - 1];
      const next = chars[j];
      if (isCjkLike(prev) || isCjkLike(next)) {
        i = j - 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
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

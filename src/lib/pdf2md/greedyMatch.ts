import { jpNfkc } from './jpNfkc';
/**
 * 文字列を、順に並んだ文字の列 seq へ貪欲に突き合わせる共通処理。DOM 非依存。
 * ptr から先読み lookahead 文字の範囲で、ch（jpNfkc 後の先頭 1 文字）と同じ文字を探す。
 * 合字などで jpNfkc が複数文字になる場合も、先頭 1 文字で探して、残りぶんは進めるだけにする。
 */
export function matchNext(
  seq: ReadonlyArray<{ c: string }>,
  ptr: number,
  ch: string,
  lookahead: number,
): { index: number; next: number } | null {
  const nk = Array.from(jpNfkc(ch));
  const first = nk[0] ?? '';
  const end = Math.min(seq.length, ptr + lookahead);
  for (let k = ptr; k < end; k++) {
    if (seq[k].c === first) return { index: k, next: Math.min(seq.length, k + nk.length) };
  }
  return null;
}

/** 文字種判定の共通ヘルパ */

/** 和文系（かな・漢字・和文約物・全角形・幾何記号など）。スペース除去・連結判定に使う */
export function isCjkLike(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.codePointAt(0)!;
  return (
    (c >= 0x3000 && c <= 0x30ff) || // 和文約物・かな
    (c >= 0x31f0 && c <= 0x31ff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff00 && c <= 0xffef) || // 全角形・半角カナ
    (c >= 0x2e80 && c <= 0x2fdf) || // 部首
    (c >= 0x2010 && c <= 0x2015) || // ハイフン・ダッシュ・―
    (c >= 0x2018 && c <= 0x201f) || // 引用符
    c === 0x2025 ||
    c === 0x2026 ||
    c === 0x203b ||
    (c >= 0x2190 && c <= 0x21ff) || // 矢印
    (c >= 0x2460 && c <= 0x24ff) || // 丸数字
    (c >= 0x25a0 && c <= 0x26ff) || // 幾何・記号
    (c >= 0x20000 && c <= 0x2fa1f)
  );
}

export function isLatinLetter(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z]/.test(ch);
}

/** 目次のリーダー（……… や ......）。stripTocLeaders は罫線系（---）を含めない */
export const TOC_LEADER_DOTS = '[…‥]{2,}|[.．・･]{4,}';
/** 罫線系も含む目次リーダー（見出し・段落の判定用） */
export const TOC_LEADER_ANY = `${TOC_LEADER_DOTS}|[-－―─]{4,}`;

/** pdf2md 共通型。DOM 非依存。 */

export interface TextRun {
  str: string;
  /** 左端 x（PDF 座標） */
  x: number;
  /** ベースライン y（PDF 座標、上が大きい） */
  y: number;
  w: number;
  fontSize: number;
  bold: boolean;
  /** 斜体か（フォント属性・名前・変形行列のせん断のいずれか） */
  italic: boolean;
  /** str の UTF-16 単位ごとの塗り色（'#rrggbb'）。取れなければ省略 */
  colors?: string[];
}

export interface PageData {
  /** 1 始まり */
  page: number;
  width: number;
  height: number;
  /** view の下端 y（柱帯の相対位置計算用） */
  yMin: number;
  runs: TextRun[];
}

export interface Line {
  page: number;
  text: string;
  x0: number;
  x1: number;
  y: number;
  fontSize: number;
  bold: boolean;
  /** 空白を除く文字数 */
  chars: number;
  /** text の UTF-16 単位ごとの書式。行組み立てで挿入した空白は null */
  styles?: (CharStyle | null)[];
}

export interface CharStyle {
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface StyledSpan {
  text: string;
  /** '#rrggbb' 小文字。本文色・白に近い色のときは付けない */
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

/** 読み順に並んだ行のまとまり（1 段 or 段またぎの 1 バンド） */
export interface Group {
  page: number;
  /** 段をまたぐ（全幅の）行か */
  spanning: boolean;
  /** 段の識別子（ページ内で一意。右端・左端の統計単位） */
  colKey: string;
  lines: Line[];
}

export interface Block {
  kind: 'paragraph' | 'heading' | 'image';
  level?: number;
  text: string;
  page: number;
  fontSize: number;
  bold: boolean;
  lineCount: number;
  /** 書式つきの断片。連結すると text と完全一致する。書式が全部既定なら省略 */
  spans?: StyledSpan[];
  /** image ブロックの画像 id（ConvertResult の images[].id と対応） */
  imageId?: string;
  /** image ブロックの表示幅（ページ幅に対する比 0〜1） */
  displayWidth?: number;
}

/** 変換の途中だけで使うブロック。公開の Block には top・src を出さない（出力時に toBlock で外す） */
export interface WorkBlock extends Block {
  /** ブロック先頭行の y（PDF 座標）。画像の挿入位置決めに使う */
  top?: number;
  /** 行を区切りなしで連結した生テキストと文字ごとの書式。spans の組み立てに使う */
  src?: { text: string; styles: (CharStyle | null)[] };
}

/** pdfjs から取り出した生の画像 */
export interface RawImage {
  width: number;
  height: number;
  data?: Uint8ClampedArray | Uint8Array;
  /** pdfjs の ImageKind（1: GRAYSCALE_1BPP, 2: RGB_24BPP, 3: RGBA_32BPP） */
  kind?: number;
  bitmap?: unknown;
}

export interface ConvertOptions {
  /**
   * 渡すと PDF 内の画像を取り出し、読み順の位置に image ブロックとして挟む。
   * null を返した画像は捨てる。未指定なら画像は一切取らない（テキスト出力は変わらない）。
   */
  encodeImage?: (img: RawImage) => Promise<Blob | null>;
  /** debug 情報を返す */
  debug?: boolean;
  /** 進捗コールバック（抽出フェーズ） */
  onProgress?: (done: number, total: number) => void;
}

/** convertDocument が返す、取り出した画像 */
export interface ConvertImage {
  id: string;
  blob: Blob;
}

/** 変換で起きた問題。利用者に知らせる */
export interface ConvertIssues {
  /** 読み込めずに飛ばしたページ（1 始まり） */
  failedPages: number[];
  /** 文字も表示できる画像もなく、本文に何も出てこないページ（1 始まり） */
  pagesWithoutText: number[];
  /** getOperatorList に失敗したページ（1 始まり）。文字の色・太字に加え、画像の配置も検出できないので画像も出ない */
  stylelessPages: number[];
  /** 取り出し・エンコードに失敗して捨てた画像の枚数 */
  imageFailures: number;
  /** しおりの一覧を読めなかった（無いのではなく読み込みに失敗した） */
  outlineUnreadable: boolean;
}

/** convertDocument の戻り値 */
export interface ConvertResult {
  blocks: Block[];
  images: ConvertImage[];
  issues: ConvertIssues;
  debug?: ConvertDebug;
}

/** ConvertOptions.debug のときに返す内部情報 */
export interface ConvertDebug {
  pageCount: number;
  bodySize: number;
  headingSizes: number[];
  outline: { entries: number; applied: boolean };
  headingCount: number;
  paragraphCount: number;
  furnitureKeys: string[];
  furnitureRemoved: number;
  columnsPerPage: number[];
  styles: { bodyColor: string; coloredBlocks: number };
  images: { found: number; kept: number };
}

/** hook から Worker へ送るメッセージ */
export interface WorkerRequest {
  type: 'convert';
  data: ArrayBuffer;
}

/** Worker から hook へ返すメッセージ */
export type WorkerMessage =
  | { type: 'progress'; done: number; total: number }
  | ({ type: 'done'; fileId: string } & Omit<ConvertResult, 'debug'>)
  | { type: 'error'; message: string };

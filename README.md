# JUPITER SYSTEMS

木林ユピテル（き-ばやし）の個人サイト。

## 機能

### ホーム
- TRPG キャラクターギャラリー
- ルーム（背景素材）ギャラリー

### Scenario PDF Reader（`/pdf2md`）
シナリオPDFを読みやすく。文字情報のある PDF を、ブラウザの中だけで本文に組み直して表示する。

- PDF はこの端末から外に送信しない（変換は Web Worker 内の pdf.js で完結）
- 組版由来の改行を除いて段落にまとめる。柱・ノンブルは除去する
- 見出しを検出して目次を作る（PDF のしおりがあれば優先）
- 範囲選択コピー・全文コピー（段落間は空行、見出しに記号を付けない）
- 本文検索（Ctrl/Cmd+F、Enter／Shift+Enter で次／前）
- 本文にメモを付けられる。メモと抜粋はこのブラウザの localStorage にだけ保存する
- PC 表示のみ対応。OCR（画像だけの PDF）、縦書きは対象外

### 公開していないページ
`/character-display-generator` と `/discord-obs` はルートとページを残しているが、メニューとホームからのリンクは外している（2026-10-09、Scenario PDF Reader に絞るため。ページ自体は消さない判断）。

## 技術スタック
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- pdfjs-dist（Web Worker で実行）、@floating-ui/dom

## 開発

```bash
npm install
npm run dev      # predev で pdf.js の cMap・標準フォントを public/pdfjs/ にコピー
npm run build    # tsc -b && vite build
npm run lint
npm test         # 型検査＋ユニットテスト（段落連結・しおり・見出し・柱除去・書式・正規化・fileId・メモ・コピー。合成データのみ）
```

build でも prebuild で同じコピーが走る。`vite` を直接起動すると predev が走らず cMap が欠けて日本語が化けるので、`npm run dev` を使う。

### 変換精度の評価（手元のみ）
`npm run eval:pdf2md` は手元のコーパス（購入シナリオ）で段落・見出しの精度を採点する。コーパスの場所は環境変数 `PDF2MD_CORPUS`（既定 `~/pdf2md-corpus`）で、採点結果もその配下の `.results/` に書く。コーパス・変換結果・正解データはリポジトリに入れない。

## デプロイ
Vercel（Framework Preset: Vite、Output: `dist`）。`vercel.json` は SPA のフォールバックだけを持つ。バックエンドはない。

## ライセンス

MIT License

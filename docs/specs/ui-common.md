# UI 共通仕様

## Tooltip

title 属性は使わず、カスタム Tooltip コンポーネント（label prop）に統一。改行が必要な場合は whiteSpace: pre で対応。

## AdSection の折りたたみ機能

AdSection の折りたたみ機能は廃止。常時展開表示とする。

## トースト通知

スライドイン・スライドアウトアニメーション追加。エラー時は赤背景に加え shake 演出を付与。

## パネルヘッダーボタン

SortableListPanel を使用する全パネル（シーン・キャラクター・レイヤー・BGM・テキストメモ・カットイン）で、ヘッダー右端のアクションボタンを以下の仕様で統一する。

### ボタン構成

左から順に「複製」「削除」「追加」の3ボタンを配置する。パネルによっては一部省略可（例: BGMパネルの追加のみ）。

### スタイル仕様

ラッパー: `display: flex, alignItems: center, gap: 1px`

各ボタン共通: `background: transparent, border: none, cursor: pointer, padding: 2px 4px, display: flex, alignItems: center`

アイコンサイズ: 15px（lucide-react の size={15}）

色:
- 複製ボタン: `theme.textSecondary`（グレー）
- 削除ボタン: `theme.danger`（赤）
- 追加ボタン: `theme.accent`（青）

disabled 状態: `opacity: 0.3`, `cursor: default`

各ボタンに Tooltip を付与する（ラベル例: 「複製」「削除」「シーンを追加」）。

### 行内アクションボタンの方針

リスト各行にインラインの削除ボタンは配置しない。削除はヘッダーボタン・右クリックメニュー・Delete キーで行う。
行内に配置してよいのは、その行固有の操作（表示/非表示トグル、チャット送信など）のみ。

## サムネイル表示

シーンパネル・キャラクターパネルで各エンティティのサムネイルを表示。

### シーンサムネイル

高さ 40px。background_url と foreground_url を斜め分割して 2 つの画像を並べて表示。どちらかが未設定の場合は設定済みの画像のみ、または空表示。

### キャラクターサムネイル

40×40px。images[active_image_index].url を cover fit・上寄せで表示。立ち絵未設定時はプレースホルダー表示。

## ボードズーム

ZoomBar コンポーネントでボード表示倍率を制御。スライダーで 0.02〜4倍の範囲を調整可能。リセットボタンで 100% に戻す。

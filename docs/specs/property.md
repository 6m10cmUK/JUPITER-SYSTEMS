# プロパティパネル

各エンティティ（シーン・オブジェクト・キャラクター・BGM・カットイン等）の詳細編集UI。PropertyDockPanel でパネル化。

## 背景プロパティ

背景画像（AssetPicker）・グリッド表示・背景ぼかし・背景フェードイン（有効/無効 + duration ms）を編集。

背景の表示モードが単色指定の状態でAssetPicker経由で画像を設定した場合、表示モードを自動的に画像モードに切り替える。ユーザーが手動でモード切替する手間を省く。

## 前景プロパティ

前景画像（AssetPicker）・画像表示モード（全体表示/トリミング/引き伸ばし）・前景フェードイン（有効/無効 + duration ms）を編集。前景は常にシーン全体を覆うため、位置・サイズ・ロックの設定項目は表示しない。

前景の表示モードが単色指定の状態でAssetPicker経由で画像を設定した場合、表示モードを自動的に画像モードに切り替える。

## 背景・前景・パネルの描画モード

objects テーブルの color_enabled フラグで「単色モード」と「画像モード」を切り替える。

単色モード（color_enabled = true）の場合、background_color の hex 色を colorToDataUrl で data URL 化し、img 要素の src に設定する。div の backgroundColor は使わない。

画像モード（color_enabled = false）の場合、image_asset_id から解決した画像 URL を useAnimatedBlobSrc で blob 化し、img 要素に表示する。div の backgroundColor は transparent。画像未選択（image_asset_id = null）の場合は何も表示しない（transparent）。

背景と前景の AssetPicker で画像を設定した際、表示モードが単色指定の状態であれば color_enabled を自動的に false に切り替える。

各タイプのデフォルト background_color（新規作成時）:

| タイプ | デフォルト色 |
|--------|------------|
| 背景 | #1e1e2e |
| 前景 | #666666 |
| パネル | #333333 |

## オブジェクトプロパティ

選択オブジェクト（複数可）の name / x / y / width / height / visible / opacity / position_locked / size_locked / z_order（sort_order）を編集。

### 数値入力フィールド

数値入力フィールド（x, y, width, height 等）は NumberDragInput コンポーネントを使用。左右ドラッグで値変更、Blender 風の操作感。DOM 直操作で即時反映し、ドラッグ中は Supabase 同期を遮断（localOnly モード）、ドラッグ終了時に一括保存。Shift+ドラッグで小数点刻みの微調整が可能。ボード上・プロパティパネル両対応。

### 前景プロパティ補足

前景（foreground）プロパティにサイズ（width/height）を追加。

panel type：image_url / background_color / image_fit（contain/cover/stretch）。

text type：text_content / font_size / font_family / letter_spacing / line_height / auto_size / text_align / text_vertical_align / text_color / scale_x / scale_y。

## キャラクタープロパティ

name / color / size / initiative / sheet_url（キャラシートリンク）/ 各種ステータス・パラメータ / チャットパレット / 秘密メモ等を編集。

## BGM プロパティ

シーン切替時の自動再生・ループ・フェードイン（有効/無効 + duration ms）を編集。name は read-only 表示のみ。BGMの追加はアセットライブラリから行う。

## テキストメモ（シナリオテキスト）プロパティ

タイトル・本文（テキストエリア、拡大表示可）・話者キャラクター（キャラクター一覧から選択）・話者名（手入力、キャラクター選択時は自動補完）・チャンネル割り当てを編集。

フッターに「チャットに送信」ボタンを配置。クリックで content を channel_id のチャンネルに送信。送信時にテンプレート変数を展開（resolveTemplateVars）。

## カットインプロパティ

name / image_url / text / animation / duration / text_color / background_color を編集。

## 操作UI

各プロパティ値は、フォーム要素（input / textarea / slider / color picker 等）で編集。変更はデバウンスで自動保存。キャラクターのみ明示的な「保存」ボタンあり（未保存時はハイライト表示）。

# プロパティパネル

各エンティティ（シーン・オブジェクト・キャラクター・BGM・カットイン等）の詳細編集UI。PropertyDockPanel でパネル化。

## 背景プロパティ

背景画像（AssetPicker）・グリッド表示・背景ぼかし・背景フェードイン（有効/無効 + duration ms）を編集。

## 前景プロパティ

前景画像（AssetPicker）・画像表示モード（全体表示/トリミング/引き伸ばし）・位置(x/y)・サイズ(width/height)・位置ロック/サイズロック・前景フェードイン（有効/無効 + duration ms）を編集。

## オブジェクトプロパティ

選択オブジェクト（複数可）の name / x / y / width / height / visible / opacity / position_locked / size_locked / z_order（sort_order）を編集。

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

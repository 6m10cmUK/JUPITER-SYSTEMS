# シナリオテキスト

GM台詞・ナレーション・地の文テキスト表示。チャットパレット連携。

## 作成・編集・削除

ScenarioTextPanel で管理。「+」で新規追加。ScenarioTextEditor ダイアログで編集。title / content / speaker_character_id / channel_id を設定。削除は確認ダイアログ。

## チャンネル割当・チャット送信

channel_id でチャットチャンネル紐付け。プロパティパネルフッターの「チャットに送信」ボタンで content をメッセージ送信。送信先は channel_id で指定したチャンネル（未指定時はメイン）。speaker_character_id で話者キャラ指定時は、そのキャラ名・アバターで送信。

送信時、content 内のテンプレート変数（`{ラベル名}`）を speaker_character_id で指定したキャラクターのステータス・パラメーター値で resolveTemplateVars により展開する。キャラクター未指定時は展開せずそのまま送信。

## 表示制御

visible 切替で表示/非表示。

## 並べ替え

ドラッグ&ドロップで sort_order 変更。

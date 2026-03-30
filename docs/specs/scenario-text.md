# シナリオテキスト

GM台詞・ナレーション・地の文テキスト表示。チャットパレット連携。

## 作成・編集・削除

ScenarioTextPanel で管理。「+」で新規追加。ScenarioTextEditor ダイアログで編集。title / content / speaker_character_id / channel_id を設定。削除は確認ダイアログ。

## チャンネル割当・チャット送信

channel_id でチャットチャンネル紐付け。「チャットに送信」ボタンで content をメッセージ送信。speaker_character_id で話者キャラ指定時は、そのキャラ名・アバターで送信。

## 表示制御・テンプレート

visible 切替で表示/非表示。テンプレート変数展開未対応（直接テキスト編集）。

## 並べ替え

ドラッグ&ドロップで sort_order 変更。

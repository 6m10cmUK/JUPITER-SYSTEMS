# 権限システム

ロールベース権限制御（RBAC）。ロール階層：guest < user < sub_owner < owner。

## ロール定義

guest：閲覧のみ。チャット送信・駒移動・キャラクター編集を含む全操作不可。見るだけ。

user：基本操作（駒移動・チャット・キャラ編集）。シーン・BGM・カットイン編集不可。

sub_owner：シーン・オブジェクト・BGM・カットイン・レイヤー編集可。ロール割当不可。

owner：全機能。ロール割当・ルーム設定変更可能。

## ロール変更UI

SettingsModal の「メンバー一覧」セクションでメンバーのロールを変更できる。owner のみ操作可能。owner 自身のロールは変更不可（「オーナーのロールは変更できません」と表示）。変更対象ロールは sub_owner / user / guest の3種。

## パーミッション定義

各操作に最低限必要ロール（PERMISSION_MIN_ROLE）を設定。

chat_send：user 以上
piece_move / object_move：user 以上
character_edit：user 以上
scene_edit / object_edit / bgm_manage / cutin_manage / layer_manage：sub_owner 以上
room_settings / role_assign：owner のみ
panel_*：各パネルに最低ロール設定（panel_debug は owner のみ）

## パネル表示制限

guest ログイン時、アクセス権限なしパネルは表示・入力不可。LayerPanel / ScenePanel / BgmPanel 等は sub_owner 権限要件のため guest は非表示。

## checkPermission()

withPermission()ラッパーで各操作にガード。権限不足時は toast error 表示で通知。

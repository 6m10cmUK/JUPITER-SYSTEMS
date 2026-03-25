# Adrastea データモデル仕様書

本ドキュメントは Adrastea（TRPG オンラインセッション盤面共有ツール）のデータモデルを定義する。Convex を利用したリアルタイムデータベースとして実装される。

## 概要

Convex スキーマ（`convex/schema.ts`）に基づき、以下の 13 エンティティを管理する。各エンティティはテーブル単位で定義され、ドキュメント ID（Convex の `_id` フィールド）により一意に識別される。テーブル横断検索は定義済みインデックスを通じて実施される。

---

## エンティティ定義

### 1. users

**概要**: アプリケーションユーザーの認証・プロフィール情報。Convex Auth フレームワークで管理される。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"users">` | ✓ | Convex が自動生成するドキュメント ID |
| `email` | `string` | ✓ | ユーザーメールアドレス（認証キー） |
| `name` | `string` | - | ユーザー表示名 |
| `image` | `string` | - | プロフィール画像 URL |
| `emailVerificationTime` | `number` | - | メール検証タイムスタンプ |
| `phone` | `string` | - | 電話番号（将来用） |
| `phoneVerificationTime` | `number` | - | 電話検証タイムスタンプ |
| `isAnonymous` | `boolean` | - | 匿名ユーザーフラグ |
| `onboarded` | `boolean` | - | オンボーディング完了フラグ |

**インデックス**:
- Convex Auth が自動管理（email は一意）

**制約・バリデーション**:
- メールアドレスは Convex Auth にて一意性が強制される
- 認証済みユーザーと匿名ユーザーは `isAnonymous` で区別

**関連**:
- `room_members.user_id` → `users._id`（ルームメンバーシップ）
- `characters_stats.owner_id` → `users._id`（キャラクター所有者）
- `pieces.character_id` → `characters_stats.id`（盤面コマ）

---

### 2. rooms

**概要**: TRPG セッションの管理単位。ゲームマスター（owner）が作成し、複数のユーザーが参加する。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"rooms">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | ユーザー指定の一意識別子（URL フレンドリー） |
| `name` | `string` | ✓ | ルーム名（セッション名） |
| `description` | `string` | - | ルーム説明文 |
| `owner_id` | `string` | ✓ | 所有者の user_id |
| `active_scene_id` | `string \| null` | ✓ | 現在表示中のシーン ID |
| `foreground_url` | `string \| null` | ✓ | 前景画像 URL（ルーム全体） |
| `active_cutin` | `{ cutin_id: string, triggered_at: number } \| null` | ✓ | 現在表示中のカットイン |
| `dice_system` | `string` | ✓ | ダイスシステム名（"DnD", "Coc7" など） |
| `gm_can_see_secret_memo` | `boolean` | ✓ | GM が秘密メモを見えるかどうか |
| `default_login_role` | `'sub_owner' \| 'user' \| 'guest'` | - | ゲストの初期ロール（未指定時は guest） |
| `created_at` | `number` | ✓ | 作成タイムスタンプ（ミリ秒） |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ（ミリ秒） |

**インデックス**:
- `by_owner`: `["owner_id"]`（ユーザー所有ルーム一覧）

**制約・バリデーション**:
- `id` はユーザー指定のため、ルーム作成時にグローバル一意性チェックが必須（クライアント側で実施）
- `dice_system` は事前定義されたシステムから選択（共通リスト管理）
- `gm_can_see_secret_memo` は owner のみ更新可能

**関連**:
- `room_members.room_id` → `rooms.id`（メンバーシップ）
- `scenes.room_id` → `rooms.id`（シーン）
- `objects.room_id` → `rooms.id`（盤面オブジェクト）
- `pieces.room_id` → `rooms.id`（コマ）
- `characters_stats.room_id` → `rooms.id`（キャラクター）
- `messages.room_id` → `rooms.id`（チャット）
- `bgms.room_id` → `rooms.id`（BGM）
- `cutins.room_id` → `rooms.id`（カットイン）

---

### 3. scenes

**概要**: TRPG セッション内のシーン。背景画像、演出、グリッド表示を管理する。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"scenes">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | シーン識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `name` | `string` | ✓ | シーン名 |
| `background_url` | `string \| null` | ✓ | 背景画像 URL |
| `foreground_url` | `string \| null` | ✓ | 前景画像 URL（シーン固有） |
| `foreground_opacity` | `number` | ✓ | 前景透明度（0.0 ～ 1.0） |
| `bg_transition` | `'none' \| 'fade'` | ✓ | 背景切替トランジション |
| `bg_transition_duration` | `number` | ✓ | 背景トランジション時間（ミリ秒） |
| `fg_transition` | `'none' \| 'fade'` | ✓ | 前景切替トランジション |
| `fg_transition_duration` | `number` | ✓ | 前景トランジション時間（ミリ秒） |
| `bg_blur` | `boolean` | ✓ | 背景にぼかしを適用するか |
| `grid_visible` | `boolean` | - | グリッド表示フラグ |
| `sort_order` | `number` | ✓ | シーン並び順（昇順） |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内シーン一覧）
- `by_room_order`: `["room_id", "sort_order"]`（ルーム内シーン順序取得）

**制約・バリデーション**:
- `sort_order >= 0`
- `foreground_opacity`: 0.0 ～ 1.0
- `bg_transition_duration`, `fg_transition_duration` は非負数
- 更新権限は `room_members.role` が `'sub_owner'` 以上のユーザーのみ

**関連**:
- `rooms.active_scene_id` → `scenes.id`（現在のアクティブシーン）
- `objects.scene_ids[]` → `scenes.id`（マルチシーン対応オブジェクト）
- `bgms.scene_ids[]` → `scenes.id`（BGM 割当）

---

### 4. pieces

**概要**: 盤面上のコマ（キャラクター駒）。**古い設計であり、新規開発では使用されない。キャラクター管理は `characters_stats` と `characters_base` に移行済み。**

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"pieces">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | コマ識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `x` | `number` | ✓ | X 座標（グリッド単位） |
| `y` | `number` | ✓ | Y 座標（グリッド単位） |
| `width` | `number` | ✓ | 幅（グリッド単位） |
| `height` | `number` | ✓ | 高さ（グリッド単位） |
| `image_url` | `string \| null` | ✓ | コマ画像 URL |
| `label` | `string` | ✓ | コマラベル（表示名） |
| `color` | `string` | ✓ | コマ色（16 進数カラーコード） |
| `z_index` | `number` | ✓ | Z オーダー（重ね順） |
| `statuses` | `PieceStatus[]` | ✓ | ステータス配列 |
| `initiative` | `number` | ✓ | イニシアティブ（ターン順） |
| `memo` | `string` | ✓ | コマ固有メモ |
| `character_id` | `string \| null` | ✓ | リンク先キャラクター ID（存在する場合） |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内コマ一覧）

**制約・バリデーション**:
- `z_index` は任意の整数
- `initiative >= 0`
- 幅・高さは正数

**関連**:
- `room_id` → `rooms.id`
- **推奨**: 将来は `characters_stats` への統合

---

### 5. characters_stats

**概要**: キャラクター統計情報（ボード上の表示・配置）。複数画像対応、HP/MP などのステータス管理。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"characters_stats">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | キャラクター識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `owner_id` | `string` | ✓ | 所有ユーザー ID |
| `name` | `string` | ✓ | キャラクター名 |
| `color` | `string` | ✓ | キャラクター色（16 進数） |
| `active_image_index` | `number` | ✓ | 現在表示中の画像インデックス（0 ～） |
| `statuses` | `PieceStatus[]` | ✓ | ステータス配列（HP, MP など） |
| `parameters` | `CharacterParameter[]` | ✓ | パラメータ配列（力, 敏捷性など） |
| `is_hidden_on_board` | `boolean` | ✓ | ボード上で非表示か |
| `sort_order` | `number` | - | キャラクターパネル内での並び順 |
| `on_board` | `boolean` | - | ボード上に配置されているか |
| `board_x` | `number` | - | ボード上の X 座標 |
| `board_y` | `number` | - | ボード上の Y 座標（足元基準） |
| `board_height` | `number` | - | ボード上の表示高さ |
| `board_visible` | `boolean` | - | ボード上で表示か |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内キャラクター一覧）

**制約・バリデーション**:
- `active_image_index >= 0` かつ `characters_base.images` の配列長以下
- `sort_order >= 0`（定義されている場合）
- `board_y` は足元基準（size 変更時に自動調整不要）

**関連**:
- `characters_base.id` → `characters_stats.id`（1:1 の補足情報）
- `owner_id` → `users._id`（キャラクター所有者）

---

### 6. characters_base

**概要**: キャラクター基本情報（画像、メモ、シートリンク）。キャラクター設定の詳細。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"characters_base">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | キャラクター識別子（`characters_stats.id` と同一） |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `images` | `CharacterImage[]` | ✓ | 画像配列（`{ url, label }` ） |
| `memo` | `string` | ✓ | GM メモ（全員表示） |
| `secret_memo` | `string` | ✓ | 秘密メモ（GM のみ表示） |
| `chat_palette` | `string` | ✓ | チャットパレット（定型文） |
| `sheet_url` | `string \| null` | ✓ | キャラクターシート外部 URL |
| `initiative` | `number` | ✓ | イニシアティブ（デフォルト） |
| `size` | `number` | ✓ | サイズ係数（ボード表示スケール） |
| `is_status_private` | `boolean` | ✓ | ステータスを秘密にするか |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内キャラクター基本情報一覧）

**制約・バリデーション**:
- `images.length >= 1`（最低 1 つの画像が必須）
- `images[].url` は有効な URL
- `size > 0`
- `initiative >= 0`

**関連**:
- `characters_stats.id` → `characters_base.id`（1:1 対応）
- `room_id` → `rooms.id`

---

### 7. objects

**概要**: 統合オブジェクト。パネル、テキスト、前景・背景、キャラクターレイヤーを一つのテーブルで管理。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"objects">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | オブジェクト識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `type` | `'panel' \| 'text' \| 'foreground' \| 'background' \| 'characters_layer'` | ✓ | オブジェクトタイプ |
| `name` | `string` | ✓ | オブジェクト名 |
| `global` | `boolean` | ✓ | グローバル（全シーン共通）か |
| `scene_ids` | `string[]` | ✓ | 表示対象シーン ID 配列（global=false なら複数可） |
| `x` | `number` | ✓ | X 座標（グリッド単位） |
| `y` | `number` | ✓ | Y 座標（グリッド単位） |
| `width` | `number` | ✓ | 幅（グリッド単位） |
| `height` | `number` | ✓ | 高さ（グリッド単位） |
| `visible` | `boolean` | ✓ | 表示可視性 |
| `opacity` | `number` | ✓ | 透明度（0.0 ～ 1.0） |
| `sort_order` | `number` | ✓ | Z オーダー（重ね順） |
| `position_locked` | `boolean` | ✓ | 位置ロック |
| `size_locked` | `boolean` | ✓ | サイズロック |
| `image_url` | `string \| null` | ✓ | 画像 URL（panel 用） |
| `image_asset_id` | `string \| null` | ✓ | アセット ID（R2 参照用） |
| `background_color` | `string` | ✓ | 背景色（16 進数） |
| `image_fit` | `'contain' \| 'cover' \| 'stretch'` | ✓ | 画像フィッティング |
| `text_content` | `string \| null` | ✓ | テキスト内容（text 型用） |
| `font_size` | `number` | ✓ | フォントサイズ（ピクセル） |
| `font_family` | `string` | ✓ | フォントファミリー |
| `letter_spacing` | `number` | ✓ | 文字間隔 |
| `line_height` | `number` | ✓ | 行間隔 |
| `auto_size` | `boolean` | ✓ | テキスト自動サイジング |
| `text_align` | `'left' \| 'center' \| 'right'` | ✓ | 水平テキスト配置 |
| `text_vertical_align` | `'top' \| 'middle' \| 'bottom'` | ✓ | 垂直テキスト配置 |
| `text_color` | `string` | ✓ | テキスト色（16 進数） |
| `scale_x` | `number` | ✓ | X スケール（1.0 = 100%） |
| `scale_y` | `number` | ✓ | Y スケール（1.0 = 100%） |
| `memo` | `string` | - | オブジェクト固有メモ |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内全オブジェクト）

**制約・バリデーション**:
- `opacity`: 0.0 ～ 1.0
- `sort_order`: 非負数
- `global=true` なら `scene_ids` は空配列（全シーンで表示）
- `global=false` なら `scene_ids.length >= 1`
- `type` ごとに必須フィールド：
  - `panel`: `image_url` または `image_asset_id` が必須
  - `text`: `text_content` が必須
  - `foreground`, `background`: `image_url` が必須
  - `characters_layer`: 画像フィールド不要
- 更新権限は `room_members.role` が `'sub_owner'` 以上のユーザーのみ

**関連**:
- `room_id` → `rooms.id`
- `scene_ids[]` → `scenes.id`（複数シーン対応）
- `image_asset_id` → `assets.id`（R2 アセット参照）

---

### 8. messages

**概要**: チャットメッセージ。ダイス結果、システムメッセージも含む。秘密メッセージ対応。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"messages">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | メッセージ識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `sender_name` | `string` | ✓ | 送信者表示名 |
| `sender_uid` | `string \| null` | ✓ | 送信者ユーザー ID |
| `sender_avatar` | `string \| null` | ✓ | 送信者アバター URL |
| `sender_color` | `string` | - | 送信者色（旧互換フィールド） |
| `content` | `string` | ✓ | メッセージ本文 |
| `message_type` | `'chat' \| 'dice' \| 'system'` | ✓ | メッセージタイプ |
| `channel` | `string` | - | チャットチャネル ID |
| `allowed_user_ids` | `string[]` | - | 秘密メッセージ（許可ユーザー ID 配列）。空でなければ許可ユーザーのみ表示 |
| `created_at` | `number` | ✓ | 送信タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内メッセージ一覧）
- `by_room_time`: `["room_id", "created_at"]`（時系列ソート）

**制約・バリデーション**:
- `message_type` ごとの content 形式:
  - `'chat'`: 自由テキスト
  - `'dice'`: ダイスロール記法 + 結果
  - `'system'`: システムイベント
- `allowed_user_ids.length > 0` ならば秘密メッセージ（未認証・許可されていないユーザーには非表示）
- クエリ時は最新 100 件を返す

**関連**:
- `room_id` → `rooms.id`
- `sender_uid` → `users._id`
- `channel` → `channels.channel_id`
- `allowed_user_ids[]` → `users._id`

---

### 9. bgms

**概要**: BGM トラック。YouTube / URL / アップロード対応。複数シーン割当、自動再生、フェード効果。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"bgms">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | BGM トラック識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `name` | `string` | ✓ | トラック名 |
| `bgm_type` | `'youtube' \| 'url' \| 'upload' \| null` | ✓ | ソースタイプ |
| `bgm_source` | `string \| null` | ✓ | ソース URL または ID |
| `bgm_volume` | `number` | ✓ | 音量（0.0 ～ 1.0） |
| `bgm_loop` | `boolean` | ✓ | ループ再生 |
| `scene_ids` | `string[]` | ✓ | 割当シーン ID 配列 |
| `is_playing` | `boolean` | ✓ | 再生中か |
| `is_paused` | `boolean` | ✓ | 一時停止中か |
| `auto_play_scene_ids` | `string[]` | ✓ | 自動再生対象シーン ID 配列 |
| `fade_in` | `boolean` | ✓ | フェードイン有効か |
| `fade_in_duration` | `number` | - | フェードイン時間（ミリ秒） |
| `fade_out` | `boolean` | - | フェードアウト有効か |
| `fade_duration` | `number` | - | フェード時間（ミリ秒） |
| `sort_order` | `number` | - | BGM リスト内での並び順 |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内 BGM 一覧）

**制約・バリデーション**:
- `bgm_volume`: 0.0 ～ 1.0
- `bgm_type` が null の場合、`bgm_source` も null
- `scene_ids.length >= 0`（空でも良い、割当なしを示す）
- `is_playing=true` かつ `is_paused=true` は通常起こらない（前段階で制御）
- `sort_order >= 0`

**関連**:
- `room_id` → `rooms.id`
- `scene_ids[]` → `scenes.id`
- `auto_play_scene_ids[]` → `scenes.id`

---

### 10. cutins

**概要**: カットイン（演出画像＋テキスト）。スライド、フェード、ズームアニメーション対応。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"cutins">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | カットイン識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `name` | `string` | ✓ | カットイン名 |
| `image_url` | `string \| null` | ✓ | 画像 URL |
| `text` | `string` | ✓ | 表示テキスト |
| `animation` | `'slide' \| 'fade' \| 'zoom'` | ✓ | アニメーションタイプ |
| `duration` | `number` | ✓ | 表示時間（ミリ秒） |
| `text_color` | `string` | ✓ | テキスト色（16 進数） |
| `background_color` | `string` | ✓ | 背景色（16 進数） |
| `sort_order` | `number` | ✓ | カットインリスト内での並び順 |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内カットイン一覧）

**制約・バリデーション**:
- `duration > 0`
- `sort_order >= 0`
- `animation` の値は定義済みのみ
- `text_color`, `background_color` は有効な 16 進数カラーコード

**関連**:
- `room_id` → `rooms.id`
- `rooms.active_cutin.cutin_id` → `cutins.id`（現在表示中のカットイン）

---

### 11. scenario_texts

**概要**: シナリオテキスト（演出や説明文）。チャネル別に整理可能。キャラクター発話対応。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"scenario_texts">` | ✓ | Convex ドキュメント ID |
| `id` | `string` | ✓ | シナリオテキスト識別子 |
| `room_id` | `string` | ✓ | 所属ルーム ID |
| `title` | `string` | ✓ | タイトル |
| `content` | `string` | ✓ | テキスト内容 |
| `visible` | `boolean` | ✓ | 表示中か |
| `speaker_character_id` | `string \| null` | - | 発話キャラクター ID |
| `speaker_name` | `string \| null` | - | 発話者名（キャラクター指定なし時） |
| `channel_id` | `string \| null` | - | 割当チャネル ID |
| `sort_order` | `number` | ✓ | リスト内での並び順 |
| `created_at` | `number` | ✓ | 作成タイムスタンプ |
| `updated_at` | `number` | ✓ | 最終更新タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内シナリオテキスト一覧）

**制約・バリデーション**:
- `sort_order >= 0`
- `speaker_character_id` と `speaker_name` は同時に指定可（character_id 優先）
- `title` は非空

**関連**:
- `room_id` → `rooms.id`
- `speaker_character_id` → `characters_stats.id`（キャラクター発話）
- `channel_id` → `channels.channel_id`（チャネル割当）

---

### 12. room_members

**概要**: ルームメンバーシップ管理。ロールベースアクセス制御（RBAC）。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"room_members">` | ✓ | Convex ドキュメント ID |
| `room_id` | `string` | ✓ | ルーム ID |
| `user_id` | `string` | ✓ | ユーザー ID |
| `role` | `'owner' \| 'sub_owner' \| 'user' \| 'guest'` | ✓ | ロール |
| `joined_at` | `number` | ✓ | 参加タイムスタンプ |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内メンバー一覧）
- `by_room_user`: `["room_id", "user_id"]`（特定ユーザーのロール確認）
- `by_user`: `["user_id"]`（ユーザーが参加するルーム一覧）

**制約・バリデーション**:
- (room_id, user_id) の組み合わせは一意（重複メンバーシップ禁止）
- ロール階層（権限の強い順）: owner > sub_owner > user > guest
- owner は 1 名のみ（最初のオーナーは rooms.owner_id）
- 各ロールが実行可能な操作:
  - `'owner'`: 全操作（ルーム削除も含む）
  - `'sub_owner'`: シーン・オブジェクト・BGM 管理
  - `'user'`: メッセージ送信、キャラクター管理
  - `'guest'`: 閲覧のみ（メッセージ送信・リソース編集不可）

**関連**:
- `room_id` → `rooms.id`
- `user_id` → `users._id`

---

### 13. channels

**概要**: チャットチャネル。複数チャネルでメッセージ整理。アーカイブ機能。権限管理。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `_id` | `Id<"channels">` | ✓ | Convex ドキュメント ID |
| `room_id` | `string` | ✓ | ルーム ID |
| `channel_id` | `string` | ✓ | チャネル識別子（ユーザー指定） |
| `label` | `string` | ✓ | チャネル表示名 |
| `order` | `number` | ✓ | チャネルリスト内での並び順 |
| `is_archived` | `boolean` | ✓ | アーカイブ状態か |
| `allowed_user_ids` | `string[]` | ✓ | アクセス許可ユーザー ID 配列（空 = 全員） |

**インデックス**:
- `by_room`: `["room_id"]`（ルーム内チャネル一覧）
- `by_room_channel`: `["room_id", "channel_id"]`（特定チャネル取得）

**制約・バリデーション**:
- `order >= 0`
- (room_id, channel_id) の組み合わせは一意
- `allowed_user_ids` が空の場合、全員がアクセス可

**関連**:
- `room_id` → `rooms.id`
- `allowed_user_ids[]` → `users._id`
- `messages.channel` → `channels.channel_id`
- `scenario_texts.channel_id` → `channels.channel_id`

---

## エンティティ関連図（ER 図）

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Adrastea Data Model                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │
│──────────────│
│ _id (PK)     │
│ email        │ (unique)
│ name         │
│ image        │
│ onboarded    │
└──────────────┘
       │
       │ 1:N owns
       └──────────────────┐
                          │
                    ┌──────────────────┐
                    │     rooms        │
                    │──────────────────│
                    │ _id (PK)         │
                    │ id (unique)      │
                    │ owner_id (FK)    │
                    │ name             │
                    │ active_scene_id  │
                    │ foreground_url   │
                    │ active_cutin     │
                    │ dice_system      │
                    │ gm_can_see_..    │
                    │ created_at       │
                    │ updated_at       │
                    └──────────────────┘
                       │   │   │   │   │
         ┌─────────────┼───┼───┼───┼───┼────────┐
         │             │   │   │   │   │        │
      1:N contains  1:N │   │   │   │ 1:N  1:N │
         │             │   │   │   │        │  │
    ┌────────┐   ┌──────────┐  │  ┌──────────┐ │
    │ scenes │   │ objects  │  │  │  pieces  │ │
    ├────────┤   ├──────────┤  │  ├──────────┤ │
    │ id (PK)    │ id (PK)  │  │  │ id (PK)  │ │
    │ room_id    │ room_id  │  │  │ room_id  │ │
    │ name       │ type     │  │  │ label    │ │
    │ bg_url     │ global   │  │  │ x, y, w, h
    │ fg_url     │ scene_ids│  │  │ z_index  │ │
    │ fg_opacity │ x, y, w, h  │  │ initiative
    │ bg/fg_tran │ visible  │  │  │ color    │ │
    │ bg_blur    │ opacity  │  │  │ statuses │ │
    │ grid_vis   │ image_url│  │  │ memo     │ │
    │ sort_order │ text_... │  │  │ char_id  │ │
    │ created_at │ created_at  │  │ created_at
    └────────┘   └──────────┘  │  └──────────┘ │
       │              │         │       │       │
       │     N:M      │         │ 0:1   │       │
       └──────────────┘    references  │       │
                           │           │       │
        ┌──────────────────┴──────────────────┐
        │                                     │
    ┌────────────────┐            ┌─────────────────┐
    │ characters_    │            │  characters_    │
    │    stats       │ 1:1 pairs  │     base        │
    ├────────────────┤────────────├─────────────────┤
    │ id (PK)        │            │ id (PK)         │
    │ room_id        │            │ room_id         │
    │ owner_id (FK)  │            │ images[]        │
    │ name           │            │ memo            │
    │ color          │            │ secret_memo     │
    │ active_image   │            │ chat_palette    │
    │ statuses[]     │            │ sheet_url       │
    │ parameters[]   │            │ initiative      │
    │ is_hidden...   │            │ size            │
    │ is_speech...   │            │ is_status_priv. │
    │ board_x, y, h  │            └─────────────────┘
    │ board_visible  │
    │ created_at     │
    └────────────────┘

┌──────────────┐         ┌──────────────┐
│     bgms     │         │    cutins    │
├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │
│ room_id (FK) │         │ room_id (FK) │
│ name         │         │ name         │
│ bgm_type     │         │ image_url    │
│ bgm_source   │         │ text         │
│ bgm_volume   │         │ animation    │
│ bgm_loop     │         │ duration     │
│ scene_ids[]  │         │ text_color   │
│ is_playing   │         │ bg_color     │
│ is_paused    │         │ sort_order   │
│ auto_play... │         │ created_at   │
│ fade_in/out  │         │ updated_at   │
│ sort_order   │         └──────────────┘
│ created_at   │              │
│ updated_at   │              │ active
└──────────────┘              │ on rooms
       │                      │
       │ N:M                  │ 0:1
       │ assigned             │
       └──────────┬───────────┘
                  │
           ┌──────────────┐
           │   messages   │
           ├──────────────┤
           │ id (PK)      │
           │ room_id (FK) │
           │ sender_name  │
           │ sender_uid   │
           │ sender_avatar│
           │ content      │
           │ msg_type     │
           │ channel      │
           │ allowed_..   │
           │ created_at   │
           └──────────────┘
                  │
                  │ N:1 in
                  │
           ┌──────────────┐
           │   channels   │
           ├──────────────┤
           │ room_id      │
           │ channel_id   │
           │ label        │
           │ order        │
           │ is_archived  │
           │ allowed_..   │
           └──────────────┘

┌──────────────────┐
│ scenario_texts   │
├──────────────────┤
│ id (PK)          │
│ room_id (FK)     │
│ title            │
│ content          │
│ visible          │
│ speaker_char_id  │
│ speaker_name     │
│ channel_id       │
│ sort_order       │
│ created_at       │
│ updated_at       │
└──────────────────┘
        │
        └─ references characters_stats
        └─ references channels

┌──────────────────┐
│  room_members    │
├──────────────────┤
│ room_id (PK,FK)  │
│ user_id (PK,FK)  │
│ role             │
│ joined_at        │
└──────────────────┘
        │
        ├─ N:1 to rooms
        └─ N:1 to users

(assets テーブルは参考用ツール側で管理)
```

---

## 設計ノート

### マルチシーン対応

`objects` と `bgms` の `scene_ids` フィールドにより、複数シーンに同じオブジェクト・BGM を割り当て可能。`global=true` の場合は `scene_ids` を空配列で統一される。

### キャラクター設計

`characters_stats` と `characters_base` の 2 テーブル分割：
- **分離の理由**: ボード上の表示・配置（stats）と、キャラクター詳細情報（base）の更新頻度と構造が異なる
- **1:1 対応**: `id` フィールドで統合されるため、クライアント側で両テーブルを一緒に扱う必要がある

### 権限管理

すべてのミューテーション（scenes, objects, messages など）で `room_members` テーブルを参照し、ロール階層を確認：
- `'owner'` / `'sub_owner'`: 盤面操作（シーン・オブジェクト管理）
- `'user'` / `'guest'`: 閲覧・メッセージ送受信

### インデックス戦略

各テーブルは以下のインデックスを定義：
- `by_room`: room_id での一括取得（最頻出）
- `by_room_order`: room_id + sort_order での順序取得（scenes, objects）
- `by_room_time`: room_id + created_at での時系列取得（messages）
- `by_room_user`: room_id + user_id での権限確認（room_members）
- `by_user`: user_id での横断検索（room_members）
- `by_owner`: owner_id での所有者検索（rooms）

---

## マイグレーション・互換性ノート

### 既知の互換フィールド

- `messages.sender_color`: 旧設計の互換フィールド。新規では使用しない

### 将来の統合予定

- `pieces` テーブルは非推奨。新規キャラクター・コマはすべて `characters_stats` で管理される。旧 pieces の段階的廃止が計画中

---

## 参考資料

- **スキーマ定義**: `convex/schema.ts`
- **ミューテーション**: `convex/rooms.ts`, `convex/scenes.ts`, `convex/characters.ts`, `convex/objects.ts`, `convex/messages.ts` など
- **型定義**: `src/types/adrastea.types.ts`

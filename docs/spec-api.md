# Convex API仕様書 — Adrastea

TRPG盤面共有ツール「Adrastea」のConvex APIの完全仕様です。

## 認証・権限体系

### 認証方式

Convex Authを使用しており、以下のプロバイダーをサポートしています。

- Google OAuth（ユーザー認証）
- 匿名ログイン（ゲスト）

### ロール階層

ルーム内ではロール階層が定義されており、低←→高の順序は以下の通りです。

```
guest < user < sub_owner < owner
```

各ロールの説明:
- owner: ルーム作成者。ルーム全体の設定変更・削除が可能。メンバー権限管理も可能。
- sub_owner: GM相当。シーン・オブジェクト・BGMなどの編集が可能。ユーザー権限では編集できないリソースの操作が可能。
- user: プレイヤー相当。自分のキャラクターの編集、メッセージ送信、オブジェクト移動などが可能。
- guest: 閲覧のみ。メッセージ送信やリソース編集はできない。

### ロール判定関数

#### getRole(ctx, roomId): Promise\<RoomRole\>

指定ルームにおける現在のユーザーのロールを取得します。

```typescript
const role = await getRole(ctx, roomId);
// guest, user, sub_owner, owner のいずれかを返す
```

- 認証していないユーザー → guest
- room_members テーブルに登録がない → guest
- room_members に登録がある → 登録されたロール

#### assertMinRole(role: RoomRole, required: RoomRole): void

呼び出し元のロールが要求ロール以上であることを確認します。

```typescript
assertMinRole(role, 'sub_owner'); // sub_owner以上ならOK、user以下ならエラー
```

エラー時：`Permission denied: requires {required}, got {role}`

### ユーザーID抽出

#### getUserId(identity): string

Convex Auth の identity.subject からセッションIDを除いたユーザーIDを取得します。

```typescript
const userId = getUserId(identity);
// identity.subject = "user_123abc|session_xyz" → "user_123abc"
```

---

## API モジュール

### rooms.ts — ルーム管理

#### query: list

自分が所有しているルーム一覧を取得します。

```typescript
export const list = query({
  args: {},
  handler: async (ctx) => { ... }
});
```

- **認証要件**: 必須（owner_id で自分のルームのみ取得）
- **戻り値**: Room[]
- **説明**: 現在のユーザーが owner_id に指定しているルーム（owner ロール）を全て返す

#### query: get

ルームIDで特定ルームを取得します。

```typescript
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **引数**: id: ルームID
- **戻り値**: Room | null
- **認可要件**: なし（誰でも取得可能。ゲストも含む）
- **説明**: ルーム基本情報（名前、active_scene_id、foreground_url等）を返す

#### mutation: create

新規ルームを作成します。作成者は owner として room_members に登録されます。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    dice_system: v.string(),
    gm_can_see_secret_memo: v.boolean(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **引数**:
  - id: ルームID（クライアント側で生成）
  - name: ルーム名
  - dice_system: ダイスシステム名（D&D 5e, Pathfinder等）
  - gm_can_see_secret_memo: GMが秘密メモを見えるか
- **戻り値**: 作成されたRoom
- **認証要件**: 必須
- **副作用**:
  - rooms テーブルに新規レコード挿入
  - room_members に owner エントリを挿入
  - created_at, updated_at = Date.now()

#### mutation: update

ルーム情報を更新します（owner のみ）。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    active_scene_id: v.optional(v.union(v.string(), v.null())),
    foreground_url: v.optional(v.union(v.string(), v.null())),
    active_cutin: v.optional({ cutin_id: v.string(), triggered_at: v.number() } | null),
    dice_system: v.optional(v.string()),
    gm_can_see_secret_memo: v.optional(v.boolean()),
    default_login_role: v.optional('sub_owner' | 'user' | 'guest'),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: owner は全フィールド更新可。sub_owner は `active_scene_id`, `foreground_url`, `active_cutin` のみ更新可。user/guest は更新不可。
- **戻り値**: 更新後のRoom
- **バリデーション**: owner チェック（403: Not authorized）

#### mutation: remove

ルームを削除します（owner のみ）。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: owner
- **戻り値**: { success: true }
- **副作用**: ルーム本体のみ削除（子リソースは削除しない）

---

### scenes.ts — シーン管理

各シーンは room に紐付いており、背景・前景レイヤーと背景色、トランジション効果を持ちます。

#### query: list

ルーム内のシーン一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: なし
- **戻り値**: Scene[]
- **説明**: room_id でフィルタリングし、sort_order でソート

#### mutation: create

新規シーンを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    background_url: v.union(v.string(), v.null()),
    foreground_url: v.union(v.string(), v.null()),
    foreground_opacity: v.number(),
    bg_transition: 'none' | 'fade',
    bg_transition_duration: v.number(),
    fg_transition: 'none' | 'fade',
    fg_transition_duration: v.number(),
    bg_blur: v.boolean(),
    grid_visible: v.optional(v.boolean()),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **バリデーション**: room_id で getRole チェック

#### mutation: update

シーン情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    background_url: v.optional(v.union(v.string(), v.null())),
    foreground_url: v.optional(v.union(v.string(), v.null())),
    // ... その他フィールド ...
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: remove

シーンを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: reorder

複数シーンの sort_order を一括更新します。

```typescript
export const reorder = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **説明**: updates の最初のドキュメントの room_id で認可チェック（複数ルームの混在は許さない）

---

### pieces.ts — コマ（ゲーム盤上のキャラクター/モンスター）

#### query: list

ルーム内のコマ一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: Piece[]

#### mutation: create

新規コマを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    image_url: v.union(v.string(), v.null()),
    label: v.string(),
    color: v.string(),
    z_index: v.number(),
    statuses: v.array(v.object({
      label: v.string(),
      value: v.number(),
      max: v.number(),
      color: v.optional(v.string()),
    })),
    initiative: v.number(),
    memo: v.string(),
    character_id: v.union(v.string(), v.null()),
    created_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: update

コマ情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    // ... その他フィールド ...
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: user 以上（プレイヤーもコマを移動できる）

#### mutation: remove

コマを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

---

### characters.ts — キャラクター管理

キャラクター情報は characters_stats（動的情報）と characters_base（固定情報）の2つのテーブルに分割されています。

#### query: listStats

ルーム内のキャラクター統計情報を取得します。

```typescript
export const listStats = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: CharacterStats[]

#### query: listBase

ルーム内のキャラクター基本情報を取得します。

```typescript
export const listBase = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: CharacterBase[]

#### query: getBase

特定キャラクターの基本情報を取得します。

```typescript
export const getBase = query({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: CharacterBase | null

#### mutation: create

新規キャラクターを作成します。characters_stats と characters_base に同時に挿入されます。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    owner_id: v.string(), // キャラクターの所有者
    name: v.string(),
    images: v.array(v.object({ url: v.string(), label: v.string() })),
    active_image_index: v.number(),
    color: v.string(),
    sheet_url: v.union(v.string(), v.null()),
    initiative: v.number(),
    size: v.number(),
    statuses: v.array(...),
    parameters: v.array(...),
    memo: v.string(),
    secret_memo: v.string(),
    chat_palette: v.string(),
    is_status_private: v.boolean(),
    is_hidden_on_board: v.boolean(),
    sort_order: v.number(),
    on_board: v.optional(v.boolean()),
    board_x: v.optional(v.number()),
    board_y: v.optional(v.number()),
    board_height: v.optional(v.number()),
    board_visible: v.optional(v.boolean()),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: user 以上
- **副作用**: characters_stats と characters_base の両テーブルに挿入

#### mutation: updateStats

キャラクター統計情報を更新します。

```typescript
export const updateStats = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    active_image_index: v.optional(v.number()),
    statuses: v.optional(v.array(...)),
    parameters: v.optional(v.array(...)),
    is_hidden_on_board: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
    on_board: v.optional(v.boolean()),
    board_x: v.optional(v.number()),
    board_y: v.optional(v.number()),
    board_height: v.optional(v.number()),
    board_visible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner は常に編集可。user は自分のキャラクター（owner_id == userId）のみ編集可。
- **バリデーション**: user が他人のキャラを編集しようとすると 403 "Permission denied: can only edit own character"

#### mutation: moveStats

キャラクターをボード上で移動します。

```typescript
export const moveStats = mutation({
  args: {
    id: v.string(),
    board_x: v.optional(v.number()),
    board_y: v.optional(v.number()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: user 以上
- **説明**: 誰のキャラでも移動できる（moveStats は owner_id チェックなし）

#### mutation: updateBase

キャラクター基本情報を更新します。

```typescript
export const updateBase = mutation({
  args: {
    id: v.string(),
    images: v.optional(v.array(...)),
    memo: v.optional(v.string()),
    secret_memo: v.optional(v.string()),
    chat_palette: v.optional(v.string()),
    sheet_url: v.optional(v.union(v.string(), v.null())),
    initiative: v.optional(v.number()),
    size: v.optional(v.number()),
    is_status_private: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner は常に編集可。user は自分のキャラのみ編集可。

#### mutation: remove

キャラクターを削除します（characters_stats と characters_base の両方から削除）。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner は常に削除可。user は自分のキャラのみ削除可。

---

### objects.ts — オブジェクト（盤面要素：テキスト、画像、背景等）

#### query: list

ルーム内のオブジェクト一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: BoardObject[]

#### mutation: create

新規オブジェクトを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    type: 'panel' | 'text' | 'foreground' | 'background' | 'characters_layer',
    name: v.string(),
    global: v.boolean(),
    scene_ids: v.array(v.string()),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    visible: v.boolean(),
    opacity: v.number(),
    sort_order: v.number(),
    position_locked: v.boolean(),
    size_locked: v.boolean(),
    image_url: v.union(v.string(), v.null()),
    image_asset_id: v.union(v.string(), v.null()),
    background_color: v.string(),
    image_fit: 'contain' | 'cover' | 'stretch',
    text_content: v.union(v.string(), v.null()),
    font_size: v.number(),
    font_family: v.string(),
    letter_spacing: v.number(),
    line_height: v.number(),
    auto_size: v.boolean(),
    text_align: 'left' | 'center' | 'right',
    text_vertical_align: 'top' | 'middle' | 'bottom',
    text_color: v.string(),
    scale_x: v.number(),
    scale_y: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: createBatch

複数のオブジェクトを一括作成します。

```typescript
export const createBatch = mutation({
  args: {
    objects: v.array(v.object({ ... })), // create と同じスキーマ
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **説明**: 最初のオブジェクトの room_id で認可チェック

#### mutation: update

オブジェクト情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    global: v.optional(v.boolean()),
    scene_ids: v.optional(v.array(v.string())),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    // ... その他フィールド ...
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: user 以上

#### mutation: remove

オブジェクトを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: reorder

複数オブジェクトの sort_order を一括更新します。

```typescript
export const reorder = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: batchUpdateSort

複数オブジェクトの sort_order を一括更新します（reorder のエイリアス）。

```typescript
export const batchUpdateSort = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort: v.number() })),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

---

### bgms.ts — BGM管理

#### query: list

ルーム内のBGM一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: BGM[]

#### mutation: create

新規BGMを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    bgm_type: 'youtube' | 'url' | 'upload' | null,
    bgm_source: v.union(v.string(), v.null()),
    bgm_volume: v.number(),
    bgm_loop: v.boolean(),
    scene_ids: v.array(v.string()),
    is_playing: v.boolean(),
    is_paused: v.boolean(),
    auto_play_scene_ids: v.array(v.string()),
    fade_in: v.boolean(),
    fade_in_duration: v.optional(v.number()),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **バリデーション**:
  - bgm_volume: [0, 1] に clamp
  - sort_order: >= 0
  - fade_in_duration: >= 0

#### mutation: update

BGM情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    bgm_type: v.optional(...),
    bgm_source: v.optional(...),
    bgm_volume: v.optional(v.number()),
    bgm_loop: v.optional(v.boolean()),
    scene_ids: v.optional(v.array(v.string())),
    is_playing: v.optional(v.boolean()),
    is_paused: v.optional(v.boolean()),
    auto_play_scene_ids: v.optional(v.array(v.string())),
    fade_in: v.optional(v.boolean()),
    fade_in_duration: v.optional(v.number()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **バリデーション**: create と同じ

#### mutation: remove

BGMを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

---

### cutins.ts — カットイン（演出）管理

#### query: list

ルーム内のカットイン一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: Cutin[]

#### mutation: create

新規カットインを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    image_url: v.union(v.string(), v.null()),
    text: v.string(),
    animation: 'slide' | 'fade' | 'zoom',
    duration: v.number(),
    text_color: v.string(),
    background_color: v.string(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: update

カットイン情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    image_url: v.optional(...),
    text: v.optional(v.string()),
    animation: v.optional(...),
    duration: v.optional(v.number()),
    text_color: v.optional(v.string()),
    background_color: v.optional(v.string()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: remove

カットインを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: reorder

複数カットインの sort_order を一括更新します。

```typescript
export const reorder = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

---

### scenario_texts.ts — シナリオテキスト管理

#### query: list

ルーム内のシナリオテキスト一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: 必須（重要：認証していないと取得できない）
- **戻り値**: ScenarioText[]

#### mutation: create

新規シナリオテキストを作成します。

```typescript
export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    title: v.string(),
    content: v.string(),
    visible: v.boolean(),
    sort_order: v.number(),
    speaker_character_id: v.optional(...),
    speaker_name: v.optional(...),
    channel_id: v.optional(...),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **バリデーション**: sort_order >= 0

#### mutation: update

シナリオテキスト情報を更新します。

```typescript
export const update = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
    speaker_character_id: v.optional(...),
    speaker_name: v.optional(...),
    channel_id: v.optional(...),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: remove

シナリオテキストを削除します。

```typescript
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

#### mutation: reorder

複数シナリオテキストの sort_order を一括更新します。

```typescript
export const reorder = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上
- **説明**: 複数ドキュメント間で room_id の一貫性を検証。異なるルーム間での操作は 400 "Cannot reorder documents across different rooms"

---

### messages.ts — メッセージ（チャット）管理

#### query: list

ルーム内のメッセージ一覧を取得します。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: Message[]（最新100件を逆時系列で返す）
- **説明**: allowed_user_ids が設定されているメッセージ（秘密メッセージ）は、当該ユーザーのみ表示

#### mutation: send

ルームにメッセージを送信します。

```typescript
export const send = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    sender_name: v.string(),
    content: v.string(),
    message_type: 'chat' | 'dice' | 'system',
    sender_uid: v.optional(v.string()),
    sender_avatar: v.optional(...),
    channel: v.optional(v.string()),
    allowed_user_ids: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: user 以上
- **副作用**:
  - messages テーブルに挿入
  - メッセージ数が300件超えたら scheduler.runAfter でアーカイブ処理をスケジュール
- **戻り値**: 作成されたMessage

#### internalAction: archive

メッセージ自動アーカイブ（300件超えた時に自動呼び出し）。

```typescript
export const archive = internalAction({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **説明**:
  1. 全メッセージを created_at asc で取得
  2. 最新100件を残し、古い方をアーカイブ対象に
  3. Worker に POST でバッチ送信
  4. 成功したら Convex から削除

#### mutation: clearByRoom

ルーム内の全メッセージを削除します。

```typescript
export const clearByRoom = mutation({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: sub_owner 以上

---

### room_members.ts — ルームメンバー管理

#### query: getMyRole

指定ルームにおける自分のロールを取得します。

```typescript
export const getMyRole = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **戻り値**: RoomRole（'guest' | 'user' | 'sub_owner' | 'owner'）

#### mutation: join

ルームに参加します（既に参加している場合はロール修正）。

```typescript
export const join = mutation({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: 必須
- **戻り値**: { role: RoomRole }
- **説明**:
  - 既に参加済み → 既存ロールを返す
  - 新規参加 → room.default_login_role で登録（owner は owner、それ以外は user）
  - owner のエントリが user になっていた場合は修正

#### mutation: assignRole

メンバーにロールを割り当てます（owner のみ）。

```typescript
export const assignRole = mutation({
  args: {
    room_id: v.string(),
    target_user_id: v.string(),
    role: 'sub_owner' | 'user' | 'guest',
  },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: owner
- **バリデーション**: owner ロール自体は変更不可

#### query: getMembers

ルームのメンバー一覧を取得します（owner のみ）。

```typescript
export const getMembers = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: owner
- **戻り値**: Array\<{ user_id, role, joined_at, display_name, avatar_url }\>

---

### users.ts — ユーザー管理

#### query: viewer

現在ログインしているユーザーのIDを取得します。

```typescript
export const viewer = query({
  args: {},
  handler: async (ctx) => { ... }
});
```

- **戻り値**: { id: string } | null
- **説明**: 未認証なら null

#### query: getMe

現在ユーザーの詳細情報を取得します。

```typescript
export const getMe = query({
  args: {},
  handler: async (ctx) => { ... }
});
```

- **戻り値**: { id, name, image, onboarded } | null

#### mutation: updateMe

ユーザー情報を更新します。

```typescript
export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(...),
  },
  handler: async (ctx, args) => { ... }
});
```

- **副作用**: onboarded = true に自動設定

#### mutation: completeOnboarding

オンボーディング完了フラグを設定します。

```typescript
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => { ... }
});
```

---

### channels.ts — チャットチャネル管理

#### query: list

ルーム内のチャネル一覧を取得します（権限に応じてフィルタリング）。

```typescript
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: 必須
- **戻り値**: Channel[]
- **説明**: allowed_user_ids が空配列 → 全員に表示。空でない場合 → 含まれるユーザーのみ表示

#### mutation: upsert

チャネルを作成または更新します。

```typescript
export const upsert = mutation({
  args: {
    room_id: v.string(),
    channel_id: v.string(),
    label: v.string(),
    order: v.number(),
    is_archived: v.boolean(),
    allowed_user_ids: v.array(v.string()),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: 必須
- **説明**: 既存レコード有り → 更新、なし → 新規作成

#### mutation: remove

チャネルを削除します。

```typescript
export const remove = mutation({
  args: {
    room_id: v.string(),
    channel_id: v.string(),
  },
  handler: async (ctx, args) => { ... }
});
```

- **認証要件**: 必須
- **バリデーション**: RESERVED_CHANNEL_IDS（'main', 'info', 'other'）は削除禁止

---

### admin.ts — 管理者機能

管理者はプロセス環境変数 ADMIN_USER_IDS（カンマ区切り）で指定されたユーザーIDです。

#### query: listAllRooms

全ルーム一覧を取得します（管理者専用）。

```typescript
export const listAllRooms = query({
  args: {},
  handler: async (ctx) => { ... }
});
```

- **認可要件**: 管理者のみ
- **戻り値**: Array\<Room & { ownerInfo: { name, image } }\>

#### mutation: deleteRoom

ルームを完全削除します（管理者専用）。

```typescript
export const deleteRoom = mutation({
  args: { roomId: v.string() },
  handler: async (ctx, args) => { ... }
});
```

- **認可要件**: 管理者のみ
- **副作用**: ルームと関連する全データ（scenes, pieces, characters, objects, bgms, cutins, messages, room_members）を削除

#### query: isCurrentUserAdmin

現在のユーザーが管理者かどうかを確認します。

```typescript
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => { ... }
});
```

- **戻り値**: boolean

---

## 既知の問題・設計上の懸念

### 1. 認可漏れ：scenarios_texts.list が認証チェックのみで room 単位の認可がない

**問題**: scenario_texts.ts の list query は認証チェック（if (!identity)）を行っているが、room_members によるロールチェックがありません。理論上、rooms.get（認可チェックなし）と同じく、誰でもどのルームのシナリオテキストも取得できます。

**現状**: 実際には意図的な設計かもしれません（盤面情報は開示、シナリオテキストは認証ユーザー全員に開示など）。

**推奨改善**: room_members のロール別フィルタリング、または owner のみアクセス等の制限検討

### 2. ロール階層の重複定義

**問題**: ROLE_HIERARCHY が convex/scenes.ts, pieces.ts, characters.ts, objects.ts, bgms.ts, cutins.ts, scenario_texts.ts, messages.ts, room_members.ts の各モジュールで個別に定義されており、_helpers.ts では定義されていません。

**現状**: 各モジュールで getRole, assertMinRole を重複実装しています。

**推奨改善**: _helpers.ts に getRole, assertMinRole を集約し、各モジュールで import する

### 3. キャラクター owner_id の権限管理が不一貫

**問題**:
- updateStats: owner は自分のキャラのみ編集可（owner_id チェック）
- moveStats: owner でも誰のキャラでも移動可（owner_id チェックなし）
- updateBase: owner は自分のキャラのみ編集可（owner_id チェック）

このため、プレイヤーが他のプレイヤーのキャラクターを盤面上で移動できます。

**推奨改善**: moveStats にも owner_id チェックを追加、または「共有操作」として意図的に許可した場合は明示的に仕様に記載

### 4. room_members.join で owner の二重登録リスク

**問題**: join mutation が「既存 owner エントリをチェック」せず、room.owner_id と userId を比較しているため、ルーム作成後に room.owner_id が変更された場合、エントリが不一致になる可能性があります。

**推奨改善**: room.owner_id 変更 mutation を実装し、その際に room_members の owner エントリを同期

### 5. messages のフィルタリングロジックが簡潔すぎる

**問題**: messages.send で allowed_user_ids を設定できますが、これはチャネルベースの権限と別のメカニズムです。両者の関係が不明確です。

**推奨改善**: チャネル権限と秘密メッセージの権限の関係を設計ドキュメントに明記

### 6. バッチ操作の部分実行リスク

**問題**: createBatch, reorder, batchUpdateSort は複数ドキュメント操作ですが、途中でエラーが発生した場合の部分実行を考慮していません。

**推奨改善**: トランザクションのシミュレーション（全チェック先行、その後一括操作）または部分実行時のロールバック処理

### 7. admin.deleteRoom の削除順序

**問題**: admin.deleteRoom は scenes → pieces → characters → objects → bgms → cutins → messages → room_members → room の順で削除していますが、外部キー制約がないため、順序が重要ではありません。

**推奨改善**: 将来的に外部キー制約を追加する場合、削除順序を事前に設計

### 8. characters テーブル分割による一貫性リスク

**問題**: characters_stats と characters_base が分割されているため、どちらか一方だけが削除されるリスク（データ不整合）があります。

**推奨改善**: キャラクター削除時は必ず両テーブルから削除（現在の実装は正しいが、将来の保守で誤解の余地あり）

### 9. messages.archive の Worker 依存

**問題**: メッセージアーカイブが WORKER_URL, ARCHIVE_SECRET に依存しており、環境変数が未設定の場合は silently fail（console.error のみ）します。

**推奨改善**: 未設定時に throw するか、Convex 内で D1 へ直接アーカイブ

### 10. migration.ts の manual run 必須性

**問題**: マイグレーションモジュール（fixUserIds, removeDefaultGuestRole等）が mutation として定義されており、ユーザーが手動で呼び出す必要があります。デプロイ時に自動実行される仕組みがありません。

**推奨改善**: Convex の on.scheduled 等を使用した自動マイグレーション、または初回デプロイ時の初期化スクリプト

---

## 参考資料

- Convex 公式ドキュメント: https://docs.convex.dev/
- スキーマ定義: convex/schema.ts
- 認可ヘルパー: convex/_helpers.ts

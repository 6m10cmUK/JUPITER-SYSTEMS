# パネルポップアウト構想

## 概要

`/adrastea/:roomId/panel/:panelId` で特定パネルだけを別タブ/ウィンドウで開ける機能。

## ユースケース

- チャットをサブモニターに出す
- BGM コントロールを別タブに置く
- モバイルでチャットだけ見る
- Playwright でパネル単体のテストをする（要素探索コスト削減）

---

## Phase 1: ポップアウト機能（先に実装）

### ルート追加
```
/adrastea/:roomId/panel/:panelId
```

`panelId` は固定列挙: `chat` | `scene` | `character` | `bgm`

### 実装方針
- AdrasteaContext はそのまま（Convex 接続も通常通り張る）
- dockview を使わず対象パネルコンポーネントだけ直置き
- 最小限のヘッダー（ルーム名 + パネル名 + ×ボタン）
- 各パネルヘッダーにポップアウトボタン（`ExternalLink` アイコン）追加

### パネルマップ
```ts
const PANEL_MAP: Record<string, { label: string; component: React.ReactNode; defaultSize: string }> = {
  chat:      { label: 'チャット',       component: <ChatPanelView />,      defaultSize: 'width=420,height=640' },
  scene:     { label: 'シーン',         component: <ScenePanelView />,     defaultSize: 'width=600,height=500' },
  character: { label: 'キャラクター',   component: <CharacterPanelView />, defaultSize: 'width=360,height=600' },
  bgm:       { label: 'BGM',            component: <BgmPanelView />,       defaultSize: 'width=400,height=300' },
};
```

インフラ（ルート + ラッパー）を一度作れば各パネルの追加は数分。

### ウィンドウ UX
- `window.open(url, '_blank', defaultSize)` で初期サイズ指定
- 最後のウィンドウサイズを localStorage に保存（key: `popout-size:${panelId}`）
- ×ボタンで `window.close()`

### 接続数
- ポップアウトタブも独立して Convex に接続する（タブ数分増える）
- TRPG 規模（5〜10人、Convex free tier 20接続）では許容範囲
- 同時接続が free tier の 70%（14接続）を超えたら Phase 2 か paid プラン移行を検討

### 注意
- モバイル実機テスト必須（Mobile Safari でのバックグラウンド時 WebSocket 挙動確認）

---

## Phase 2: 接続集約（必要になったら）

### 課題
- AdrasteaContext が `useQuery`/`useMutation` を直接呼ぶため、タブが増えるたびに接続が増える
- free tier 上限に当たった場合や設計的に整理したい場合に対応

### 方針: URL でリーダー/フォロワーを固定

リーダー選出は不要。URL で役割が確定している:

| URL | 役割 | Convex 接続 |
|-----|------|------------|
| `/adrastea/:roomId` | **リーダー固定** | あり（1本） |
| `/adrastea/:roomId/panel/:panelId` | **フォロワー固定** | なし |

```
メインタブ（/adrastea/:roomId）       ポップアウトタブ（/panel/chat 等）
  Convex WebSocket 1本                  接続なし
  データ受信 → BroadcastChannel ──►   表示更新
  BroadcastChannel ◄── 送信リクエスト ── 操作
```

- ハートビート不要
- フェイルオーバー不要（メインタブが死んだらポップアウトも止まる、それでいい）

### 抽象フック層（Phase 1 の段階で先に作る）

Phase 1 の時点で抽象フック層だけ作っておく（実装は useQuery のまま）。
Phase 2 では内部実装を BC に差し替えるだけでコンポーネント側は変更不要。

```ts
// Phase 1: useQuery/useMutation のラッパー（実装は変わらず）
function useRoomData(): QueryResult<Room>
function useSendMessage(): (msg: SendMessageArgs) => Promise<void>
function useChatMessages(): QueryResult<Message[]>

// Phase 2: フォロワーモード時は内部実装を BC に差し替え
// コンポーネントは同じフックを使い続ける
```

### BroadcastChannel メッセージ設計

```ts
type LeaderMessage =
  | { type: 'state-update'; data: RoomState }        // リーダー → フォロワー
  | { type: 'operation-complete'; requestId: string } // リーダー → フォロワー

type FollowerMessage =
  | { type: 'send-message'; payload: SendMessageArgs; requestId: string } // フォロワー → リーダー
  | { type: 'request-state' }                                              // フォロワー → リーダー
```

- `requestId` (uuid) で pending 操作を追跡し、順序の問題に対処

### トリガー
- Convex free tier の接続上限に当たったとき
- paid プランへの移行コストと天秤にかけて判断（paid の方が実装ゼロで確実）

---

## 前提・制約

- BroadcastChannel は同一オリジン・同一ブラウザプロフィール内のみ有効
- ポップアウトタブはメインタブが開いている間だけ動作（TRPG 用途では問題なし）
- 別ブラウザプロフィール間は同期不可（仕様上の制約として許容）

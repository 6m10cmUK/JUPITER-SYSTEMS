# Adrastea UI 改善プラン（DaVinci Resolve 路線）

**方針**: 角丸はほぼ使わない。DaVinci Resolve / Blender のように「背景色の多層コントラスト + シャドウ + 統一されたアイコン」でモダンに見せる。機能は削らない。

---

## 設計思想

| 要素 | 方針 |
|---|---|
| 角丸 | **ほぼゼロを維持**（2px以下。増やさない） |
| モダンさの源泉 | **背景色の階層**・シャドウ・余白・アイコン統一 |
| 参考 | DaVinci Resolve、Blender 3.x |

---

## Phase 1 — 背景色5層構造（最優先・基盤）

**目的**: 現在の4層（差が小さい）を5層（差が明確）に再設計。これだけで印象が大きく変わる。

### 現状
```
#252525  bgInput    入力欄
#2d2d2d  bgBase     メイン背景
#333333  bgToolbar  ツールバー
#3a3a3a  bgSurface  パネル背景
```
問題: 全体的に明るすぎる。bgToolbar と bgSurface の差が7しかない。

### 提案（修正版）
```
#1e1e1e  bgDeep      ← VSCode Dark+ のエディタ背景と同値
#222222  bgInput     ← 入力欄専用（例外的に暗い層）。bgBase(#282828)の上では凹む。bgDeep(#1e1e1e)上に単体で置く場合は浮いて見えるため、bgDeep 直上の入力欄（ロビー検索等）は bgDeep と同値か1段暗くすること
#282828  bgBase      ← Blender Professional と同値（メイン作業背景）
#313131  bgSurface   ← bgBase +9（パネル・カード）
#383838  bgToolbar   ← bgSurface +7（ツールバー）
#414141  bgElevated  ← bgToolbar +9（ドロップダウン・モーダル・ポップアップ）
```

**効果**: 土台が深くなることで上に乗るパネルが「浮いて見える」。レイヤー間の差を +4〜+9 で統一し、z方向の奥行きが視覚化される。

**注意**: `bgInput` は `bgDeep` より明るいため、`bgDeep` 直上に単体で置くと「凹み」ではなく「浮き」に見える。入力欄は必ず `bgBase` または `bgSurface` のコンテナ内に配置すること。


### 変更ファイル
- `src/styles/dockview-catppuccin.css` — CSS変数の値を更新 + `--ad-bg-deep` / `--ad-bg-elevated` 追加、`--ad-bg-hover` を `rgba(255,255,255,0.07)` に更新（現行 0.05 → Phase 7 のゴーストボタン視認性に必要）
- `src/styles/theme.ts` — `bgDeep` / `bgElevated` トークン追加

### bgElevated の適用箇所
- `AdModal`（モーダル本体）
- `createPortal` で出すドロップダウン全般（ChatInputPanel, AdComponents）
- `Tooltip`
- カラーピッカーポップオーバー

---

## Phase 2 — シャドウ設計（優先度：高）

**目的**: floating 要素に適切なシャドウを与えて「浮いてる感」を出す。DaVinci はここが丁寧。

### 現状
`shadowSm` / `shadowMd` は定義されているが使われていない箇所が多い。

### 提案値
```css
--ad-shadow-sm:  0 1px 4px rgba(0,0,0,0.4);
--ad-shadow-md:  0 4px 12px rgba(0,0,0,0.5);
--ad-shadow-lg:  0 8px 24px rgba(0,0,0,0.6);  ← 新規
```

### 適用箇所
- ドロップダウン・ポップアップ全般 → `shadowMd`
- モーダル → `shadowLg`
- ツールチップ → `shadowSm`
- dockview フローティングパネル → `shadowLg`（CSS変数で当てる）

---

## Phase 3 — テキストコントラスト調整（優先度：高）

**目的**: 背景が暗くなった分、テキストの可読性を再確認・調整。

### 現状の確認ポイント
- `textPrimary` が背景 `bgDeep`（#1e1e1e）の上で十分読めるか
- `textMuted` が `bgElevated`（#414141）の上で最低 3.0:1 以上あるか（装飾用途のため AA 必須ではないが、最低限の識別性を確保）
- WCAG AA 基準（コントラスト比 4.5:1）を主要テキストで満たすか

### 変更方針
- `textPrimary`: `#e8e8e8` 程度（現値確認後調整）
- `textSecondary`: `#a0a0a0` 程度
- `textMuted`: `#888888` 程度（`#666666` は bgElevated 上でコントラスト比 2.1:1 → WCAG 完全不適合のため引き上げ。装飾的テキスト・プレースホルダー・タイムスタンプ等に限定使用。インタラクティブ要素・エラーメッセージ・フォームラベルには使用禁止）

---

## Phase 4 — ボーダー・セパレーター調整（優先度：中）

**目的**: 背景が暗くなった分、ボーダーの相対的な明るさを再調整。

### 方針
- `border`: 背景との差を適切に保つ（現 #484848 あたりが多い → 確認して調整）
- `borderSubtle`: セパレーターはより薄く（`rgba(255,255,255,0.06)` 程度）
- ドックのグループ境界線を `borderSubtle` で統一

---

## Phase 5 — ロビーカード（優先度：中）

**目的**: 角丸なしでカードをモダンに。DaVinci 的には「明確な境界線 + 背景色の差」で表現。

### 方針
- カード背景を `bgSurface`、ロビー背景を `bgDeep` にして差を明確化
- ホバー時: `bgElevated` に変化 + `border` を `accent` カラーにする（角丸なしでも選択感が出る）
- カードの上端に細い `accent` カラーのライン（2px の border-top）→ **ホバー中 or 選択中のみ表示**（常時表示は一覧で accent が連続して視覚ノイズになるため）。非ホバー時は `borderSubtle` か透明
- タグは pill 形状の代わりに `border: 1px solid` のシャープなバッジ

---

## Phase 6 — チャット入力 送信ボタン改善（優先度：中）

**目的**: 「送信」テキスト → `Send` アイコン化。シャープな正方形ボタン（DaVinci のアイコンボタンスタイル）。

---

## Phase 7 — ボタン階層の再設計・ゴーストボタン化（優先度：高）

**目的**: DaVinci Resolve のように「ボタンをボタンらしく見せない」設計にする。視覚ノイズを減らし情報密度を上げる。

### 3段階ボタン階層

| 種類 | 使う場面 | スタイル |
|---|---|---|
| **ゴースト** | ツールバー・パネル内の操作全般 | 背景なし。ホバーで `bgHover` が薄く浮かぶだけ |
| **プライマリ** | 保存・送信など主要CTA | `accent` 背景。画面に1〜2個だけ |
| **デンジャー** | 削除など危険操作 | `danger` テキスト + `rgba(danger, 0.10)` の薄い背景（誤操作防止） |

### `AdButton` の variant 再定義
- `default` → ゴーストボタン（背景なし・border なし、ホバーで bgHover）
- `primary` → accent 背景（使う場所を絞る）
- `danger` → danger カラーのテキスト + `rgba(danger, 0.10)` の薄い背景（誤操作防止）

### 具体的な変更箇所
- パネル内「削除」ボタン → ゴースト + danger テキスト
- チャット送信ボタン → primary のみ accent（唯一の主要CTA）
- TopToolbar アイコンボタン → ホバー遷移を `transition: 0.1s` で統一
- モーダルの「キャンセル」→ ゴースト、「保存」→ primary

### ホバー・フォーカス統一
- hover: `bgHover`（`rgba(255,255,255,0.07)`）+ `transition: 0.1s`
- focus: `box-shadow: 0 0 0 1px var(--ad-accent)`
- active: `rgba(255,255,255,0.12)`
- padding: ゴーストボタンは視覚的な境界がなくなるため、最低 `8px 12px` 以上を確保してクリック判定を広めにとる（アイコンのみボタンは `8px` 四方）

---

## Phase 8 — キーボードショートカット基盤（優先度：低・将来）

Power User としての完成度向上。`Cmd+K` コマンドパレット等。

---

## CI — lint チェック追加（優先度：高）

**目的**: PR や push 時に ESLint を回し、UI 変更時もコード品質を担保する。

### 現状
- `.github/workflows/ci.yml` は type check（`tsc --noEmit`）と build のみ。lint は未実行。

### 追加内容
- job に **Lint** ステップを追加: `npm run lint`（`eslint .`）を Type check の前または後で実行。
- 失敗時は CI を失敗させる（UI 改善のマージ前に lint エラーを解消させる）。

### 変更ファイル
- `.github/workflows/ci.yml` — `- name: Lint` + `run: npm run lint` を追加。

---

## 実装順序

```
Phase 1+7（背景色＋ボタン階層）← 必ずセットで
→ Phase 2（シャドウ）→ Phase 3（テキスト）→ Phase 4（ボーダー）
→ Phase 5（ロビー）→ Phase 6（送信ボタン）
→ CI（lint チェック追加）
→ Phase 8（将来）
```

**Phase 1 + Phase 7 は必ずセット** — 背景色が変わると既存ボタンのコントラストが崩れる。Phase 2〜4 もその後すぐ続けると整合性が取れる。

---

## Critical Files

| ファイル | 変更内容 |
|---|---|
| `src/styles/dockview-catppuccin.css` | CSS変数値の更新・追加（bgDeep, bgElevated, shadowLg）＋ `.dv-*` クラスとの bgDeep/bgElevated/shadowLg マッピング調査・更新（フローティングパネル等） |
| `src/styles/theme.ts` | bgDeep / bgElevated / shadowLg トークン追加 |
| `src/components/Adrastea/ui/AdComponents.tsx` | bgElevated・shadowMd をドロップダウン・モーダルに適用 |
| `src/components/Adrastea/ChatInputPanel.tsx` | ドロップダウンに bgElevated + shadowMd、送信ボタンアイコン化 |
| `src/components/Adrastea/RoomLobby.tsx` | bgDeep ベース、カードに accent border-top |
| `src/components/Adrastea/TopToolbar.tsx` | ホバーフィードバック統一 |
| `.github/workflows/ci.yml` | Lint ステップ追加（`npm run lint`） |

---

## 参考: 業界標準の背景色実測値

| サービス | 最暗部 | メイン背景 | サイドバー/パネル | ツールバー/アクティブ |
|---|---|---|---|---|
| DaVinci Resolve | `#28282E` (青みあり) | — | — | — |
| Blender Professional | `#282828` | `#2a2a2a` | `#303030` | `#3f3f3f` |
| VSCode Dark+ | `#1E1E1E` | `#1E1E1E` | `#252526` | `#333333` |
| One Dark Pro | `#21252B` | `#282C34` | `#21252B` | `#3E4452` |
| Adrastea 現状 | `#252525` | `#2d2d2d` | `#333333` | `#3a3a3a` |
| **Adrastea 提案** | **`#1e1e1e`** | **`#282828`** | **`#313131`** | **`#383838`** |

レイヤー間差の目安: **+4〜+9** が業界標準。

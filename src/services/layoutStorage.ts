import { generateUUID } from '../utils/uuid';

// localStorage キー
const STORE_KEY = 'adrastea-layouts';
const LEGACY_OWNER_KEY = 'adrastea-dock-layout-owner';
const LEGACY_USER_KEY = 'adrastea-dock-layout-user';

// 型定義
export interface SavedLayout {
  id: string;
  name: string;
  layout: object; // Dockview の api.toJSON() の結果
  /** ステータスパネル全体を盤面にオーバーレイするか */
  statusPanelOnBoard?: boolean;
  /** @deprecated 旧形式（ステータス個別トグル）。読み込み時のみマイグレーションに使用 */
  statusOverlayVisibility?: Record<string, boolean>;
}

/** レイアウト JSON から盤面オーバーフラグを復元（旧 Record 形式はいずれか true なら ON） */
export function migrateStatusPanelBoardOverlay(
  saved: {
    statusPanelOnBoard?: boolean;
    statusOverlayVisibility?: Record<string, boolean>;
  } | null
): boolean {
  if (!saved) return false;
  if (saved.statusPanelOnBoard !== undefined) return !!saved.statusPanelOnBoard;
  const vis = saved.statusOverlayVisibility;
  if (!vis) return false;
  return Object.values(vis).some(Boolean);
}

export interface LayoutStore {
  version: number; // 1
  layouts: SavedLayout[];
  gmDefault: string | null; // layout id — owner/sub_owner 用デフォルト
  plDefault: string | null; // layout id — user 用デフォルト
}

// 初期値を生成する関数
function createInitialStore(): LayoutStore {
  const gmId = generateUUID();
  const plId = generateUUID();
  return {
    version: 1,
    layouts: [
      { id: gmId, name: 'GMデフォルト', layout: structuredClone(DEFAULT_LAYOUT_OWNER) },
      { id: plId, name: 'PLデフォルト', layout: structuredClone(DEFAULT_LAYOUT_USER) },
    ],
    gmDefault: gmId,
    plDefault: plId,
  };
}

// モジュールレベルキャッシュ
let store: LayoutStore | null = null;

/**
 * ストア全体のロード。なければ初期値を返す。
 * 初回実行時に旧形式マイグレーションを実行。
 */
export function loadStore(): LayoutStore {
  if (store !== null) {
    return store;
  }

  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) {
      store = JSON.parse(stored) as LayoutStore;
      return store;
    }

    // 新しいストアが存在しない → 旧形式をマイグレーション
    store = migrateFromLegacy();
    return store;
  } catch (error) {
    console.error('Failed to load layout store:', error);
    store = createInitialStore();
    return store;
  }
}

/**
 * 旧形式（adrastea-dock-layout-owner, adrastea-dock-layout-user）から新形式へマイグレーション
 */
function migrateFromLegacy(): LayoutStore {
  const newStore = createInitialStore();

  try {
    // owner のマイグレーション
    const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
    if (legacyOwner) {
      const parsed = JSON.parse(legacyOwner) as { _version?: number; layout?: object };
      if (parsed._version === 3 && parsed.layout) {
        const ownerLayout: SavedLayout = {
          id: generateUUID(),
          name: '(自動保存)',
          layout: parsed.layout,
        };
        newStore.layouts.push(ownerLayout);
      }
    }
  } catch (error) {
    console.warn('Failed to migrate legacy owner layout:', error);
  }

  try {
    // user のマイグレーション
    const legacyUser = localStorage.getItem(LEGACY_USER_KEY);
    if (legacyUser) {
      const parsed = JSON.parse(legacyUser) as { _version?: number; layout?: object };
      if (parsed._version === 3 && parsed.layout) {
        const userLayout: SavedLayout = {
          id: generateUUID(),
          name: '(自動保存)',
          layout: parsed.layout,
        };
        newStore.layouts.push(userLayout);
      }
    }
  } catch (error) {
    console.warn('Failed to migrate legacy user layout:', error);
  }

  return newStore;
}

/**
 * ストアを localStorage に保存（内部用だが export）
 */
export function persistStore(storeData: LayoutStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(storeData));
    store = storeData;
  } catch (error) {
    console.error('Failed to persist layout store:', error);
  }
}

/**
 * レイアウト一覧取得
 */
export function getSavedLayouts(): SavedLayout[] {
  const currentStore = loadStore();
  return currentStore.layouts.map((layout) => structuredClone(layout));
}

/**
 * レイアウト保存（新規追加）。id は generateUUID() で生成。返り値は id
 */
export function addLayout(name: string, layout: object): string {
  const currentStore = loadStore();
  const id = generateUUID();
  const newLayout: SavedLayout = {
    id,
    name,
    layout: structuredClone(layout),
  };
  currentStore.layouts.push(newLayout);
  persistStore(currentStore);
  return id;
}

/**
 * レイアウト削除。削除対象が gmDefault/plDefault ならそれも null にする
 */
export function deleteLayout(id: string): void {
  const currentStore = loadStore();
  currentStore.layouts = currentStore.layouts.filter((layout) => layout.id !== id);

  if (currentStore.gmDefault === id) {
    currentStore.gmDefault = null;
  }
  if (currentStore.plDefault === id) {
    currentStore.plDefault = null;
  }

  persistStore(currentStore);
}

/**
 * owner/sub_owner デフォルト設定
 */
export function setGmDefault(id: string | null): void {
  const currentStore = loadStore();
  currentStore.gmDefault = id;
  persistStore(currentStore);
}

/**
 * user デフォルト設定
 */
export function setPlDefault(id: string | null): void {
  const currentStore = loadStore();
  currentStore.plDefault = id;
  persistStore(currentStore);
}

/**
 * gmDefault の id を返す
 */
export function getGmDefaultId(): string | null {
  const currentStore = loadStore();
  return currentStore.gmDefault;
}

/**
 * plDefault の id を返す
 */
export function getPlDefaultId(): string | null {
  const currentStore = loadStore();
  return currentStore.plDefault;
}

/**
 * role に応じたデフォルトレイアウトを取得
 * - owner, sub_owner → gmDefault
 * - user → plDefault
 * - guest → null
 */
export function getDefaultLayoutForRole(role: string): SavedLayout | null {
  const currentStore = loadStore();

  let defaultId: string | null = null;
  if (role === 'owner' || role === 'sub_owner') {
    defaultId = currentStore.gmDefault;
  } else if (role === 'user') {
    defaultId = currentStore.plDefault;
  } else {
    return null;
  }

  if (!defaultId) {
    return null;
  }

  const layout = currentStore.layouts.find((l) => l.id === defaultId);
  return layout ? structuredClone(layout) : null;
}

/**
 * レイアウト内のパネルIDリストを抽出（バリデーション用）
 * layout.panels の keys を返す
 */
export function extractPanelIds(layout: object): string[] {
  try {
    const layoutObj = layout as Record<string, unknown>;
    const panels = layoutObj.panels as Record<string, unknown> | undefined;
    if (!panels || typeof panels !== 'object') {
      return [];
    }
    return Object.keys(panels);
  } catch (error) {
    console.warn('Failed to extract panel IDs:', error);
    return [];
  }
}

/**
 * PLデフォルト設定時のバリデーション
 * PLに許可されないパネルが layout 内に存在するかチェック
 * 見つかったパネルの表示名を配列で返す（空なら OK）
 */
export function validateForPl(layout: object): string[] {
  const panelIds = extractPanelIds(layout);

  const restrictedPanels: Record<string, string> = {
    scene: 'シーン',
    layer: 'レイヤー',
    bgm: 'BGM',
    scenarioText: 'テキスト',
    cutin: 'カットイン',
  };

  const violations: string[] = [];
  for (const panelId of panelIds) {
    if (panelId in restrictedPanels) {
      violations.push(restrictedPanels[panelId]);
    }
  }

  return violations;
}

/**
 * レイアウトの grid サイズを現在の画面サイズにスケーリングする。
 * デフォルトレイアウトは特定の画面サイズ (1858x933) でエクスポートされているため、
 * 異なる画面サイズで復元する際にスケーリングが必要。
 */
export function scaleLayout(layout: object, targetWidth: number, targetHeight: number): object {
  const scaled = structuredClone(layout) as Record<string, any>;
  const grid = scaled.grid;
  if (!grid?.root || !grid.width || !grid.height) return scaled;

  const wRatio = targetWidth / grid.width;
  const hRatio = targetHeight / grid.height;

  const isHorizontal = grid.orientation === 'HORIZONTAL';

  function scaleNode(node: any, horizontal: boolean) {
    if (node.size != null) {
      node.size = Math.round(node.size * (horizontal ? wRatio : hRatio));
    }
    if (node.type === 'branch' && Array.isArray(node.data)) {
      node.data.forEach((child: any) => scaleNode(child, !horizontal));
    }
  }

  // root.size は orientation の逆方向
  if (grid.root.size != null) {
    grid.root.size = Math.round(grid.root.size * (isHorizontal ? hRatio : wRatio));
  }
  // root の子は orientation 方向
  if (Array.isArray(grid.root.data)) {
    grid.root.data.forEach((child: any) => scaleNode(child, isHorizontal));
  }

  grid.width = targetWidth;
  grid.height = targetHeight;

  // floatingGroups の position もスケーリング
  if (Array.isArray(scaled.floatingGroups)) {
    for (const fg of scaled.floatingGroups) {
      if (fg.position) {
        fg.position.top = Math.round(fg.position.top * hRatio);
        fg.position.left = Math.round(fg.position.left * wRatio);
        fg.position.width = Math.round(fg.position.width * wRatio);
        fg.position.height = Math.round(fg.position.height * hRatio);
      }
    }
  }

  return scaled;
}

export const DEFAULT_LAYOUT_OWNER = {"grid":{"root":{"type":"branch","data":[{"type":"leaf","data":{"views":["scene"],"activeView":"scene","id":"17"},"size":0.1222},{"type":"leaf","data":{"views":["character"],"activeView":"character","id":"18"},"size":0.1227},{"type":"branch","data":[{"type":"leaf","data":{"views":["bgm"],"activeView":"bgm","id":"10"},"size":0.1694},{"type":"leaf","data":{"views":["property"],"activeView":"property","id":"8"},"size":0.4973},{"type":"leaf","data":{"views":["layer"],"activeView":"layer","id":"12"},"size":0.3334}],"size":0.1426},{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":0.4063},{"type":"branch","data":[{"type":"leaf","data":{"views":["chatLog","chatPalette","pdfViewer"],"activeView":"chatLog","id":"2"},"size":0.7203},{"type":"leaf","data":{"views":["chatInput"],"activeView":"chatInput","id":"6"},"size":0.2797}],"size":0.2061}],"size":1},"width":1,"height":1,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"chatPalette":{"id":"chatPalette","contentComponent":"chatPalette","title":"チャットパレット"},"pdfViewer":{"id":"pdfViewer","contentComponent":"pdfViewer","title":"PDF"},"chatInput":{"id":"chatInput","contentComponent":"chatInput","title":"チャット入力"},"property":{"id":"property","contentComponent":"property","title":"プロパティ"},"bgm":{"id":"bgm","contentComponent":"bgm","title":"BGM"},"layer":{"id":"layer","contentComponent":"layer","title":"レイヤー"},"scene":{"id":"scene","contentComponent":"scene","title":"シーン"},"character":{"id":"character","contentComponent":"character","title":"キャラクター"},"status":{"id":"status","contentComponent":"status","title":"ステータス"}},"activeGroup":"5","floatingGroups":[{"data":{"views":["status"],"activeView":"status","id":"4"},"position":{"top":0.04,"left":0.39,"width":0.1329,"height":0.3742}}]};

export const DEFAULT_LAYOUT_USER = {"grid":{"root":{"type":"branch","data":[{"type":"branch","data":[{"type":"leaf","data":{"views":["character"],"activeView":"character","id":"10"},"size":0.6409},{"type":"leaf","data":{"views":["property"],"activeView":"property","id":"8"},"size":0.3591}],"size":0.1555},{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":0.6384},{"type":"branch","data":[{"type":"leaf","data":{"views":["chatLog","chatPalette"],"activeView":"chatLog","id":"2"},"size":0.7203},{"type":"leaf","data":{"views":["chatInput"],"activeView":"chatInput","id":"6"},"size":0.2797}],"size":0.2061}],"size":1},"width":1,"height":1,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"chatPalette":{"id":"chatPalette","contentComponent":"chatPalette","title":"チャットパレット"},"status":{"id":"status","contentComponent":"status","title":"ステータス"},"chatInput":{"id":"chatInput","contentComponent":"chatInput","title":"チャット入力"},"property":{"id":"property","contentComponent":"property","title":"プロパティ"},"character":{"id":"character","contentComponent":"character","title":"キャラクター"}},"activeGroup":"4","floatingGroups":[{"data":{"views":["status"],"activeView":"status","id":"4"},"position":{"top":0.0365,"left":0.1593,"width":0.1329,"height":0.3742}}]};

export const DEFAULT_LAYOUT_GUEST = {"grid":{"root":{"type":"branch","data":[{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":0.8094},{"type":"leaf","data":{"views":["chatLog"],"activeView":"chatLog","id":"2"},"size":0.1906}],"size":1},"width":1,"height":1,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"status":{"id":"status","contentComponent":"status","title":"ステータス"}},"activeGroup":"2","floatingGroups":[{"data":{"views":["status"],"activeView":"status","id":"4"},"position":{"top":0.0386,"left":0.0027,"width":0.1329,"height":0.3742}}]};

// localStorage キー
const STORE_KEY = 'adrastea-layouts';
const LEGACY_OWNER_KEY = 'adrastea-dock-layout-owner';
const LEGACY_USER_KEY = 'adrastea-dock-layout-user';

// 型定義
export interface SavedLayout {
  id: string;
  name: string;
  layout: object; // Dockview の api.toJSON() の結果
}

export interface LayoutStore {
  version: number; // 1
  layouts: SavedLayout[];
  gmDefault: string | null; // layout id — owner/sub_owner 用デフォルト
  plDefault: string | null; // layout id — user 用デフォルト
}

// 初期値を生成する関数
function createInitialStore(): LayoutStore {
  const gmId = crypto.randomUUID();
  const plId = crypto.randomUUID();
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
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          name: '(自動保存)',
          layout: parsed.layout,
        };
        newStore.layouts.push(userLayout);
        newStore.plDefault = userLayout.id;
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
 * レイアウト保存（新規追加）。id は crypto.randomUUID() で生成。返り値は id
 */
export function addLayout(name: string, layout: object): string {
  const currentStore = loadStore();
  const id = crypto.randomUUID();
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

export const DEFAULT_LAYOUT_OWNER = {"grid":{"root":{"type":"branch","data":[{"type":"leaf","data":{"views":["scene"],"activeView":"scene","id":"17"},"size":227},{"type":"leaf","data":{"views":["character"],"activeView":"character","id":"18"},"size":228},{"type":"branch","data":[{"type":"leaf","data":{"views":["bgm"],"activeView":"bgm","id":"10"},"size":158},{"type":"leaf","data":{"views":["property"],"activeView":"property","id":"8"},"size":464},{"type":"leaf","data":{"views":["layer"],"activeView":"layer","id":"12"},"size":311}],"size":265},{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":755},{"type":"branch","data":[{"type":"leaf","data":{"views":["chatLog","chatPalette","pdfViewer"],"activeView":"chatLog","id":"2"},"size":672},{"type":"leaf","data":{"views":["chatInput"],"activeView":"chatInput","id":"6"},"size":261}],"size":383}],"size":933},"width":1858,"height":933,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"chatPalette":{"id":"chatPalette","contentComponent":"chatPalette","title":"チャットパレット"},"pdfViewer":{"id":"pdfViewer","contentComponent":"pdfViewer","title":"PDF"},"chatInput":{"id":"chatInput","contentComponent":"chatInput","title":"チャット入力"},"property":{"id":"property","contentComponent":"property","title":"プロパティ"},"bgm":{"id":"bgm","contentComponent":"bgm","title":"BGM"},"layer":{"id":"layer","contentComponent":"layer","title":"レイヤー"},"scene":{"id":"scene","contentComponent":"scene","title":"シーン"},"character":{"id":"character","contentComponent":"character","title":"キャラクター"}},"activeGroup":"5"};

export const DEFAULT_LAYOUT_USER = {"grid":{"root":{"type":"branch","data":[{"type":"branch","data":[{"type":"leaf","data":{"views":["character"],"activeView":"character","id":"10"},"size":598},{"type":"leaf","data":{"views":["property"],"activeView":"property","id":"8"},"size":335}],"size":289},{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":1319},{"type":"branch","data":[{"type":"leaf","data":{"views":["chatLog","chatPalette"],"activeView":"chatLog","id":"2"},"size":650},{"type":"leaf","data":{"views":["chatInput"],"activeView":"chatInput","id":"6"},"size":283}],"size":250}],"size":933},"width":1858,"height":933,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"chatPalette":{"id":"chatPalette","contentComponent":"chatPalette","title":"チャットパレット"},"status":{"id":"status","contentComponent":"status","title":"ステータス"},"chatInput":{"id":"chatInput","contentComponent":"chatInput","title":"チャット入力"},"property":{"id":"property","contentComponent":"property","title":"プロパティ"},"character":{"id":"character","contentComponent":"character","title":"キャラクター"}},"activeGroup":"4","floatingGroups":[{"data":{"views":["status"],"activeView":"status","id":"4"},"position":{"top":34,"left":296,"width":247,"height":349}}]};

export const DEFAULT_LAYOUT_GUEST = {"grid":{"root":{"type":"branch","data":[{"type":"leaf","data":{"views":["board"],"activeView":"board","id":"5"},"size":1504},{"type":"leaf","data":{"views":["chatLog"],"activeView":"chatLog","id":"2"},"size":354}],"size":933},"width":1858,"height":933,"orientation":"HORIZONTAL"},"panels":{"board":{"id":"board","contentComponent":"board","tabComponent":"boardTab","title":"Board"},"chatLog":{"id":"chatLog","contentComponent":"chatLog","title":"チャットログ"},"status":{"id":"status","contentComponent":"status","title":"ステータス"}},"activeGroup":"2","floatingGroups":[{"data":{"views":["status"],"activeView":"status","id":"4"},"position":{"top":36,"left":5,"width":247,"height":349}}]};

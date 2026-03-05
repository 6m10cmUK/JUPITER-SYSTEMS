import { useCallback, useRef } from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview-react';
import '../../styles/dockview-catppuccin.css';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';

import { BoardDockPanel } from './dock-panels/BoardDockPanel';
import { ChatDockPanel } from './dock-panels/ChatDockPanel';
import { SceneDockPanel } from './dock-panels/SceneDockPanel';
import { CharacterDockPanel } from './dock-panels/CharacterDockPanel';
import { ScenarioTextDockPanel } from './dock-panels/ScenarioTextDockPanel';
import { CutinDockPanel } from './dock-panels/CutinDockPanel';
import { LayerDockPanel } from './dock-panels/LayerDockPanel';
import { PropertyDockPanel } from './dock-panels/PropertyDockPanel';

const LAYOUT_STORAGE_KEY = 'adrastea-dock-layout';
const LAYOUT_VERSION = 7;

const components: Record<string, React.FC<IDockviewPanelProps>> = {
  board: BoardDockPanel,
  chat: ChatDockPanel,
  scene: SceneDockPanel,
  character: CharacterDockPanel,
  scenarioText: ScenarioTextDockPanel,
  cutin: CutinDockPanel,
  layer: LayerDockPanel,
  property: PropertyDockPanel,
};

function applyDefaultLayout(api: DockviewApi) {
  // グリッド: Board（メイン） + Chat（右サイド）
  const boardPanel = api.addPanel({
    id: 'board',
    component: 'board',
    title: 'Board',
  });

  api.addPanel({
    id: 'chat',
    component: 'chat',
    title: 'チャット',
    position: { referencePanel: boardPanel, direction: 'right' },
  });

  // Chatグループの幅設定
  const chatPanel = api.getPanel('chat');
  if (chatPanel?.group) {
    api.getGroup(chatPanel.group.id)?.api.setSize({ width: 280 });
  }

  // フローティング: シーン・キャラクター・テキスト・カットイン（タブグループ）
  const scenePanel = api.addPanel({
    id: 'scene',
    component: 'scene',
    title: 'シーン',
    floating: { width: 200, height: 300, x: 10, y: 10 },
  });

  api.addPanel({
    id: 'character',
    component: 'character',
    title: 'キャラクター',
    position: { referencePanel: scenePanel },
  });

  api.addPanel({
    id: 'scenarioText',
    component: 'scenarioText',
    title: 'テキスト',
    position: { referencePanel: scenePanel },
  });

  api.addPanel({
    id: 'cutin',
    component: 'cutin',
    title: 'カットイン',
    position: { referencePanel: scenePanel },
  });

  // フローティング: レイヤー
  api.addPanel({
    id: 'layer',
    component: 'layer',
    title: 'レイヤー',
    floating: { width: 200, height: 250, x: 10, y: 320 },
  });

  // フローティング: プロパティ（右側、Chatの左に配置）
  const container = api.element;
  const containerWidth = container?.getBoundingClientRect().width ?? 1200;
  api.addPanel({
    id: 'property',
    component: 'property',
    title: 'プロパティ',
    floating: {
      width: 260,
      height: 400,
      x: containerWidth - 280 - 260 - 10,
      y: 10,
    },
  });
}

function isLayoutValid(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const l = layout as Record<string, unknown>;
  if (l._version !== LAYOUT_VERSION) return false;
  return true;
}

export function DockLayout() {
  const { setDockviewApi } = useAdrasteaContext();
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      setDockviewApi(event.api);

      // レイアウト復元を試みる
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        try {
          const wrapper = JSON.parse(saved);
          if (isLayoutValid(wrapper)) {
            event.api.fromJSON(wrapper.layout);

            // auto-saveリスナー登録
            disposableRef.current?.dispose();
            disposableRef.current = event.api.onDidLayoutChange(() => {
              saveLayout(event.api);
            });
            return;
          }
          localStorage.removeItem(LAYOUT_STORAGE_KEY);
        } catch {
          localStorage.removeItem(LAYOUT_STORAGE_KEY);
        }
      }

      // デフォルトレイアウトを適用
      applyDefaultLayout(event.api);

      // auto-saveリスナー登録
      disposableRef.current?.dispose();
      disposableRef.current = event.api.onDidLayoutChange(() => {
        saveLayout(event.api);
      });
    },
    [setDockviewApi],
  );

  return (
    <DockviewReact
      components={components}
      onReady={onReady}
      className="dockview-theme-catppuccin"
    />
  );
}

function saveLayout(api: DockviewApi) {
  try {
    const layout = api.toJSON();
    const wrapper = { _version: LAYOUT_VERSION, layout };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(wrapper));
  } catch {
    // ignore serialization errors
  }
}

import type React from 'react';

import { BoardDockPanel } from './BoardDockPanel';
import { ChatDockPanel } from './ChatDockPanel';
import { SceneDockPanel } from './SceneDockPanel';
import { CharacterDockPanel } from './CharacterDockPanel';
import { ScenarioTextDockPanel } from './ScenarioTextDockPanel';
import { CutinDockPanel } from './CutinDockPanel';
import { LayerDockPanel } from './LayerDockPanel';
import { PropertyDockPanel } from './PropertyDockPanel';
import { PdfViewerDockPanel } from './PdfViewerDockPanel';
import { BgmDockPanel } from './BgmDockPanel';
import { DebugConsoleDockPanel } from './DebugConsoleDockPanel';
import { ChatPaletteDockPanel } from './ChatPaletteDockPanel';

export const panelComponents: Record<string, React.FC> = {
  board: BoardDockPanel,
  chat: ChatDockPanel,
  chatPalette: ChatPaletteDockPanel,
  scene: SceneDockPanel,
  character: CharacterDockPanel,
  scenarioText: ScenarioTextDockPanel,
  cutin: CutinDockPanel,
  layer: LayerDockPanel,
  property: PropertyDockPanel,
  pdfViewer: PdfViewerDockPanel,
  bgm: BgmDockPanel,
  debugConsole: DebugConsoleDockPanel,
};

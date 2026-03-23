import { useEffect, useCallback } from 'react';
import { parseClipboardData } from '../utils/clipboardImport';
import type { Character, BoardObject, Scene, BgmTrack } from '../types/adrastea.types';

export interface UsePasteHandlerOptions {
  addCharacter: (data: Partial<Character>) => Promise<any>;
  addObject?: (data: Partial<BoardObject>) => Promise<any>;
  addScene?: (data: { scene: Partial<Scene>; objects: Partial<BoardObject>[]; bgms: Partial<BgmTrack>[] }) => Promise<any>;
  addBgm?: (data: Partial<BgmTrack>) => Promise<any>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

/**
 * クリップボードのテキスト内容をハンドルする共通ロジック
 * paste イベントハンドラ、またはコンテキストメニューからの呼び出し用
 */
export async function handleClipboardImport(
  text: string,
  addCharacter: (data: Partial<Character>) => Promise<any>,
  showToast: (message: string, type: 'success' | 'error') => void,
  addObject?: (data: Partial<BoardObject>) => Promise<any>,
  addScene?: (data: { scene: Partial<Scene>; objects: Partial<BoardObject>[]; bgms: Partial<BgmTrack>[] }) => Promise<any>,
  addBgm?: (data: Partial<BgmTrack>) => Promise<any>,
): Promise<void> {
  const result = parseClipboardData(text);

  if (result === null) {
    // 対応フォーマットではない（JSON ではない、kind プロパティなし）
    // 何もしない
    return;
  }

  if (result.type === 'unknown') {
    showToast('対応していない形式です', 'error');
    return;
  }

  if (result.type === 'character') {
    try {
      await addCharacter(result.data);
      const charName = result.data.name ?? '不明';
      showToast(`キャラクター "${charName}" をインポートしました`, 'success');
    } catch {
      showToast('インポートに失敗しました', 'error');
    }
  }

  if (result.type === 'object') {
    if (!addObject) return;
    try {
      await addObject(result.data);
      const objName = result.data.name ?? 'オブジェクト';
      showToast(`オブジェクト "${objName}" をインポートしました`, 'success');
    } catch {
      showToast('インポートに失敗しました', 'error');
    }
  }

  if (result.type === 'scene') {
    if (!addScene) return;
    try {
      await addScene(result.data);
      const sceneName = result.data.scene.name ?? 'シーン';
      showToast(`シーン "${sceneName}" をインポートしました`, 'success');
    } catch {
      showToast('インポートに失敗しました', 'error');
    }
  }

  if (result.type === 'bgm') {
    if (!addBgm) return;
    try {
      await addBgm(result.data);
      const bgmName = result.data.name ?? 'BGM';
      showToast(`BGM "${bgmName}" をインポートしました`, 'success');
    } catch {
      showToast('インポートに失敗しました', 'error');
    }
  }
}

/**
 * グローバル paste イベントを監視し、
 * クリップボード内容に応じてキャラクターインポートやトースト表示を行うフック
 */
export function usePasteHandler({ addCharacter, addObject, addScene, addBgm, showToast }: UsePasteHandlerOptions): void {
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      // テキスト入力中はスキップ（通常のペースト動作を妨げない）
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement) {
        const tagName = activeElement.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
          return;
        }
        if (activeElement.contentEditable === 'true') {
          return;
        }
      }

      const text = e.clipboardData?.getData('text/plain');
      if (!text) {
        return;
      }

      // フォーマット判定を同期的に行い、対象なら preventDefault
      const result = parseClipboardData(text);
      if (result === null) {
        return;
      }
      e.preventDefault();

      // 非同期でインポート処理
      handleClipboardImport(text, addCharacter, showToast, addObject, addScene, addBgm);
    },
    [addCharacter, addObject, addScene, addBgm, showToast],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste as EventListener);
    return () => {
      document.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [handlePaste]);
}

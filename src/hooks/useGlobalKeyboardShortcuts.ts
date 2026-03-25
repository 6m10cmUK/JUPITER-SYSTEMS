import { useEffect } from 'react';
import { useAdrasteaContext } from '../contexts/AdrasteaContext';

/**
 * グローバルキーボードショートカット
 * panelSelection に応じて、各パネルが登録した keyboardActionsRef のハンドラを呼び出す。
 * テキスト入力中はスキップ。
 */
export function useGlobalKeyboardShortcuts(): void {
  const { keyboardActionsRef } = useAdrasteaContext();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true')) return;

      const actions = keyboardActionsRef.current;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (window.getSelection()?.toString()) return;
        if (actions.copy) { e.preventDefault(); actions.copy(); }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (actions.duplicate) { e.preventDefault(); actions.duplicate(); }
      } else if (e.key === 'Delete') {
        if (actions.delete) { e.preventDefault(); actions.delete(); }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [keyboardActionsRef]);
}

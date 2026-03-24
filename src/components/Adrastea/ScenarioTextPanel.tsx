import { useCallback, useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { Plus, Send, Trash2 } from 'lucide-react';
import { theme } from '../../styles/theme';
import type { ScenarioText } from '../../types/adrastea.types';
import { SortableListPanel, SortableListItem } from './ui';
import { DropdownMenu, shortcutLabel } from './ui/DropdownMenu';

interface ScenarioTextPanelProps {
  texts: ScenarioText[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (textId: string) => void;
  onReorderTexts?: (orderedIds: string[]) => void;
  onSendToChat?: (textId: string) => void;
  onCopy?: (textId: string) => void;
  onDuplicate?: (textId: string) => void;
  onPaste?: () => void;
  channels?: { channel_id: string; label: string }[];
}

export function ScenarioTextPanel({
  texts,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onReorderTexts,
  onSendToChat,
  onCopy,
  onDuplicate,
  onPaste,
  channels,
}: ScenarioTextPanelProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; textId?: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderTexts) return;
    const oldIndex = texts.findIndex(t => t.id === active.id);
    const newIndex = texts.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(texts, oldIndex, newIndex);
    onReorderTexts(reordered.map(t => t.id));
  }, [texts, onReorderTexts]);

  // キーボードショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedId && onCopy) {
          e.preventDefault();
          onCopy(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedId && onDuplicate) {
          e.preventDefault();
          onDuplicate(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (onPaste) {
          e.preventDefault();
          onPaste();
        }
      } else if (e.key === 'Delete') {
        if (selectedId) {
          e.preventDefault();
          setPendingDeleteId(selectedId);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, onCopy, onDuplicate, onPaste]);

  const iconBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          const el = (e.target as HTMLElement).closest('[data-text-id]');
          const textId = el?.getAttribute('data-text-id') ?? undefined;
          if (textId) onSelect(textId);
          setContextMenu({ x: e.clientX, y: e.clientY, textId });
        }}
        style={{ height: '100%' }}
      >
        <SortableListPanel
          title="テキストメモ"
          headerActions={
            <button
              onClick={onAdd}
              title="テキストメモを追加"
              style={{ ...iconBtn, color: theme.accent }}
            >
              <Plus size={16} />
            </button>
          }
          items={texts}
          onDragEnd={handleDragEnd}
          emptyMessage="テキストメモがありません"
        >
          {texts.map((text) => (
            <div key={text.id} data-text-id={text.id}>
              <SortableListItem
                id={text.id}
                isSelected={selectedId === text.id}
                onClick={() => onSelect(text.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: theme.textPrimary, fontWeight: 600 }}>
                      {text.title || 'テキストメモ'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSendToChat?.(text.id); }}
                      disabled={!text.content || !onSendToChat}
                      title="チャットに送信"
                      style={{ ...iconBtn, color: theme.accent, opacity: text.content && onSendToChat ? 1 : 0.3 }}
                    >
                      <Send size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(text.id); }}
                      title="削除"
                      style={{ ...iconBtn, color: theme.danger }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{
                    color: theme.textSecondary,
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {(() => {
                      const ch = channels?.find(c => c.channel_id === text.channel_id);
                      const prefix = ch ? `[${ch.label}] ` : '';
                      return prefix + (text.content?.replace(/\n/g, ' ') || '(空)');
                    })()}
                  </div>
                </div>
              </SortableListItem>
            </div>
          ))}
        </SortableListPanel>
      </div>

      <DropdownMenu
        mode="context"
        open={contextMenu !== null}
        onOpenChange={(open) => { if (!open) setContextMenu(null); }}
        position={contextMenu ?? { x: 0, y: 0 }}
        items={[
          {
            label: 'コピー',
            shortcut: shortcutLabel('C'),
            disabled: !contextMenu?.textId,
            onClick: () => {
              if (contextMenu?.textId) onCopy?.(contextMenu.textId);
              setContextMenu(null);
            },
          },
          {
            label: '複製',
            shortcut: shortcutLabel('D'),
            disabled: !contextMenu?.textId || !onDuplicate,
            onClick: () => {
              if (contextMenu?.textId) onDuplicate?.(contextMenu.textId);
              setContextMenu(null);
            },
          },
          {
            label: '削除',
            shortcut: 'Del',
            disabled: !contextMenu?.textId,
            danger: true,
            onClick: () => {
              if (contextMenu?.textId) setPendingDeleteId(contextMenu.textId);
              setContextMenu(null);
            },
          },
          'separator',
          {
            label: '貼り付け',
            shortcut: shortcutLabel('V'),
            disabled: !onPaste,
            onClick: () => {
              onPaste?.();
              setContextMenu(null);
            },
          },
        ]}
      />

      {pendingDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            style={{
              background: theme.bgSurface,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '400px',
              boxShadow: theme.shadowLg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: theme.textPrimary, marginBottom: '16px', fontSize: '14px' }}>
              「{texts.find(t => t.id === pendingDeleteId)?.title || 'テキストメモ'}」を削除しますか？
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingDeleteId(null)}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${theme.border}`,
                  background: theme.bgInput,
                  color: theme.textPrimary,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onRemove(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  background: theme.danger,
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

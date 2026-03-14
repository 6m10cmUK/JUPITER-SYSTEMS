import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { ScenarioText } from '../../types/adrastea.types';
import { SortableListPanel, SortableListItem } from './ui';

interface ScenarioTextPanelProps {
  texts: ScenarioText[];
  onAdd: () => void;
  onUpdate: (textId: string, updates: Partial<ScenarioText>) => void;
  onRemove: (textId: string) => void;
  onReorderTexts?: (orderedIds: string[]) => void;
  onClose: () => void;
}

export function ScenarioTextPanel({ texts, onAdd, onUpdate, onRemove, onReorderTexts, onClose }: ScenarioTextPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const startEdit = (text: ScenarioText) => {
    setEditingId(text.id);
    setEditTitle(text.title);
    setEditContent(text.content);
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdate(editingId, { title: editTitle, content: editContent });
      setEditingId(null);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderTexts) return;
    const oldIndex = texts.findIndex(t => t.id === active.id);
    const newIndex = texts.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(texts, oldIndex, newIndex);
    onReorderTexts(reordered.map(t => t.id));
  }, [texts, onReorderTexts]);

  const inputStyle = {
    width: '100%',
    padding: '6px 8px',
    background: theme.bgInput,
    border: `1px solid ${theme.border}`,
    borderRadius: 0,
    color: theme.textPrimary,
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <SortableListPanel
      title="シナリオテキスト"
      headerActions={
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.textSecondary,
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          x
        </button>
      }
      footerActions={
        <button
          onClick={onAdd}
          style={{
            width: '100%',
            padding: '8px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + テキスト追加
        </button>
      }
      items={texts}
      onDragEnd={handleDragEnd}
      emptyMessage="テキストがありません"
    >
      {texts.map((text) => (
        <SortableListItem key={text.id} id={text.id}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === text.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  style={inputStyle}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="タイトル"
                />
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="本文"
                />
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <button
                    className="adra-btn adra-btn--ghost"
                    onClick={() => setEditingId(null)}
                    style={{
                      padding: '4px 8px', background: 'transparent', color: theme.textPrimary,
                      border: 'none', borderRadius: 0, fontSize: '0.75rem', cursor: 'pointer',
                    }}
                  >
                    キャンセル
                  </button>
                  <button onClick={saveEdit} style={{
                    padding: '4px 8px', background: theme.accent, color: theme.textOnAccent,
                    border: 'none', borderRadius: 0, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}>保存</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: theme.textPrimary, fontSize: '0.85rem', fontWeight: 600 }}>
                    {text.title}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate(text.id, { visible: !text.visible }); }}
                      style={{
                        padding: '2px 6px',
                        background: text.visible ? theme.success : theme.bgInput,
                        color: text.visible ? theme.textOnAccent : theme.textSecondary,
                        border: 'none',
                        borderRadius: 0,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                    >
                      {text.visible ? '表示中' : '非表示'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(text); }} style={{
                      background: 'transparent', border: 'none', color: theme.textSecondary,
                      fontSize: '0.7rem', cursor: 'pointer', padding: '2px 4px',
                    }}>編集</button>
                    <button onClick={(e) => { e.stopPropagation(); onRemove(text.id); }} style={{
                      background: 'transparent', border: 'none', color: theme.danger,
                      fontSize: '0.7rem', cursor: 'pointer', padding: '2px 4px',
                    }}>削除</button>
                  </div>
                </div>
                <div style={{
                  color: theme.textSecondary,
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '80px',
                  overflow: 'hidden',
                }}>
                  {text.content || '(空)'}
                </div>
              </>
            )}
          </div>
        </SortableListItem>
      ))}
    </SortableListPanel>
  );
}

import { useState } from 'react';
import { theme } from '../../styles/theme';
import type { ScenarioText } from '../../types/adrastea.types';

interface ScenarioTextPanelProps {
  texts: ScenarioText[];
  onAdd: () => void;
  onUpdate: (textId: string, updates: Partial<ScenarioText>) => void;
  onRemove: (textId: string) => void;
  onClose: () => void;
}

export function ScenarioTextPanel({ texts, onAdd, onUpdate, onRemove, onClose }: ScenarioTextPanelProps) {
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
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bgSurface,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '0.9rem' }}>
          シナリオテキスト
        </span>
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
      </div>

      {/* リスト */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {texts.length === 0 && (
          <div style={{ color: theme.textMuted, fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
            テキストがありません
          </div>
        )}
        {texts.map((text) => (
          <div
            key={text.id}
            style={{
              marginBottom: '8px',
              padding: '10px 12px',
              border: `1px solid ${theme.border}`,
              borderRadius: 0,
              background: theme.bgToolbar,
            }}
          >
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
                  <button onClick={() => setEditingId(null)} style={{
                    padding: '4px 8px', background: theme.bgInput, color: theme.textPrimary,
                    border: 'none', borderRadius: 0, fontSize: '0.75rem', cursor: 'pointer',
                  }}>キャンセル</button>
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
                      onClick={() => onUpdate(text.id, { visible: !text.visible })}
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
                    <button onClick={() => startEdit(text)} style={{
                      background: 'transparent', border: 'none', color: theme.textSecondary,
                      fontSize: '0.7rem', cursor: 'pointer', padding: '2px 4px',
                    }}>編集</button>
                    <button onClick={() => onRemove(text.id)} style={{
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
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.border}` }}>
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
      </div>
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { theme } from '../../styles/theme';
import { AdInput, AdSlider, AdCheckbox, AdToggleButtons, AdSection } from './ui';
import { FileDropZone } from './FileDropZone';
import type { BgmTrack } from '../../types/adrastea.types';
import {
  Play, Pause, Repeat, Trash2, Plus,
  GripVertical, ChevronDown, ChevronRight, Music,
} from 'lucide-react';

const extractVideoId = (url: string): string => {
  const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
  return match ? match[1] : url;
};

const BGM_TYPE_OPTIONS = [
  { value: null as any, label: 'なし' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'url', label: 'URL' },
  { value: 'upload', label: 'アップロード' },
];

// --- SortableRow ---
interface SortableRowProps {
  track: BgmTrack;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onUpdate: (id: string, data: Partial<BgmTrack>) => void;
  onRemove: (id: string) => void;
  roomId: string;
  sceneId: string | undefined;
}

function SortableRow({
  track, isExpanded, onToggleExpand, onUpdate, onRemove, roomId, sceneId,
}: SortableRowProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: track.id });
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: `1px solid ${theme.border}`,
  };

  const iconBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* メイン行 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', fontSize: '12px', color: theme.textPrimary,
      }}>
        {/* ドラッグハンドル */}
        <span {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex' }}>
          <GripVertical size={14} color={theme.textSecondary} />
        </span>

        {/* 展開/折りたたみ */}
        <button style={iconBtn} onClick={() => onToggleExpand(track.id)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* 再生/停止 */}
        <button
          style={{ ...iconBtn, color: track.is_playing ? theme.accent : theme.textSecondary }}
          onClick={() => onUpdate(track.id, { is_playing: !track.is_playing })}
        >
          {track.is_playing ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* トラック名 */}
        {editingName ? (
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => {
              onUpdate(track.id, { name: nameValue });
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdate(track.id, { name: nameValue });
                setEditingName(false);
              }
            }}
            autoFocus
            style={{
              flex: 1, background: theme.surfaceHover, border: `1px solid ${theme.border}`,
              color: theme.textPrimary, fontSize: '12px', padding: '2px 4px',
              borderRadius: '2px', outline: 'none',
            }}
          />
        ) : (
          <span
            style={{ flex: 1, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onDoubleClick={() => { setNameValue(track.name); setEditingName(true); }}
          >
            <Music size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {track.name}
          </span>
        )}

        {/* ボリュームスライダー */}
        <input
          type="range"
          min="0" max="1" step="0.05"
          value={track.bgm_volume}
          onChange={(e) => onUpdate(track.id, { bgm_volume: Number(e.target.value) })}
          style={{ width: '80px' }}
        />

        {/* ループ */}
        <button
          style={{ ...iconBtn, color: track.bgm_loop ? theme.accent : theme.textSecondary }}
          onClick={() => onUpdate(track.id, { bgm_loop: !track.bgm_loop })}
        >
          <Repeat size={14} />
        </button>

        {/* 削除 */}
        <button style={{ ...iconBtn, color: theme.error }} onClick={() => onRemove(track.id)}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* 展開エリア */}
      {isExpanded && (
        <div style={{
          padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px',
          background: theme.surfaceHover,
        }}>
          <AdSection label="BGMソース">
            <AdToggleButtons
              value={track.bgm_type}
              options={BGM_TYPE_OPTIONS}
              onChange={(val) => onUpdate(track.id, { bgm_type: val, bgm_source: null })}
            />
            {track.bgm_type === 'youtube' && (
              <AdInput
                label="YouTube URL"
                value={track.bgm_source ?? ''}
                onChange={(val) => onUpdate(track.id, { bgm_source: extractVideoId(val) })}
              />
            )}
            {track.bgm_type === 'url' && (
              <AdInput
                label="音声URL"
                value={track.bgm_source ?? ''}
                onChange={(val) => onUpdate(track.id, { bgm_source: val })}
              />
            )}
            {track.bgm_type === 'upload' && (
              <FileDropZone
                storagePath={`rooms/${roomId}/scenes/${sceneId}/bgms/${track.id}/audio`}
                currentUrl={track.bgm_source ?? undefined}
                onUploaded={(url) => onUpdate(track.id, { bgm_source: url })}
                accept="audio/*"
              />
            )}
          </AdSection>

          <AdSection label="フェード設定">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <AdCheckbox
                label="フェードイン"
                checked={track.fade_in}
                onChange={(val) => onUpdate(track.id, { fade_in: val })}
              />
              <AdCheckbox
                label="フェードアウト"
                checked={track.fade_out}
                onChange={(val) => onUpdate(track.id, { fade_out: val })}
              />
            </div>
            <AdSlider
              label="フェード時間"
              value={track.fade_duration}
              min={100} max={3000} step={100}
              onChange={(val) => onUpdate(track.id, { fade_duration: val })}
              suffix="ms"
            />
          </AdSection>
        </div>
      )}
    </div>
  );
}

// --- BgmPanel ---
export function BgmPanel() {
  const { bgms, addBgm, updateBgm, removeBgm, reorderBgms, roomId, activeScene } = useAdrasteaContext();
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedTrackId(prev => prev === id ? null : id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bgms.findIndex(b => b.id === active.id);
    const newIndex = bgms.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(bgms, oldIndex, newIndex);
    reorderBgms(reordered.map(b => b.id));
  }, [bgms, reorderBgms]);

  const handleAdd = useCallback(() => {
    addBgm({});
  }, [addBgm]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: theme.surface, color: theme.textPrimary,
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: `1px solid ${theme.border}`,
        fontSize: '13px', fontWeight: 600,
      }}>
        <span><Music size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />BGM</span>
        <button
          onClick={handleAdd}
          style={{
            background: 'transparent', border: 'none',
            color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* リスト */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bgms.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {bgms.map(track => (
              <SortableRow
                key={track.id}
                track={track}
                isExpanded={expandedTrackId === track.id}
                onToggleExpand={handleToggleExpand}
                onUpdate={updateBgm}
                onRemove={removeBgm}
                roomId={roomId}
                sceneId={activeScene?.id}
              />
            ))}
          </SortableContext>
        </DndContext>
        {bgms.length === 0 && (
          <div style={{
            padding: '24px', textAlign: 'center',
            color: theme.textSecondary, fontSize: '12px',
          }}>
            BGMトラックがありません。＋ボタンで追加してください。
          </div>
        )}
      </div>
    </div>
  );
}
